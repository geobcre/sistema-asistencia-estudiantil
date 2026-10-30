import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const VACIO = { carne: '', nombre: '', apellido: '', estado: 'Activo' }

export default function Estudiantes({ store }) {
  const { estudiantes, setEstudiantes } = store
  const [form, setForm] = useState(VACIO)
  const [editId, setEditId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Activo')

  useEffect(() => { cargar() }, [])

  // Lista filtrada: primero por estado (Activo / Inactivo / Todos) y luego por texto en carné o nombre.
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return estudiantes.filter((e) =>
      (filtroEstado === 'Todos' || e.estado === filtroEstado)
      && `${e.carne} ${e.nombre} ${e.apellido}`.toLowerCase().includes(texto))
  }, [estudiantes, busqueda, filtroEstado])
  async function cargar() {
    try { setEstudiantes(await api.getEstudiantes()) }
    catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }
  function reset() { setForm(VACIO); setEditId(null) }
  function cambiar(e) { setForm({ ...form, [e.target.name]: e.target.value }) }

  async function guardar(e) {
    e.preventDefault(); setError(''); setMensaje('')
    if (!form.carne.trim() || !form.nombre.trim() || !form.apellido.trim()) {
      return setError('Carné, nombre y apellido son obligatorios.')
    }
    const datos = { ...form, carne: form.carne.trim(), nombre: form.nombre.trim(), apellido: form.apellido.trim() }
    try {
      setGuardando(true)
      if (editId) {
        const actualizado = await api.editarEstudiante(editId, datos)
        setEstudiantes((lista) => lista.map((e) => e.id_estudiante === editId ? actualizado : e))
        setMensaje('Estudiante actualizado correctamente.')
      } else {
        const nuevo = await api.crearEstudiante(datos)
        setEstudiantes((lista) => [...lista, nuevo])
        setMensaje('Estudiante registrado correctamente.')
      }
      reset()
    } catch (eGuardar) { setError(eGuardar.message) }
    finally { setGuardando(false) }
  }

  function editar(estudiante) {
    setEditId(estudiante.id_estudiante)
    setForm({ carne: estudiante.carne, nombre: estudiante.nombre, apellido: estudiante.apellido, estado: estudiante.estado })
  }
  async function inactivar(estudiante) {
    if (!window.confirm(`¿Desea inactivar a ${estudiante.nombre} ${estudiante.apellido}?`)) return
    try {
      const actualizado = await api.eliminarEstudiante(estudiante.id_estudiante)
      setEstudiantes((lista) => lista.map((e) => e.id_estudiante === estudiante.id_estudiante ? actualizado : e))
      setMensaje('Estudiante inactivado correctamente.')
    } catch (e) { setError(e.message) }
  }

  // Reactivar reutiliza el PUT de edición, mandando los mismos datos con estado 'Activo'.
  async function reactivar(estudiante) {
    setError(''); setMensaje('')
    try {
      const actualizado = await api.editarEstudiante(estudiante.id_estudiante, {
        carne: estudiante.carne, nombre: estudiante.nombre, apellido: estudiante.apellido, estado: 'Activo'
      })
      setEstudiantes((lista) => lista.map((e) => e.id_estudiante === estudiante.id_estudiante ? actualizado : e))
      setMensaje('Estudiante reactivado correctamente.')
    } catch (e) { setError(e.message) }
  }

  return (
    <section>
      <header className="section-header"><p className="eyebrow">Módulo 02</p><h1>Estudiantes</h1>
        <p className="section-sub">Registro y administración del alumnado.</p></header>
      {error && <div className="module-message module-message-error">{error}</div>}
      {mensaje && <div className="module-message module-message-success">{mensaje}</div>}
      <div className="panel-grid">
        <form className="card form-card" onSubmit={guardar}>
          <h2>{editId ? 'Editar estudiante' : 'Nuevo estudiante'}</h2>
          <label>Carné<input name="carne" value={form.carne} onChange={cambiar} required /></label>
          <label>Nombre<input name="nombre" value={form.nombre} onChange={cambiar} required /></label>
          <label>Apellido<input name="apellido" value={form.apellido} onChange={cambiar} required /></label>
          <label>Estado<select name="estado" value={form.estado} onChange={cambiar}><option>Activo</option><option>Inactivo</option></select></label>
          <div className="form-actions"><button className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancelar</button>}</div>
        </form>
        <div className="card table-card">
          <div className="roster-controls table-toolbar">
            <label className="roster-search">Buscar<input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Carné o nombre" /></label>
            <label>Estado<select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="Activo">Activos</option><option value="Inactivo">Inactivos</option><option value="Todos">Todos</option>
            </select></label>
            <p className="roster-match-count">{visibles.length} de {estudiantes.length}</p>
          </div>
          {cargando ? <p className="empty-row">Cargando estudiantes...</p> : <table>
            <thead><tr><th>Carné</th><th>Nombre</th><th>Estado</th><th></th></tr></thead>
            <tbody>{visibles.map((estudiante) => <tr key={estudiante.id_estudiante}>
              <td>{estudiante.carne}</td><td>{estudiante.nombre} {estudiante.apellido}</td>
              <td><span className={`pill ${estudiante.estado === 'Activo' ? 'pill-ok' : 'pill-inactivo'}`}>{estudiante.estado}</span></td>
              <td className="row-actions"><button className="link-btn" onClick={() => editar(estudiante)}>Editar</button>
                {estudiante.estado === 'Activo'
                  ? <button className="link-btn link-danger" onClick={() => inactivar(estudiante)}>Inactivar</button>
                  : <button className="link-btn" onClick={() => reactivar(estudiante)}>Reactivar</button>}</td>
            </tr>)}
            {!visibles.length && <tr><td colSpan="4" className="empty-row">No hay estudiantes que coincidan.</td></tr>}</tbody>
          </table>}
        </div>
      </div>
    </section>
  )
}
