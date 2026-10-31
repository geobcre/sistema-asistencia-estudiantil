import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const VACIO = { nombre: '', apellido: '', correo: '', estado: 'Activo' }

export default function Docentes({ store }) {
  const { docentes, setDocentes } = store
  const [form, setForm] = useState(VACIO)
  const [editId, setEditId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Activo')

  useEffect(() => { cargar() }, [])

  // Lista filtrada: primero por estado (Activo / Inactivo / Todos) y luego por texto en nombre o correo.
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return docentes.filter((d) =>
      (filtroEstado === 'Todos' || d.estado === filtroEstado)
      && `${d.nombre} ${d.apellido} ${d.correo || ''}`.toLowerCase().includes(texto))
  }, [docentes, busqueda, filtroEstado])

  async function cargar() {
    try { setDocentes(await api.getDocentes()) }
    catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  function reset() { setForm(VACIO); setEditId(null) }
  function cambiar(e) { setForm({ ...form, [e.target.name]: e.target.value }) }

  async function guardar(e) {
    e.preventDefault(); setError(''); setMensaje('')
    if (!form.nombre.trim() || !form.apellido.trim()) return setError('Nombre y apellido son obligatorios.')
    const datos = { ...form, nombre: form.nombre.trim(), apellido: form.apellido.trim(), correo: form.correo.trim() }
    try {
      setGuardando(true)
      if (editId) {
        const actualizado = await api.editarDocente(editId, datos)
        setDocentes((lista) => lista.map((d) => d.id_docente === editId ? actualizado : d))
        setMensaje('Docente actualizado correctamente.')
      } else {
        const nuevo = await api.crearDocente(datos)
        setDocentes((lista) => [...lista, nuevo])
        setMensaje('Docente registrado correctamente.')
      }
      reset()
    } catch (eGuardar) { setError(eGuardar.message) }
    finally { setGuardando(false) }
  }

  function editar(docente) {
    setEditId(docente.id_docente)
    setForm({ nombre: docente.nombre, apellido: docente.apellido, correo: docente.correo || '', estado: docente.estado })
  }

  async function inactivar(docente) {
    if (!window.confirm(`¿Desea inactivar a ${docente.nombre} ${docente.apellido}?`)) return
    try {
      const actualizado = await api.eliminarDocente(docente.id_docente)
      setDocentes((lista) => lista.map((d) => d.id_docente === docente.id_docente ? actualizado : d))
      setMensaje('Docente inactivado correctamente.')
    } catch (e) { setError(e.message) }
  }

  // Reactivar reutiliza el PUT de edición, mandando los mismos datos con estado 'Activo'.
  async function reactivar(docente) {
    setError(''); setMensaje('')
    try {
      const actualizado = await api.editarDocente(docente.id_docente, {
        nombre: docente.nombre, apellido: docente.apellido, correo: docente.correo || '', estado: 'Activo'
      })
      setDocentes((lista) => lista.map((d) => d.id_docente === docente.id_docente ? actualizado : d))
      setMensaje('Docente reactivado correctamente.')
    } catch (e) { setError(e.message) }
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 01</p><h1>Docentes</h1>
        <p className="section-sub">Registro y administración del personal docente.</p>
      </header>
      {error && <div className="module-message module-message-error">{error}</div>}
      {mensaje && <div className="module-message module-message-success">{mensaje}</div>}
      <div className="panel-grid">
        <form className="card form-card" onSubmit={guardar}>
          <h2>{editId ? 'Editar docente' : 'Nuevo docente'}</h2>
          <label>Nombre<input name="nombre" value={form.nombre} onChange={cambiar} required /></label>
          <label>Apellido<input name="apellido" value={form.apellido} onChange={cambiar} required /></label>
          <label>Correo<input name="correo" type="email" value={form.correo} onChange={cambiar} /></label>
          <label>Estado<select name="estado" value={form.estado} onChange={cambiar}>
            <option>Activo</option><option>Inactivo</option>
          </select></label>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancelar</button>}
          </div>
        </form>
        <div className="card table-card">
          <div className="roster-controls table-toolbar">
            <label className="roster-search">Buscar<input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o correo" /></label>
            <label>Estado<select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="Activo">Activos</option><option value="Inactivo">Inactivos</option><option value="Todos">Todos</option>
            </select></label>
            <p className="roster-match-count">{visibles.length} de {docentes.length}</p>
          </div>
          {cargando ? <p className="empty-row">Cargando docentes...</p> : <table>
            <thead><tr><th>Nombre</th><th>Correo</th><th>Estado</th><th></th></tr></thead>
            <tbody>{visibles.map((docente) => <tr key={docente.id_docente}>
              <td>{docente.nombre} {docente.apellido}</td><td>{docente.correo || '—'}</td>
              <td><span className={`pill ${docente.estado === 'Activo' ? 'pill-ok' : 'pill-inactivo'}`}>{docente.estado}</span></td>
              <td className="row-actions"><button className="link-btn" onClick={() => editar(docente)}>Editar</button>
                {docente.estado === 'Activo'
                  ? <button className="link-btn link-danger" onClick={() => inactivar(docente)}>Inactivar</button>
                  : <button className="link-btn" onClick={() => reactivar(docente)}>Reactivar</button>}</td>
            </tr>)}
            {!visibles.length && <tr><td colSpan="4" className="empty-row">No hay docentes que coincidan.</td></tr>}</tbody>
          </table>}
        </div>
      </div>
    </section>
  )
}
