import { useEffect, useState } from 'react'
import { api } from '../api.js'

const ESTADOS = [
  { value: 'presente', label: 'Presente', short: 'P' },
  { value: 'ausente', label: 'Ausente', short: 'A' },
  { value: 'tarde', label: 'Tarde', short: 'T' },
  { value: 'justificado', label: 'Justificado', short: 'J' },
]

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Asistencia({ store }) {
  const { cursos } = store
  const [idCurso, setIdCurso] = useState(cursos[0]?.id ?? '')
  const [fecha, setFecha] = useState(hoyISO())
  const [inscritos, setInscritos] = useState([])
  const [sesionActual, setSesionActual] = useState(null)
  const [registros, setRegistros] = useState({}) // idEstudiante -> estado
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!idCurso) return
    let cancelado = false
    setCargando(true)
    setError(null)
    api.getEstudiantesDeCurso(idCurso)
      .then((lista) => { if (!cancelado) setInscritos(lista) })
      .catch((err) => { if (!cancelado) setError(err.message) })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [idCurso])

  useEffect(() => {
    if (!idCurso || !fecha) return
    let cancelado = false
    setSesionActual(null)
    setRegistros({})
    api.getSesionesDeCurso(idCurso)
      .then((sesiones) => sesiones.find((s) => s.fecha === fecha) ?? null)
      .then(async (sesion) => {
        if (cancelado) return
        if (!sesion) return // aun no existe; se creara al marcar el primer estado
        setSesionActual(sesion)
        const lista = await api.getAsistenciaDeSesion(sesion.id)
        if (cancelado) return
        const mapa = {}
        lista.forEach((r) => { mapa[r.id_estudiante] = r.estado })
        setRegistros(mapa)
      })
      .catch((err) => { if (!cancelado) setError(err.message) })
    return () => { cancelado = true }
  }, [idCurso, fecha])

  async function asegurarSesion() {
    if (sesionActual) return sesionActual
    const nueva = await api.crearOEncontrarSesion(idCurso, fecha)
    setSesionActual(nueva)
    return nueva
  }

  async function marcar(idEstudiante, estado) {
    try {
      const sesion = await asegurarSesion()
      await api.marcarAsistencia(sesion.id, idEstudiante, estado)
      setRegistros((prev) => ({ ...prev, [idEstudiante]: estado }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function marcarTodosPresentes() {
    for (const s of inscritos) {
      await marcar(s.id, 'presente')
    }
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 04</p>
        <h1>Tomar asistencia</h1>
        <p className="section-sub">
          Reemplaza la lista impresa: selecciona curso y fecha, y marca el estado de cada estudiante.
          Los cambios se guardan de inmediato en la base de datos.
        </p>
      </header>

      {error && <p className="muted" style={{ color: 'var(--clay)' }}>{error}</p>}

      <div className="card roster-controls">
        <label>
          Curso
          <select value={idCurso} onChange={(e) => setIdCurso(Number(e.target.value))}>
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
        {cargando && <p className="empty-row">Cargando estudiantes…</p>}
        {!cargando && inscritos.map((s) => {
          const estadoActual = registros[s.id]
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
        {!cargando && inscritos.length === 0 && (
          <p className="empty-row">Este curso todavía no tiene estudiantes inscritos.</p>
        )}
      </div>
    </section>
  )
}
