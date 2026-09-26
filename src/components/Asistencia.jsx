import { useMemo, useState } from 'react'
import { ESTADOS, nombreGrupo } from '../data/mockData.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function normalizarTexto(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function Asistencia({ store }) {
  const { cursos, grupos, docentes, estudiantes, inscripciones, sesiones, setSesiones, asistencias, setAsistencias } = store
  const [idCurso, setIdCurso] = useState(cursos[0]?.id ?? '')
  const [idGrupo, setIdGrupo] = useState(grupos[0]?.id ?? '')
  const [fecha, setFecha] = useState(hoyISO())
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const cursoActual = cursos.find((curso) => curso.id === Number(idCurso))
  const grupoActual = grupos.find((grupo) => grupo.id === Number(idGrupo))
  const docenteActual = docentes.find((docente) => docente.id === cursoActual?.idDocente)

  const inscritos = useMemo(() => {
    if (!idCurso) return []
    const ids = inscripciones.filter((i) => i.idCurso === Number(idCurso)).map((i) => i.idEstudiante)
    return estudiantes.filter((s) => ids.includes(s.id) && s.idGrupo === Number(idGrupo))
  }, [idCurso, idGrupo, inscripciones, estudiantes])

  const sesionActual = useMemo(
    () => sesiones.find(
      (s) => s.idCurso === Number(idCurso) && s.idGrupo === Number(idGrupo) && s.fecha === fecha
    ),
    [sesiones, idCurso, idGrupo, fecha]
  )

  function asegurarSesion() {
    if (sesionActual) return sesionActual
    const nuevoId = Math.max(0, ...sesiones.map((s) => s.id)) + 1
    const nueva = { id: nuevoId, idCurso: Number(idCurso), idGrupo: Number(idGrupo), fecha }
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

  const estudiantesVisibles = useMemo(() => {
    const consulta = normalizarTexto(busqueda.trim())

    return inscritos.filter((estudiante) => {
      const nombre = normalizarTexto(`${estudiante.nombre} ${estudiante.apellido}`)
      const estado = estadoDe(estudiante.id)
      const coincideBusqueda = nombre.includes(consulta)
      const coincideEstado = filtroEstado === 'todos'
        || (filtroEstado === 'pendientes' && !estado)
        || (filtroEstado === 'marcados' && ESTADOS.some((opcion) => opcion.value === estado))

      return coincideBusqueda && coincideEstado
    })
  }, [inscritos, busqueda, filtroEstado, sesionActual, asistencias])

  const resumen = useMemo(() => {
    const conteos = Object.fromEntries(ESTADOS.map(({ value }) => [value, 0]))
    let pendientes = 0

    inscritos.forEach((estudiante) => {
      const estado = estadoDe(estudiante.id)
      if (estado && conteos[estado] !== undefined) conteos[estado] += 1
      else pendientes += 1
    })

    return { conteos, pendientes, marcados: inscritos.length - pendientes }
  }, [inscritos, sesionActual, asistencias])

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
    if (inscritos.length === 0) return
    const sesion = asegurarSesion()

    setAsistencias((asistenciasActuales) => {
      const pendientes = new Set(inscritos.map((estudiante) => estudiante.id))
      let nuevoId = Math.max(0, ...asistenciasActuales.map((a) => a.id)) + 1
      const actualizadas = asistenciasActuales.map((asistencia) => {
        if (asistencia.idSesion !== sesion.id || !pendientes.has(asistencia.idEstudiante)) {
          return asistencia
        }
        pendientes.delete(asistencia.idEstudiante)
        return { ...asistencia, estado: 'presente' }
      })

      pendientes.forEach((idEstudiante) => {
        actualizadas.push({ id: nuevoId++, idSesion: sesion.id, idEstudiante, estado: 'presente' })
      })

      return actualizadas
    })
  }

  return (
    <section>
      <div className="print-only attendance-print-header">
        <p className="eyebrow">Control de Asistencia Estudiantil</p>
        <h1>Lista de asistencia</h1>
        <p><strong>Grado y sección:</strong> {nombreGrupo(grupoActual)}</p>
        <p><strong>Asignatura:</strong> {cursoActual?.nombre ?? 'Sin asignatura seleccionada'}</p>
        <p><strong>Docente:</strong> {docenteActual ? `${docenteActual.nombre} ${docenteActual.apellido}` : 'Sin asignar'}</p>
        <p><strong>Fecha de sesión:</strong> {fecha}</p>
      </div>

      <header className="section-header">
        <p className="eyebrow">Módulo 04</p>
        <h1>Tomar asistencia</h1>
        <p className="section-sub">
          Selecciona grado, sección, asignatura y fecha para tomar asistencia al grupo correspondiente.
        </p>
      </header>

      <div className="card roster-controls">
        <label>
          Grado y sección
          <select value={idGrupo} onChange={(e) => setIdGrupo(e.target.value)}>
            {grupos.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>{nombreGrupo(grupo)}</option>
            ))}
          </select>
        </label>
        <label>
          Asignatura
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
        <label className="roster-search">
          Buscar estudiante
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o apellido"
          />
        </label>
        <label>
          Estado
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="pendientes">Pendientes</option>
            <option value="marcados">Marcados</option>
          </select>
        </label>
        <p className="roster-match-count" aria-live="polite">
          {estudiantesVisibles.length} de {inscritos.length} estudiantes
        </p>
        <button className="btn btn-secondary" onClick={marcarTodosPresentes} disabled={inscritos.length === 0}>
          Marcar todos presentes
        </button>
        <button className="btn btn-secondary print-hide" onClick={() => window.print()} disabled={inscritos.length === 0}>
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="card roster-summary" aria-label="Resumen de asistencia">
        <div className="roster-summary-heading">
          <h2>Resumen de la sesión</h2>
          <span>{resumen.marcados} de {inscritos.length} marcados</span>
        </div>
        <div className="roster-summary-grid">
          {ESTADOS.map((estado) => (
            <div key={estado.value} className={`roster-summary-item summary-${estado.value}`}>
              <span>{estado.label}</span>
              <strong>{resumen.conteos[estado.value]}</strong>
            </div>
          ))}
          <div className="roster-summary-item summary-pendiente">
            <span>Pendientes</span>
            <strong>{resumen.pendientes}</strong>
          </div>
        </div>
      </div>

      <div className="roster-print-list print-only" aria-label="Lista de asistencia para imprimir">
        <div className="roster-print-heading">
          <span>Estudiante</span>
          <span>Estado</span>
        </div>
        {inscritos.map((estudiante) => {
          const estado = ESTADOS.find((opcion) => opcion.value === estadoDe(estudiante.id))
          return (
            <div key={estudiante.id} className="roster-print-row">
              <span>{estudiante.nombre} {estudiante.apellido}</span>
              <span>{estado?.label ?? 'Sin marcar'}</span>
            </div>
          )
        })}
        {inscritos.length === 0 && <p className="empty-row">Esta asignatura no tiene estudiantes en el grupo seleccionado.</p>}
      </div>

      <div className="attendance-print-signatures print-only">
        <div>Firma del docente</div>
        <div>Firma de coordinación</div>
      </div>

      <div className="card roster-sheet">
        <div className="roster-sheet-head">
          <span>Estudiante</span>
          <span>Estado</span>
        </div>
        {estudiantesVisibles.map((s) => {
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
          <p className="empty-row">Esta asignatura no tiene estudiantes en el grupo seleccionado.</p>
        )}
        {inscritos.length > 0 && estudiantesVisibles.length === 0 && (
          <p className="empty-row">No hay coincidencias. Prueba con otro nombre o estado.</p>
        )}
      </div>
    </section>
  )
}
