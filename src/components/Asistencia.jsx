import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const ESTADOS = [
  { value: 'presente', label: 'Presente', short: 'P' },
  { value: 'ausente', label: 'Ausente', short: 'A' },
  { value: 'tarde', label: 'Tarde', short: 'T' },
  { value: 'justificado', label: 'Justificado', short: 'J' },
]

function hoyISO() {
  const fecha = new Date()
  const offset = fecha.getTimezoneOffset()
  const local = new Date(fecha.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function normalizarTexto(texto = '') {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function Asistencia({ store }) {
  const {
    cursos,
    setCursos,
    docentes,
    setDocentes,
    estudiantes,
    setEstudiantes,
  } = store

  const [idCurso, setIdCurso] = useState('')
  const [fecha, setFecha] = useState(hoyISO())

  const [inscritos, setInscritos] = useState([])
  const [sesionActual, setSesionActual] = useState(null)
  const [asistencias, setAsistencias] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const [cargando, setCargando] = useState(true)
  const [cargandoSesion, setCargandoSesion] = useState(false)
  const [guardandoTodos, setGuardandoTodos] = useState(false)
  const [guardandoEstudiante, setGuardandoEstudiante] = useState(null)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  useEffect(() => {
    if (!idCurso || !fecha) {
      setInscritos([])
      setSesionActual(null)
      setAsistencias([])
      return
    }

    cargarSesion()
  }, [idCurso, fecha])

  async function cargarDatosIniciales() {
    try {
      setCargando(true)
      setError('')

      const [datosCursos, datosDocentes, datosEstudiantes] =
        await Promise.all([
          api.getCursos(),
          api.getDocentes(),
          api.getEstudiantes(),
        ])

      setCursos(datosCursos)
      setDocentes(datosDocentes)
      setEstudiantes(datosEstudiantes)

      if (datosCursos.length > 0) {
        setIdCurso(String(datosCursos[0].id))
      }
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setCargando(false)
    }
  }

  async function cargarSesion() {
    try {
      setCargandoSesion(true)
      setError('')
      setMensaje('')

      const cursoId = Number(idCurso)

      const estudiantesInscritos =
        await api.getEstudiantesDeCurso(cursoId)

      setInscritos(estudiantesInscritos)

      const sesion =
        await api.crearOEncontrarSesion(cursoId, fecha)

      setSesionActual(sesion)

      const registros =
        await api.getAsistenciaDeSesion(sesion.id)

      setAsistencias(registros)
    } catch (error) {
      console.error(error)
      setError(error.message)

      setInscritos([])
      setSesionActual(null)
      setAsistencias([])
    } finally {
      setCargandoSesion(false)
    }
  }

  const cursoActual = useMemo(
    () =>
      cursos.find(
        (curso) => curso.id === Number(idCurso)
      ),
    [cursos, idCurso]
  )

  const docenteActual = useMemo(() => {
    if (!cursoActual) return null

    const idDocente =
      cursoActual.id_docente ??
      cursoActual.idDocente

    return docentes.find(
      (docente) =>
        docente.id === Number(idDocente)
    )
  }, [cursoActual, docentes])

  function estadoDe(idEstudiante) {
    const registro = asistencias.find(
      (asistencia) =>
        Number(asistencia.id_estudiante) ===
          Number(idEstudiante) ||
        Number(asistencia.idEstudiante) ===
          Number(idEstudiante)
    )

    return registro?.estado ?? null
  }

  const estudiantesVisibles = useMemo(() => {
    const consulta = normalizarTexto(
      busqueda.trim()
    )

    return inscritos.filter((estudiante) => {
      const nombre = normalizarTexto(
        `${estudiante.nombre} ${estudiante.apellido}`
      )

      const carne = normalizarTexto(
        estudiante.carne || ''
      )

      const estado = estadoDe(estudiante.id)

      const coincideBusqueda =
        nombre.includes(consulta) ||
        carne.includes(consulta)

      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'pendientes' && !estado) ||
        (filtroEstado === 'marcados' && !!estado) ||
        filtroEstado === estado

      return coincideBusqueda && coincideEstado
    })
  }, [
    inscritos,
    busqueda,
    filtroEstado,
    asistencias,
  ])

  const resumen = useMemo(() => {
    const conteos = Object.fromEntries(
      ESTADOS.map(({ value }) => [value, 0])
    )

    let pendientes = 0

    inscritos.forEach((estudiante) => {
      const estado = estadoDe(estudiante.id)

      if (
        estado &&
        conteos[estado] !== undefined
      ) {
        conteos[estado] += 1
      } else {
        pendientes += 1
      }
    })

    return {
      conteos,
      pendientes,
      marcados: inscritos.length - pendientes,
    }
  }, [inscritos, asistencias])

  async function marcar(idEstudiante, estado) {
    if (!sesionActual) {
      setError('No existe una sesión activa.')
      return
    }

    try {
      setGuardandoEstudiante(idEstudiante)
      setError('')
      setMensaje('')

      const registro =
        await api.marcarAsistencia(
          sesionActual.id,
          idEstudiante,
          estado
        )

      setAsistencias((actuales) => {
        const existe = actuales.some(
          (asistencia) =>
            Number(asistencia.id_estudiante) ===
              Number(idEstudiante) ||
            Number(asistencia.idEstudiante) ===
              Number(idEstudiante)
        )

        if (existe) {
          return actuales.map((asistencia) => {
            const mismoEstudiante =
              Number(asistencia.id_estudiante) ===
                Number(idEstudiante) ||
              Number(asistencia.idEstudiante) ===
                Number(idEstudiante)

            return mismoEstudiante
              ? registro
              : asistencia
          })
        }

        return [...actuales, registro]
      })
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setGuardandoEstudiante(null)
    }
  }

  async function marcarTodosPresentes() {
    if (
      !sesionActual ||
      inscritos.length === 0
    ) {
      return
    }

    const confirmado = window.confirm(
      '¿Desea marcar a todos los estudiantes inscritos como presentes?'
    )

    if (!confirmado) return

    try {
      setGuardandoTodos(true)
      setError('')
      setMensaje('')

      await Promise.all(
        inscritos.map((estudiante) =>
          api.marcarAsistencia(
            sesionActual.id,
            estudiante.id,
            'presente'
          )
        )
      )

      const registrosActualizados =
        await api.getAsistenciaDeSesion(
          sesionActual.id
        )

      setAsistencias(registrosActualizados)

      setMensaje(
        'Todos los estudiantes fueron marcados como presentes.'
      )
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setGuardandoTodos(false)
    }
  }

  if (cargando) {
    return (
      <section>
        <header className="section-header">
          <p className="eyebrow">Módulo 04</p>
          <h1>Tomar asistencia</h1>
        </header>

        <div className="card">
          <p className="empty-row">
            Cargando información...
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="print-only attendance-print-header">
        <p className="eyebrow">
          Control de Asistencia Estudiantil
        </p>

        <h1>Lista de asistencia</h1>

        <p>
          <strong>Asignatura:</strong>{' '}
          {cursoActual?.nombre ??
            'Sin asignatura seleccionada'}
        </p>

        <p>
          <strong>Código:</strong>{' '}
          {cursoActual?.codigo || '—'}
        </p>

        <p>
          <strong>Docente:</strong>{' '}
          {docenteActual
            ? `${docenteActual.nombre} ${docenteActual.apellido}`
            : 'Sin asignar'}
        </p>

        <p>
          <strong>Fecha de sesión:</strong>{' '}
          {fecha}
        </p>
      </div>

      <header className="section-header">
        <p className="eyebrow">Módulo 04</p>

        <h1>Tomar asistencia</h1>

        <p className="section-sub">
          Selecciona una asignatura y fecha para
          registrar la asistencia de los estudiantes
          inscritos.
        </p>
      </header>

      {error && (
        <div className="module-message module-message-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="module-message module-message-success">
          {mensaje}
        </div>
      )}

      <div className="card roster-controls">
        <label>
          Asignatura

          <select
            value={idCurso}
            onChange={(e) => {
              setIdCurso(e.target.value)
              setBusqueda('')
              setFiltroEstado('todos')
            }}
          >
            {cursos.length === 0 && (
              <option value="">
                No hay asignaturas
              </option>
            )}

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

        <label>
          Fecha de sesión

          <input
            type="date"
            value={fecha}
            onChange={(e) =>
              setFecha(e.target.value)
            }
          />
        </label>

        <label className="roster-search">
          Buscar estudiante

          <input
            type="search"
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            placeholder="Nombre, apellido o carné"
          />
        </label>

        <label>
          Estado

          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value)
            }
          >
            <option value="todos">
              Todos
            </option>

            <option value="pendientes">
              Pendientes
            </option>

            <option value="marcados">
              Marcados
            </option>

            <option value="presente">
              Presentes
            </option>

            <option value="ausente">
              Ausentes
            </option>

            <option value="tarde">
              Tarde
            </option>

            <option value="justificado">
              Justificados
            </option>
          </select>
        </label>

        <p
          className="roster-match-count"
          aria-live="polite"
        >
          {estudiantesVisibles.length} de{' '}
          {inscritos.length} estudiantes
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={marcarTodosPresentes}
          disabled={
            inscritos.length === 0 ||
            cargandoSesion ||
            guardandoTodos
          }
        >
          {guardandoTodos
            ? 'Guardando...'
            : 'Marcar todos presentes'}
        </button>

        <button
          type="button"
          className="btn btn-secondary print-hide"
          onClick={() => window.print()}
          disabled={inscritos.length === 0}
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div
        className="card roster-summary"
        aria-label="Resumen de asistencia"
      >
        <div className="roster-summary-heading">
          <h2>Resumen de la sesión</h2>

          <span>
            {resumen.marcados} de{' '}
            {inscritos.length} marcados
          </span>
        </div>

        <div className="roster-summary-grid">
          {ESTADOS.map((estado) => (
            <div
              key={estado.value}
              className={`roster-summary-item summary-${estado.value}`}
            >
              <span>{estado.label}</span>

              <strong>
                {resumen.conteos[estado.value]}
              </strong>
            </div>
          ))}

          <div className="roster-summary-item summary-pendiente">
            <span>Pendientes</span>
            <strong>{resumen.pendientes}</strong>
          </div>
        </div>
      </div>

      <div
        className="roster-print-list print-only"
        aria-label="Lista de asistencia para imprimir"
      >
        <div className="roster-print-heading">
          <span>Estudiante</span>
          <span>Estado</span>
        </div>

        {inscritos.map((estudiante) => {
          const estado = ESTADOS.find(
            (opcion) =>
              opcion.value ===
              estadoDe(estudiante.id)
          )

          return (
            <div
              key={estudiante.id}
              className="roster-print-row"
            >
              <span>
                {estudiante.nombre}{' '}
                {estudiante.apellido}
              </span>

              <span>
                {estado?.label ?? 'Sin marcar'}
              </span>
            </div>
          )
        })}

        {inscritos.length === 0 && (
          <p className="empty-row">
            Esta asignatura no tiene estudiantes
            inscritos.
          </p>
        )}
      </div>

      <div className="attendance-print-signatures print-only">
        <div>Firma del docente</div>
        <div>Firma de coordinación</div>
      </div>

      <div className="card roster-sheet">
        {cargandoSesion ? (
          <p className="empty-row">
            Cargando sesión y asistencia...
          </p>
        ) : (
          <>
            <div className="roster-sheet-head">
              <span>Estudiante</span>
              <span>Estado</span>
            </div>

            {estudiantesVisibles.map(
              (estudiante) => {
                const estadoActual =
                  estadoDe(estudiante.id)

                const guardando =
                  guardandoEstudiante ===
                  estudiante.id

                return (
                  <div
                    key={estudiante.id}
                    className="roster-row"
                  >
                    <span className="roster-name">
                      {estudiante.nombre}{' '}
                      {estudiante.apellido}

                      {estudiante.carne && (
                        <small className="muted">
                          {' '}· {estudiante.carne}
                        </small>
                      )}
                    </span>

                    <span className="stamp-group">
                      {ESTADOS.map((estado) => (
                        <button
                          type="button"
                          key={estado.value}
                          className={
                            `stamp stamp-${estado.value} ` +
                            `${estadoActual === estado.value
                              ? 'is-set'
                              : ''}`
                          }
                          title={estado.label}
                          disabled={guardando}
                          onClick={() =>
                            marcar(
                              estudiante.id,
                              estado.value
                            )
                          }
                        >
                          {guardando &&
                          estadoActual !==
                            estado.value
                            ? '...'
                            : estado.short}
                        </button>
                      ))}
                    </span>
                  </div>
                )
              }
            )}

            {inscritos.length === 0 && (
              <p className="empty-row">
                Esta asignatura no tiene estudiantes
                inscritos.
              </p>
            )}

            {inscritos.length > 0 &&
              estudiantesVisibles.length === 0 && (
                <p className="empty-row">
                  No hay coincidencias. Prueba con otro
                  nombre o estado.
                </p>
              )}
          </>
        )}
      </div>
    </section>
  )
}