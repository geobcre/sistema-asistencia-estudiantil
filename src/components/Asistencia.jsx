import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const ESTADOS = ['Presente', 'Ausente', 'Tarde', 'Justificado']
const hoy = () => new Date().toISOString().slice(0, 10)

export default function Asistencia() {
  const [asignaciones, setAsignaciones] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [idAsignacion, setIdAsignacion] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [sesion, setSesion] = useState(null)
  const [registros, setRegistros] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { cargarInicial() }, [])

  async function cargarInicial() {
    try {
      const [datosAsignaciones, datosSesiones] = await Promise.all([
        api.getAsignaciones(), api.getSesiones()
      ])
      setAsignaciones(datosAsignaciones)
      setSesiones(datosSesiones)
      if (datosAsignaciones.length) setIdAsignacion(String(datosAsignaciones[0].id_asignacion))
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  async function abrirSesion() {
    if (!idAsignacion || !fecha) return
    setProcesando(true); setError(''); setMensaje('')
    try {
      let actual = sesiones.find((s) => s.id_asignacion === Number(idAsignacion) && s.fecha === fecha)
      if (!actual) {
        actual = await api.crearSesion(Number(idAsignacion), fecha)
        setSesiones((lista) => [...lista, actual])
      }
      setSesion(actual)
      setRegistros(await api.getAsistenciaDeSesion(actual.id_sesion))
    } catch (e) { setError(e.message); setSesion(null); setRegistros([]) }
    finally { setProcesando(false) }
  }

  async function recargar(id = sesion?.id_sesion) {
    if (id) setRegistros(await api.getAsistenciaDeSesion(id))
  }

  async function marcar(idInscripcion, estado) {
    if (!sesion || sesion.estado !== 'Abierta') return
    try {
      await api.marcarAsistencia(sesion.id_sesion, idInscripcion, estado)
      await recargar(); setMensaje('Asistencia guardada.')
    } catch (e) { setError(e.message) }
  }

  async function marcarTodos() {
    if (!sesion || sesion.estado !== 'Abierta') return
    setProcesando(true)
    try {
      await Promise.all(registros.filter((r) => r.estado === 'Pendiente')
        .map((r) => api.marcarAsistencia(sesion.id_sesion, r.id_inscripcion, 'Presente')))
      await recargar(); setMensaje('Estudiantes pendientes marcados como presentes.')
    } catch (e) { setError(e.message) }
    finally { setProcesando(false) }
  }

  async function cambiarEstadoSesion(accion) {
    try {
      const actualizada = accion === 'cerrar'
        ? await api.actualizarSesion(sesion.id_sesion, { estado: 'Cerrada' })
        : await api.cancelarSesion(sesion.id_sesion)
      setSesion(actualizada)
      setSesiones((lista) => lista.map((s) => s.id_sesion === actualizada.id_sesion ? actualizada : s))
      await recargar(actualizada.id_sesion)
    } catch (e) { setError(e.message) }
  }

  const asignacion = asignaciones.find((a) => a.id_asignacion === Number(idAsignacion))
  const visibles = useMemo(() => registros.filter((r) => {
    const texto = `${r.carne} ${r.nombre} ${r.apellido}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase()) && (filtro === 'Todos' || r.estado === filtro)
  }), [registros, busqueda, filtro])
  const resumen = Object.fromEntries(['Presente', 'Ausente', 'Tarde', 'Justificado', 'Pendiente']
    .map((estado) => [estado, registros.filter((r) => r.estado === estado).length]))

  if (cargando) return <p className="empty-row">Cargando asignaciones...</p>

  return (
    <section>
      <header className="section-header"><p className="eyebrow">Módulo de control</p><h1>Asistencia</h1>
        <p className="section-sub">Seleccione una asignación académica y una fecha para abrir su sesión.</p></header>
      {error && <div className="module-message module-message-error">{error}</div>}
      {mensaje && <div className="module-message module-message-success">{mensaje}</div>}
      <div className="card roster-controls">
        <label>Asignación académica<select value={idAsignacion} onChange={(e) => { setIdAsignacion(e.target.value); setSesion(null); setRegistros([]) }}>
          <option value="">Seleccione</option>{asignaciones.map((a) => <option key={a.id_asignacion} value={a.id_asignacion}>{a.asignatura_codigo} · {a.grado}° {a.seccion} · {a.docente_nombre}</option>)}</select></label>
        <label>Fecha<input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setSesion(null); setRegistros([]) }} /></label>
        <button className="btn btn-primary" onClick={abrirSesion} disabled={!idAsignacion || procesando}>{procesando ? 'Procesando...' : 'Consultar sesión'}</button>
      </div>

      {sesion && <>
        <div className="card roster-summary">
          <div className="roster-summary-heading"><h2>{asignacion?.asignatura_nombre}</h2><span>{fecha} · {sesion.estado}</span></div>
          <div className="roster-summary-grid">{Object.entries(resumen).map(([estado, total]) => <div key={estado} className={`roster-summary-item summary-${estado.toLowerCase()}`}><span>{estado}</span><strong>{total}</strong></div>)}</div>
          {sesion.estado === 'Abierta' && <div className="form-actions"><button className="btn btn-secondary" onClick={marcarTodos} disabled={procesando}>Marcar pendientes presentes</button><button className="btn btn-primary" onClick={() => cambiarEstadoSesion('cerrar')}>Cerrar sesión</button><button className="btn btn-ghost" onClick={() => cambiarEstadoSesion('cancelar')}>Cancelar sesión</button></div>}
        </div>
        <div className="card roster-controls">
          <label className="roster-search">Buscar<input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Carné o nombre" /></label>
          <label>Estado<select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option>Todos</option><option>Pendiente</option>{ESTADOS.map((e) => <option key={e}>{e}</option>)}</select></label>
        </div>
        <div className="card roster-sheet">
          {visibles.map((registro) => <div className="roster-row" key={registro.id_inscripcion}>
            <div><span className="roster-name">{registro.nombre} {registro.apellido}</span><br /><span className="muted">{registro.carne} · {registro.estado}</span></div>
            <div className="stamp-group">{ESTADOS.map((estado) => <button key={estado} title={estado} disabled={sesion.estado !== 'Abierta'}
              className={`stamp stamp-${estado.toLowerCase()} ${registro.estado === estado ? 'is-set' : ''}`}
              onClick={() => marcar(registro.id_inscripcion, estado)}>{estado.charAt(0)}</button>)}</div>
          </div>)}
          {!visibles.length && <p className="empty-row">No hay estudiantes esperados para esta sesión.</p>}
        </div>
      </>}
    </section>
  )
}
