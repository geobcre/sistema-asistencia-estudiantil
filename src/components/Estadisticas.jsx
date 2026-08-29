import { useMemo, useState } from 'react'

const UMBRAL_RIESGO = 75

export default function Estadisticas({ store }) {
  const { cursos, estudiantes, inscripciones, sesiones, asistencias } = store
  const [idCurso, setIdCurso] = useState('todos')

  const filas = useMemo(() => {
    const cursosFiltrados = idCurso === 'todos' ? cursos : cursos.filter((c) => c.id === Number(idCurso))

    return cursosFiltrados.map((curso) => {
      const idsEstudiantes = inscripciones
        .filter((i) => i.idCurso === curso.id)
        .map((i) => i.idEstudiante)
      const sesionesCurso = sesiones.filter((s) => s.idCurso === curso.id)
      const totalSesiones = sesionesCurso.length

      const alumnos = idsEstudiantes.map((idEst) => {
        const est = estudiantes.find((s) => s.id === idEst)
        const registros = asistencias.filter(
          (a) => a.idEstudiante === idEst && sesionesCurso.some((s) => s.id === a.idSesion)
        )
        const presentes = registros.filter((a) => a.estado === 'presente' || a.estado === 'tarde').length
        const porcentaje = totalSesiones > 0 ? Math.round((presentes / totalSesiones) * 100) : 0
        return { estudiante: est, presentes, totalSesiones, porcentaje }
      })

      return { curso, alumnos }
    })
  }, [idCurso, cursos, estudiantes, inscripciones, sesiones, asistencias])

  const enRiesgo = filas
    .flatMap((f) => f.alumnos.map((a) => ({ ...a, curso: f.curso })))
    .filter((a) => a.totalSesiones > 0 && a.porcentaje < UMBRAL_RIESGO)

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 05</p>
        <h1>Estadísticas</h1>
        <p className="section-sub">Porcentaje de asistencia por estudiante y por curso.</p>
      </header>

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
                {a.estudiante?.nombre} {a.estudiante?.apellido} · {a.curso.nombre} · {a.porcentaje}%
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
                <tr key={a.estudiante?.id}>
                  <td>{a.estudiante?.nombre} {a.estudiante?.apellido}</td>
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
