import { useEffect, useState } from 'react'
import { api } from '../api.js'

const UMBRAL_RIESGO = 75

export default function Estadisticas({ store }) {
  const { cursos } = store
  const [idCurso, setIdCurso] = useState('todos')
  const [filas, setFilas] = useState([])
  const [enRiesgo, setEnRiesgo] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    setError(null)

    async function cargar() {
      try {
        const cursosAConsultar = idCurso === 'todos' ? cursos : cursos.filter((c) => c.id === Number(idCurso))
        const resultados = await Promise.all(cursosAConsultar.map((c) => api.getEstadisticasCurso(c.id)))
        if (!cancelado) setFilas(resultados)

        const riesgo = await api.getEstudiantesEnRiesgo()
        if (!cancelado) setEnRiesgo(riesgo)
      } catch (err) {
        if (!cancelado) setError(err.message)
      }
    }
    if (cursos.length > 0) cargar()
    return () => { cancelado = true }
  }, [idCurso, cursos])

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 05</p>
        <h1>Estadísticas</h1>
        <p className="section-sub">Porcentaje de asistencia por estudiante y por curso.</p>
      </header>

      {error && <p className="muted" style={{ color: 'var(--clay)' }}>{error}</p>}

      <div className="card roster-controls">
        <label>
          Curso
          <select value={idCurso} onChange={(e) => setIdCurso(e.target.value)}>
            <option value="todos">Todos los cursos</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
      </div>

      {enRiesgo.length > 0 && (
        <div className="card alert-card">
          <p className="alert-title">Estudiantes en riesgo (menos de {UMBRAL_RIESGO}% de asistencia)</p>
          <ul className="chip-list">
            {enRiesgo.map((a, i) => (
              <li key={i} className="chip chip-warning">
                {a.nombre} {a.apellido} · {a.curso} · {a.porcentaje}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {filas.map(({ curso, alumnos }) => (
        <div className="card table-card" key={curso.id}>
          <h2 className="table-card-title">{curso.nombre}</h2>
          <table>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Sesiones asistidas</th>
                <th>% Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a) => (
                <tr key={a.id}>
                  <td>{a.nombre} {a.apellido}</td>
                  <td className="muted">{a.presentes} / {a.totalSesiones}</td>
                  <td>
                    <span className={`pill ${a.porcentaje < UMBRAL_RIESGO ? 'pill-warning' : 'pill-ok'}`}>
                      {a.porcentaje}%
                    </span>
                  </td>
                </tr>
              ))}
              {alumnos.length === 0 && (
                <tr><td colSpan={3} className="empty-row">Sin estudiantes inscritos en este curso.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}
