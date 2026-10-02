import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const ASIGNATURA_VACIA = { nombre: '', codigo: '', estado: 'Activa' }
const ASIGNACION_VACIA = {
  id_asignatura: '', id_docente: '', id_grupo: '', horario: '',
  fecha_inicio: '', fecha_fin: '', estado: 'Activa'
}
const hoy = () => new Date().toISOString().slice(0, 10)

export default function Cursos() {
  const [asignaturas, setAsignaturas] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [docentes, setDocentes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [matriculas, setMatriculas] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [formAsignatura, setFormAsignatura] = useState(ASIGNATURA_VACIA)
  const [formAsignacion, setFormAsignacion] = useState(ASIGNACION_VACIA)
  const [editAsignatura, setEditAsignatura] = useState(null)
  const [editAsignacion, setEditAsignacion] = useState(null)
  const [abierta, setAbierta] = useState(null)
  const [matriculaElegida, setMatriculaElegida] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setCargando(true); setError('')
      const datos = await Promise.all([
        api.getAsignaturas(), api.getAsignaciones(), api.getDocentes(),
        api.getGrupos(), api.getCiclos(), api.getMatriculas(), api.getInscripciones()
      ])
      setAsignaturas(datos[0]); setAsignaciones(datos[1]); setDocentes(datos[2])
      setGrupos(datos[3]); setCiclos(datos[4]); setMatriculas(datos[5]); setInscripciones(datos[6])
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  const ciclosPorId = useMemo(() => Object.fromEntries(ciclos.map((c) => [c.id_ciclo, c])), [ciclos])
  const inscripcionesActivas = (id) => inscripciones.filter((i) => i.id_asignacion === id && i.estado === 'Activa')
  const matriculasDisponibles = (asignacion) => {
    const ocupadas = new Set(inscripcionesActivas(asignacion.id_asignacion).map((i) => i.id_matricula))
    return matriculas.filter((m) => m.estado === 'Activa' && m.id_grupo === asignacion.id_grupo && !ocupadas.has(m.id_matricula))
  }

  async function guardarAsignatura(e) {
    e.preventDefault(); setError(''); setMensaje('')
    try {
      if (editAsignatura) await api.editarAsignatura(editAsignatura, formAsignatura)
      else await api.crearAsignatura(formAsignatura)
      setFormAsignatura(ASIGNATURA_VACIA); setEditAsignatura(null)
      setMensaje('Asignatura guardada correctamente.'); await cargar()
    } catch (err) { setError(err.message) }
  }

  async function guardarAsignacion(e) {
    e.preventDefault(); setError(''); setMensaje('')
    const datos = {
      ...formAsignacion,
      id_asignatura: Number(formAsignacion.id_asignatura),
      id_docente: Number(formAsignacion.id_docente),
      id_grupo: Number(formAsignacion.id_grupo),
      fecha_fin: formAsignacion.fecha_fin || null,
    }
    try {
      if (editAsignacion) await api.editarAsignacion(editAsignacion, datos)
      else await api.crearAsignacion(datos)
      setFormAsignacion(ASIGNACION_VACIA); setEditAsignacion(null)
      setMensaje('Asignación académica guardada correctamente.'); await cargar()
    } catch (err) { setError(err.message) }
  }

  async function inactivarAsignatura(item) {
    if (!window.confirm(`¿Desea inactivar ${item.nombre}?`)) return
    try { await api.eliminarAsignatura(item.id_asignatura); await cargar() }
    catch (e) { setError(e.message) }
  }
  async function inactivarAsignacion(item) {
    if (!window.confirm('¿Desea inactivar esta asignación académica?')) return
    try { await api.eliminarAsignacion(item.id_asignacion); await cargar() }
    catch (e) { setError(e.message) }
  }
  async function inscribir(asignacion) {
    if (!matriculaElegida) return
    try {
      await api.crearInscripcion({
        id_matricula: Number(matriculaElegida), id_asignacion: asignacion.id_asignacion,
        fecha_inscripcion: hoy()
      })
      setMatriculaElegida(''); await cargar(); setAbierta(asignacion.id_asignacion)
    } catch (e) { setError(e.message) }
  }
  async function retirar(inscripcion) {
    try { await api.retirarInscripcion(inscripcion.id_inscripcion, hoy()); await cargar() }
    catch (e) { setError(e.message) }
  }

  return (
    <section>
      <header className="section-header"><p className="eyebrow">Módulo 03</p><h1>Asignaturas</h1>
        <p className="section-sub">Catálogo académico, asignaciones docentes e inscripciones.</p></header>
      {error && <div className="module-message module-message-error">{error}</div>}
      {mensaje && <div className="module-message module-message-success">{mensaje}</div>}

      <div className="panel-grid">
        <form className="card form-card" onSubmit={guardarAsignatura}>
          <h2>{editAsignatura ? 'Editar asignatura' : 'Nueva asignatura'}</h2>
          <label>Nombre<input value={formAsignatura.nombre} onChange={(e) => setFormAsignatura({ ...formAsignatura, nombre: e.target.value })} required /></label>
          <label>Código<input value={formAsignatura.codigo} onChange={(e) => setFormAsignatura({ ...formAsignatura, codigo: e.target.value })} required /></label>
          <label>Estado<select value={formAsignatura.estado} onChange={(e) => setFormAsignatura({ ...formAsignatura, estado: e.target.value })}><option>Activa</option><option>Inactiva</option></select></label>
          <div className="form-actions"><button className="btn btn-primary">Guardar</button>{editAsignatura && <button type="button" className="btn btn-ghost" onClick={() => { setEditAsignatura(null); setFormAsignatura(ASIGNATURA_VACIA) }}>Cancelar</button>}</div>
        </form>
        <div className="card table-card">
          <h2 className="table-card-title">Catálogo de asignaturas</h2>
          {cargando ? <p className="empty-row">Cargando...</p> : <table><thead><tr><th>Código</th><th>Nombre</th><th>Estado</th><th></th></tr></thead>
            <tbody>{asignaturas.map((a) => <tr key={a.id_asignatura}><td>{a.codigo}</td><td>{a.nombre}</td><td>{a.estado}</td>
              <td className="row-actions"><button className="link-btn" onClick={() => { setEditAsignatura(a.id_asignatura); setFormAsignatura({ nombre: a.nombre, codigo: a.codigo, estado: a.estado }) }}>Editar</button>
                {a.estado === 'Activa' && <button className="link-btn link-danger" onClick={() => inactivarAsignatura(a)}>Inactivar</button>}</td></tr>)}</tbody></table>}
        </div>
      </div>

      <div className="panel-grid">
        <form className="card form-card" onSubmit={guardarAsignacion}>
          <h2>{editAsignacion ? 'Editar asignación' : 'Nueva asignación académica'}</h2>
          <label>Asignatura<select required value={formAsignacion.id_asignatura} onChange={(e) => setFormAsignacion({ ...formAsignacion, id_asignatura: e.target.value })}><option value="">Seleccione</option>{asignaturas.filter((a) => a.estado === 'Activa').map((a) => <option key={a.id_asignatura} value={a.id_asignatura}>{a.codigo} · {a.nombre}</option>)}</select></label>
          <label>Docente<select required value={formAsignacion.id_docente} onChange={(e) => setFormAsignacion({ ...formAsignacion, id_docente: e.target.value })}><option value="">Seleccione</option>{docentes.filter((d) => d.estado === 'Activo').map((d) => <option key={d.id_docente} value={d.id_docente}>{d.nombre} {d.apellido}</option>)}</select></label>
          <label>Grupo<select required value={formAsignacion.id_grupo} onChange={(e) => setFormAsignacion({ ...formAsignacion, id_grupo: e.target.value })}><option value="">Seleccione</option>{grupos.map((g) => <option key={g.id_grupo} value={g.id_grupo}>{g.grado}° {g.seccion} · {ciclosPorId[g.id_ciclo]?.anio}</option>)}</select></label>
          <label>Horario<input value={formAsignacion.horario} onChange={(e) => setFormAsignacion({ ...formAsignacion, horario: e.target.value })} /></label>
          <label>Inicio<input type="date" required value={formAsignacion.fecha_inicio} onChange={(e) => setFormAsignacion({ ...formAsignacion, fecha_inicio: e.target.value })} /></label>
          <label>Fin<input type="date" value={formAsignacion.fecha_fin} onChange={(e) => setFormAsignacion({ ...formAsignacion, fecha_fin: e.target.value })} /></label>
          <label>Estado<select value={formAsignacion.estado} onChange={(e) => setFormAsignacion({ ...formAsignacion, estado: e.target.value })}><option>Activa</option><option>Inactiva</option></select></label>
          <div className="form-actions"><button className="btn btn-primary">Guardar</button>{editAsignacion && <button type="button" className="btn btn-ghost" onClick={() => { setEditAsignacion(null); setFormAsignacion(ASIGNACION_VACIA) }}>Cancelar</button>}</div>
        </form>
        <div className="card table-card">
          <h2 className="table-card-title">Asignaciones académicas</h2>
          <table><thead><tr><th>Asignatura</th><th>Docente</th><th>Grupo</th><th>Estado</th><th></th></tr></thead>
            <tbody>{asignaciones.map((a) => <tr key={a.id_asignacion}><td>{a.asignatura_codigo}<br /><span className="muted">{a.horario || 'Sin horario'}</span></td><td>{a.docente_nombre} {a.docente_apellido}</td><td>{a.grado}° {a.seccion} · {a.ciclo_anio}</td><td>{a.estado}</td>
              <td className="row-actions"><button className="link-btn" onClick={() => setAbierta(abierta === a.id_asignacion ? null : a.id_asignacion)}>Inscripciones</button><button className="link-btn" onClick={() => { setEditAsignacion(a.id_asignacion); setFormAsignacion({ id_asignatura: String(a.id_asignatura), id_docente: String(a.id_docente), id_grupo: String(a.id_grupo), horario: a.horario || '', fecha_inicio: a.fecha_inicio, fecha_fin: a.fecha_fin || '', estado: a.estado }) }}>Editar</button>{a.estado === 'Activa' && <button className="link-btn link-danger" onClick={() => inactivarAsignacion(a)}>Inactivar</button>}</td></tr>).flatMap((fila, indice) => {
                const a = asignaciones[indice]
                if (abierta !== a.id_asignacion) return [fila]
                const activas = inscripcionesActivas(a.id_asignacion)
                return [fila, <tr className="detail-row" key={`detalle-${a.id_asignacion}`}><td colSpan="5"><div className="inline-panel"><p className="detail-label">Estudiantes inscritos</p><ul className="chip-list">{activas.map((i) => <li className="chip" key={i.id_inscripcion}>{i.carne} · {i.estudiante_nombre} {i.estudiante_apellido}<button className="chip-remove" onClick={() => retirar(i)}>×</button></li>)}</ul><div className="inline-form"><select value={matriculaElegida} onChange={(e) => setMatriculaElegida(e.target.value)}><option value="">Seleccione una matrícula del grupo</option>{matriculasDisponibles(a).map((m) => <option key={m.id_matricula} value={m.id_matricula}>{m.carne} · {m.estudiante_nombre} {m.estudiante_apellido}</option>)}</select><button className="btn btn-secondary" onClick={() => inscribir(a)} disabled={!matriculaElegida}>Inscribir</button></div></div></td></tr>]
              })}</tbody></table>
        </div>
      </div>
    </section>
  )
}
