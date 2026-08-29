import { useMemo, useState } from 'react'
import { ESTADOS } from '../data/mockData.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Asistencia({ store }) {
  const { cursos, estudiantes, inscripciones, sesiones, setSesiones, asistencias, setAsistencias } = store
  const [idCurso, setIdCurso] = useState(cursos[0]?.id ?? '')
  const [fecha, setFecha] = useState(hoyISO())

  const inscritos = useMemo(() => {
    if (!idCurso) return []
    const ids = inscripciones.filter((i) => i.idCurso === Number(idCurso)).map((i) => i.idEstudiante)
    return estudiantes.filter((s) => ids.includes(s.id))
  }, [idCurso, inscripciones, estudiantes])

  const sesionActual = useMemo(
    () => sesiones.find((s) => s.idCurso === Number(idCurso) && s.fecha === fecha),
    [sesiones, idCurso, fecha]
  )

  function asegurarSesion() {
    if (sesionActual) return sesionActual
    const nuevoId = Math.max(0, ...sesiones.map((s) => s.id)) + 1
    const nueva = { id: nuevoId, idCurso: Number(idCurso), fecha }
    setSesiones([...sesiones, nueva])
    return nueva
  }

  function estadoDe(idEstudiante) {
    if (!sesionActual) return null
    const registro = asistencias.find(
      (a) => a.idSesion === sesionActual.id && a.idEstudiante === idEstudiante
    )
    return registro?.estado ?? null
  }

  function marcar(idEstudiante, estado) {
    const sesion = asegurarSesion()
    const existente = asistencias.find(
      (a) => a.idSesion === sesion.id && a.idEstudiante === idEstudiante
    )
    if (existente) {
      setAsistencias(
        asistencias.map((a) => (a.id === existente.id ? { ...a, estado } : a))
      )
    } else {
      const nuevoId = Math.max(0, ...asistencias.map((a) => a.id)) + 1
      setAsistencias([...asistencias, { id: nuevoId, idSesion: sesion.id, idEstudiante, estado }])
    }
  }

  function marcarTodosPresentes() {
    inscritos.forEach((s) => marcar(s.id, 'presente'))
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 04</p>
        <h1>Tomar asistencia</h1>
        <p className="section-sub">
          Reemplaza la lista impresa: selecciona curso y fecha, y marca el estado de cada estudiante.
        </p>
      </header>

      <div className="card roster-controls">
        <label>
          Curso
          <select value={idCurso} onChange={(e) => setIdCurso(e.target.value)}>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Fecha de sesión
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <button className="btn btn-secondary" onClick={marcarTodosPresentes} disabled={inscritos.length === 0}>
          Marcar todos presentes
        </button>
      </div>

      <div className="card roster-sheet">
        <div className="roster-sheet-head">
          <span>Estudiante</span>
          <span>Estado</span>
        </div>
        {inscritos.map((s) => {
          const estadoActual = estadoDe(s.id)
          return (
            <div key={s.id} className="roster-row">
              <span className="roster-name">{s.nombre} {s.apellido}</span>
              <span className="stamp-group">
                {ESTADOS.map((e) => (
                  <button
                    key={e.value}
                    className={`stamp stamp-${e.value} ${estadoActual === e.value ? 'is-set' : ''}`}
                    title={e.label}
                    onClick={() => marcar(s.id, e.value)}
                  >
                    {e.short}
                  </button>
                ))}
              </span>
            </div>
          )
        })}
        {inscritos.length === 0 && (
          <p className="empty-row">Este curso todavía no tiene estudiantes inscritos.</p>
        )}
      </div>
    </section>
  )
}
