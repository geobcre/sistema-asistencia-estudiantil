import { Fragment, useEffect, useState } from 'react'
import { api } from '../api.js'

// Por encima de este porcentaje la asistencia se considera buena.
// El umbral de riesgo lo define el servidor (UMBRAL_RIESGO).
const NIVEL_BUENO = 85

function nivel(porcentaje, umbral) {
  if (porcentaje === null || porcentaje === undefined) return 'sin-datos'
  if (porcentaje < umbral) return 'riesgo'
  if (porcentaje < NIVEL_BUENO) return 'atencion'
  return 'bueno'
}

function Medidor({ porcentaje, umbral }) {
  const clase = nivel(porcentaje, umbral)
  return (
    <div className="meter-cell">
      <div className="meter" role="progressbar" aria-label="Porcentaje de asistencia"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje ?? undefined}>
        <div className={`meter-fill meter-${clase}`} style={{ width: `${porcentaje ?? 0}%` }} />
      </div>
      <strong className={`meter-value meter-text-${clase}`}>
        {porcentaje === null || porcentaje === undefined ? '—' : `${porcentaje} %`}
      </strong>
    </div>
  )
}

const grupoTexto = (fila) => `${fila.grado}° ${fila.seccion}`

export default function Estadisticas() {
  const [ciclos, setCiclos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [filtros, setFiltros] = useState({ id_ciclo: '', id_grupo: '' })
  const [version, setVersion] = useState(0)
  const [resumen, setResumen] = useState(null)
  const [riesgo, setRiesgo] = useState([])
  const [abierta, setAbierta] = useState(null)
  const [detalle, setDetalle] = useState({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getCiclos(), api.getGrupos()])
      .then(([datosCiclos, datosGrupos]) => { setCiclos(datosCiclos); setGrupos(datosGrupos) })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    let vigente = true
    async function cargar() {
      try {
        setCargando(true); setError('')
        const [datos, enRiesgo] = await Promise.all([
          api.getEstadisticasResumen(filtros), api.getEstudiantesEnRiesgo(filtros)
        ])
        if (!vigente) return
        setResumen(datos); setRiesgo(enRiesgo); setAbierta(null); setDetalle({})
      } catch (e) {
        if (vigente) setError(e.message)
      } finally {
        if (vigente) setCargando(false)
      }
    }
    cargar()
    return () => { vigente = false }
  }, [filtros, version])

  const gruposVisibles = grupos.filter((g) => !filtros.id_ciclo || g.id_ciclo === Number(filtros.id_ciclo))

  function cambiarCiclo(e) { setFiltros({ id_ciclo: e.target.value, id_grupo: '' }) }
  function cambiarGrupo(e) { setFiltros({ ...filtros, id_grupo: e.target.value }) }

  async function alternar(idAsignacion) {
    if (abierta === idAsignacion) return setAbierta(null)
    setAbierta(idAsignacion)
    if (detalle[idAsignacion]) return
    try {
      const datos = await api.getEstadisticasAsignacion(idAsignacion)
      setDetalle((actual) => ({ ...actual, [idAsignacion]: datos }))
    } catch (e) { setError(e.message) }
  }

  const umbral = resumen?.umbral ?? 75
  const total = resumen?.total
  const asignaciones = resumen?.asignaciones ?? []

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 05</p>
        <h1>Estadísticas</h1>
        <p className="section-sub">Indicadores de asistencia por asignación académica y estudiantes en riesgo.</p>
      </header>
      {error && <div className="module-message module-message-error">{error}</div>}

      <div className="card roster-controls">
        <label>Ciclo escolar
          <select value={filtros.id_ciclo} onChange={cambiarCiclo}>
            <option value="">Todos</option>
            {ciclos.map((c) => <option key={c.id_ciclo} value={c.id_ciclo}>{c.anio}</option>)}
          </select>
        </label>
        <label>Grupo
          <select value={filtros.id_grupo} onChange={cambiarGrupo}>
            <option value="">Todos</option>
            {gruposVisibles.map((g) => <option key={g.id_grupo} value={g.id_grupo}>{g.ciclo_anio} · {grupoTexto(g)}</option>)}
          </select>
        </label>
        <button className="btn btn-secondary" onClick={() => setVersion((v) => v + 1)} disabled={cargando}>
          {cargando ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {cargando && !resumen && <p className="empty-row">Cargando estadísticas...</p>}

      {total && <div className="card roster-summary">
        <div className="roster-summary-heading">
          <h2>Resumen general</h2>
          <span>{total.estudiantes} estudiantes · {total.en_riesgo} en riesgo · {total.sesiones_registradas} registros</span>
        </div>
        <div className="roster-summary-grid">
          <div className="roster-summary-item summary-presente"><span>Presentes</span><strong>{total.presentes}</strong></div>
          <div className="roster-summary-item summary-tarde"><span>Tardes</span><strong>{total.tardes}</strong></div>
          <div className="roster-summary-item summary-ausente"><span>Ausentes</span><strong>{total.ausentes}</strong></div>
          <div className="roster-summary-item summary-justificado"><span>Justificados</span><strong>{total.justificados}</strong></div>
          <div className="roster-summary-item summary-pendiente"><span>Asistencia</span><strong>{total.porcentaje === null ? '—' : `${total.porcentaje} %`}</strong></div>
        </div>
        <p className="muted stats-note">Presente y Tarde cuentan como asistencia. Las ausencias justificadas no bajan el porcentaje.</p>
      </div>}

      {resumen && <div className="card table-card">
        <h2 className="table-card-title">Asistencia por asignación</h2>
        <table>
          <thead><tr>
            <th>Asignatura</th><th>Grupo</th><th>Docente</th><th>Estudiantes</th>
            <th>Asistencia</th><th>En riesgo</th><th></th>
          </tr></thead>
          <tbody>
            {asignaciones.map((a) => <Fragment key={a.id_asignacion}>
              <tr>
                <td>{a.asignatura_nombre}<br /><span className="muted">{a.asignatura_codigo}</span></td>
                <td>{a.ciclo_anio} · {grupoTexto(a)}</td>
                <td>{a.docente_nombre} {a.docente_apellido}</td>
                <td>{a.estudiantes}</td>
                <td><Medidor porcentaje={a.porcentaje} umbral={umbral} /></td>
                <td>{a.en_riesgo > 0 ? <span className="pill pill-ausente">{a.en_riesgo}</span> : <span className="muted">0</span>}</td>
                <td className="row-actions">
                  <button className="link-btn" onClick={() => alternar(a.id_asignacion)}>
                    {abierta === a.id_asignacion ? 'Ocultar' : 'Ver estudiantes'}
                  </button>
                </td>
              </tr>
              {abierta === a.id_asignacion && <tr className="detail-row"><td colSpan={7}>
                {!detalle[a.id_asignacion] ? <p className="muted">Cargando estudiantes...</p> : <table>
                  <thead><tr>
                    <th>Carné</th><th>Estudiante</th><th>Presentes</th><th>Tardes</th>
                    <th>Ausentes</th><th>Justificados</th><th>Asistencia</th>
                  </tr></thead>
                  <tbody>{detalle[a.id_asignacion].alumnos.map((alumno) => <tr key={alumno.id_inscripcion}>
                    <td>{alumno.carne}</td>
                    <td>{alumno.apellido}, {alumno.nombre}
                      {alumno.inscripcion_estado === 'Retirada' && <> <span className="pill pill-justificado">Retirada</span></>}</td>
                    <td>{alumno.presentes}</td><td>{alumno.tardes}</td>
                    <td>{alumno.ausentes}</td><td>{alumno.justificados}</td>
                    <td><Medidor porcentaje={alumno.porcentaje} umbral={umbral} /></td>
                  </tr>)}</tbody>
                </table>}
              </td></tr>}
            </Fragment>)}
            {!asignaciones.length && <tr><td colSpan={7} className="empty-row">No hay datos de asistencia para los filtros seleccionados.</td></tr>}
          </tbody>
        </table>
      </div>}

      {resumen && <div className="card table-card">
        <h2 className="table-card-title">Estudiantes en riesgo (asistencia menor a {umbral} %)</h2>
        <table>
          <thead><tr><th>Estudiante</th><th>Carné</th><th>Asignatura</th><th>Grupo</th><th>Asistencia</th></tr></thead>
          <tbody>
            {riesgo.map((r) => <tr key={r.id_inscripcion}>
              <td>{r.apellido}, {r.nombre}</td>
              <td>{r.carne}</td>
              <td>{r.asignatura_nombre}</td>
              <td>{r.ciclo_anio} · {grupoTexto(r)}</td>
              <td><Medidor porcentaje={r.porcentaje} umbral={umbral} /></td>
            </tr>)}
            {!riesgo.length && <tr><td colSpan={5} className="empty-row">Ningún estudiante está por debajo del umbral.</td></tr>}
          </tbody>
        </table>
      </div>}
    </section>
  )
}
