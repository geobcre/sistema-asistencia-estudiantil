import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const UMBRAL_RIESGO = 75

export default function Estadisticas({ store }) {
  const { cursos, setCursos } = store

  const [idCurso, setIdCurso] = useState('todos')
  const [estadisticas, setEstadisticas] = useState({})
  const [enRiesgo, setEnRiesgo] = useState([])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setCargando(true)
      setError('')

      const [datosCursos, datosRiesgo] =
        await Promise.all([
          api.getCursos(),
          api.getEstudiantesEnRiesgo(),
        ])

      setCursos(datosCursos)
      setEnRiesgo(datosRiesgo)

      const resultados = await Promise.all(
        datosCursos.map((curso) =>
          api.getEstadisticasCurso(curso.id)
        )
      )

      const mapa = {}

      resultados.forEach((resultado) => {
        mapa[resultado.curso.id] = resultado
      })

      setEstadisticas(mapa)
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setCargando(false)
    }
  }

  const cursosVisibles = useMemo(() => {
    if (idCurso === 'todos') {
      return cursos
    }

    return cursos.filter(
      (curso) => curso.id === Number(idCurso)
    )
  }, [cursos, idCurso])

  const riesgoVisible = useMemo(() => {
    if (idCurso === 'todos') {
      return enRiesgo
    }

    return enRiesgo.filter(
      (alumno) =>
        Number(alumno.idCurso) === Number(idCurso)
    )
  }, [enRiesgo, idCurso])

  const resumenGeneral = useMemo(() => {
    const alumnos = cursosVisibles.flatMap(
      (curso) =>
        estadisticas[curso.id]?.alumnos || []
    )

    const conSesiones = alumnos.filter(
      (alumno) => alumno.totalSesiones > 0
    )

    const promedio =
      conSesiones.length > 0
        ? Math.round(
            conSesiones.reduce(
              (suma, alumno) =>
                suma + alumno.porcentaje,
              0
            ) / conSesiones.length
          )
        : 0

    return {
      registros: alumnos.length,
      conSesiones: conSesiones.length,
      promedio,
      riesgo: riesgoVisible.length,
    }
  }, [
    cursosVisibles,
    estadisticas,
    riesgoVisible,
  ])

  if (cargando) {
    return (
      <section>
        <header className="section-header">
          <p className="eyebrow">Módulo 05</p>
          <h1>Estadísticas</h1>
        </header>

        <div className="card">
          <p className="empty-row">
            Calculando estadísticas...
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 05</p>

        <h1>Estadísticas</h1>

        <p className="section-sub">
          Porcentaje de asistencia por estudiante
          y asignatura utilizando los registros
          almacenados en el sistema.
        </p>
      </header>

      {error && (
        <div className="module-message module-message-error">
          {error}
        </div>
      )}

      <div className="card roster-controls">
        <label>
          Asignatura

          <select
            value={idCurso}
            onChange={(e) =>
              setIdCurso(e.target.value)
            }
          >
            <option value="todos">
              Todas las asignaturas
            </option>

            {cursos.map((curso) => (
              <option
                key={curso.id}
                value={curso.id}
              >
                {curso.nombre}
                {curso.codigo
                  ? ` · ${curso.codigo}`
                  : ''}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={cargarDatos}
        >
          Actualizar estadísticas
        </button>
      </div>

      <div className="card roster-summary">
        <div className="roster-summary-heading">
          <h2>Resumen general</h2>

          <span>
            Datos calculados desde las asistencias
            registradas
          </span>
        </div>

        <div className="roster-summary-grid">
          <div className="roster-summary-item">
            <span>Estudiantes inscritos</span>
            <strong>
              {resumenGeneral.registros}
            </strong>
          </div>

          <div className="roster-summary-item">
            <span>Con sesiones registradas</span>
            <strong>
              {resumenGeneral.conSesiones}
            </strong>
          </div>

          <div className="roster-summary-item">
            <span>Promedio de asistencia</span>
            <strong>
              {resumenGeneral.promedio}%
            </strong>
          </div>

          <div className="roster-summary-item summary-pendiente">
            <span>En riesgo</span>
            <strong>
              {resumenGeneral.riesgo}
            </strong>
          </div>
        </div>
      </div>

      {riesgoVisible.length > 0 && (
        <div className="card alert-card">
          <p className="alert-title">
            Estudiantes en riesgo — menos de{' '}
            {UMBRAL_RIESGO}% de asistencia
          </p>

          <ul className="chip-list">
            {riesgoVisible.map((alumno) => (
              <li
                key={`${alumno.idCurso}-${alumno.id}`}
                className="chip chip-warning"
              >
                {alumno.nombre}{' '}
                {alumno.apellido}
                {' · '}
                {alumno.curso}
                {' · '}
                {alumno.presentes}/
                {alumno.totalSesiones}
                {' · '}
                {alumno.porcentaje}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {riesgoVisible.length === 0 && (
        <div className="card">
          <p className="empty-row">
            No hay estudiantes bajo el umbral de{' '}
            {UMBRAL_RIESGO}% para la selección actual.
          </p>
        </div>
      )}

      {cursosVisibles.map((curso) => {
        const datos = estadisticas[curso.id]

        const alumnos = datos?.alumnos || []

        return (
          <div
            className="card table-card"
            key={curso.id}
          >
            <h2 className="table-card-title">
              {curso.nombre}

              {curso.codigo && (
                <span className="muted">
                  {' '}· {curso.codigo}
                </span>
              )}
            </h2>

            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Asistidas</th>
                  <th>Total sesiones</th>
                  <th>% Asistencia</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {alumnos.map((alumno) => {
                  const tieneSesiones =
                    alumno.totalSesiones > 0

                  const estaEnRiesgo =
                    tieneSesiones &&
                    alumno.porcentaje <
                      UMBRAL_RIESGO

                  return (
                    <tr key={alumno.id}>
                      <td>
                        {alumno.nombre}{' '}
                        {alumno.apellido}
                      </td>

                      <td className="muted">
                        {alumno.presentes}
                      </td>

                      <td className="muted">
                        {alumno.totalSesiones}
                      </td>

                      <td>
                        <span
                          className={
                            `pill ${
                              estaEnRiesgo
                                ? 'pill-warning'
                                : 'pill-ok'
                            }`
                          }
                        >
                          {tieneSesiones
                            ? `${alumno.porcentaje}%`
                            : 'Sin datos'}
                        </span>
                      </td>

                      <td>
                        {!tieneSesiones ? (
                          <span className="muted">
                            Sin sesiones
                          </span>
                        ) : estaEnRiesgo ? (
                          <span className="pill pill-warning">
                            En riesgo
                          </span>
                        ) : (
                          <span className="pill pill-ok">
                            Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {alumnos.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="empty-row"
                    >
                      No hay estudiantes inscritos
                      en esta asignatura.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      })}

      {cursosVisibles.length === 0 && (
        <div className="card">
          <p className="empty-row">
            No hay asignaturas registradas.
          </p>
        </div>
      )}
    </section>
  )
}