import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

const ESTADOS = [
  { value: 'presente', label: 'Presente' },
  { value: 'ausente', label: 'Ausente' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'justificado', label: 'Justificado' },
]

export default function Reportes({ store }) {
  const { cursos, setCursos, estudiantes, setEstudiantes } = store

  const [idCurso, setIdCurso] = useState('todos')
  const [idEstudiante, setIdEstudiante] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  useEffect(() => {
    if (!cargando) {
      cargarReporte()
    }
  }, [idCurso, idEstudiante, desde, hasta])

  async function cargarDatosIniciales() {
    try {
      setCargando(true)
      setError('')

      const [datosCursos, datosEstudiantes] =
        await Promise.all([
          api.getCursos(),
          api.getEstudiantes(),
        ])

      setCursos(datosCursos)
      setEstudiantes(datosEstudiantes)

      const datosReporte = await api.getReportes({})

      setRegistros(datosReporte)
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setCargando(false)
    }
  }

  async function cargarReporte() {
    try {
      setCargando(true)
      setError('')

      const filtros = {}

      if (idCurso !== 'todos') {
        filtros.curso = idCurso
      }

      if (idEstudiante !== 'todos') {
        filtros.estudiante = idEstudiante
      }

      if (desde) {
        filtros.desde = desde
      }

      if (hasta) {
        filtros.hasta = hasta
      }

      const datos = await api.getReportes(filtros)

      setRegistros(datos)
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setCargando(false)
    }
  }

  const filas = useMemo(() => {
    if (estado === 'todos') {
      return registros
    }

    return registros.filter(
      (registro) => registro.estado === estado
    )
  }, [registros, estado])

  const resumen = useMemo(() => {
    const conteos = {
      presente: 0,
      ausente: 0,
      tarde: 0,
      justificado: 0,
    }

    filas.forEach((fila) => {
      if (conteos[fila.estado] !== undefined) {
        conteos[fila.estado] += 1
      }
    })

    return conteos
  }, [filas])

  function etiquetaEstado(valor) {
    return (
      ESTADOS.find(
        (estado) => estado.value === valor
      )?.label ?? valor
    )
  }

  function escaparCSV(valor) {
    const texto = String(valor ?? '')

    if (
      texto.includes(',') ||
      texto.includes('"') ||
      texto.includes('\n')
    ) {
      return `"${texto.replace(/"/g, '""')}"`
    }

    return texto
  }

  function exportarCSV() {
    if (filas.length === 0) return

    const encabezado = [
      'Fecha',
      'Asignatura',
      'Estudiante',
      'Carné',
      'Estado',
    ]

    const filasCSV = filas.map((fila) => [
      fila.fecha,
      fila.curso,
      `${fila.nombre} ${fila.apellido}`,
      fila.carne ?? '',
      etiquetaEstado(fila.estado),
    ])

    const contenido = [encabezado, ...filasCSV]
      .map((fila) =>
        fila.map(escaparCSV).join(',')
      )
      .join('\n')

    const BOM = '\uFEFF'

    const blob = new Blob(
      [BOM + contenido],
      {
        type: 'text/csv;charset=utf-8;',
      }
    )

    const url = URL.createObjectURL(blob)

    const enlace = document.createElement('a')

    enlace.href = url

    const fechaActual =
      new Date().toISOString().slice(0, 10)

    enlace.download =
      `reporte_asistencia_${fechaActual}.csv`

    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)

    URL.revokeObjectURL(url)
  }

  function limpiarFiltros() {
    setIdCurso('todos')
    setIdEstudiante('todos')
    setEstado('todos')
    setDesde('')
    setHasta('')
  }

  const rangoInvalido =
    desde &&
    hasta &&
    desde > hasta

  return (
    <section>
      <div className="print-only attendance-print-header">
        <p className="eyebrow">
          Control de Asistencia Estudiantil
        </p>

        <h1>Reporte de asistencia</h1>

        <p>
          <strong>Registros:</strong>{' '}
          {filas.length}
        </p>

        {desde && (
          <p>
            <strong>Desde:</strong> {desde}
          </p>
        )}

        {hasta && (
          <p>
            <strong>Hasta:</strong> {hasta}
          </p>
        )}
      </div>

      <header className="section-header">
        <p className="eyebrow">
          Módulo 06
        </p>

        <h1>Reportes</h1>

        <p className="section-sub">
          Consulta los registros reales de asistencia,
          aplica filtros y exporta los resultados.
        </p>
      </header>

      {error && (
        <div className="module-message module-message-error">
          {error}
        </div>
      )}

      {rangoInvalido && (
        <div className="module-message module-message-error">
          La fecha inicial no puede ser posterior
          a la fecha final.
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

        <label>
          Estudiante

          <select
            value={idEstudiante}
            onChange={(e) =>
              setIdEstudiante(e.target.value)
            }
          >
            <option value="todos">
              Todos los estudiantes
            </option>

            {estudiantes.map((estudiante) => (
              <option
                key={estudiante.id}
                value={estudiante.id}
              >
                {estudiante.nombre}{' '}
                {estudiante.apellido}
                {estudiante.carne
                  ? ` · ${estudiante.carne}`
                  : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          Estado

          <select
            value={estado}
            onChange={(e) =>
              setEstado(e.target.value)
            }
          >
            <option value="todos">
              Todos los estados
            </option>

            {ESTADOS.map((opcion) => (
              <option
                key={opcion.value}
                value={opcion.value}
              >
                {opcion.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Desde

          <input
            type="date"
            value={desde}
            onChange={(e) =>
              setDesde(e.target.value)
            }
          />
        </label>

        <label>
          Hasta

          <input
            type="date"
            value={hasta}
            onChange={(e) =>
              setHasta(e.target.value)
            }
          />
        </label>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={limpiarFiltros}
        >
          Limpiar filtros
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={exportarCSV}
          disabled={
            filas.length === 0 ||
            rangoInvalido
          }
        >
          Exportar CSV
        </button>

        <button
          type="button"
          className="btn btn-secondary print-hide"
          onClick={() => window.print()}
          disabled={
            filas.length === 0 ||
            rangoInvalido
          }
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="card roster-summary">
        <div className="roster-summary-heading">
          <h2>Resumen del reporte</h2>

          <span>
            {filas.length}{' '}
            {filas.length === 1
              ? 'registro'
              : 'registros'}
          </span>
        </div>

        <div className="roster-summary-grid">
          <div className="roster-summary-item summary-presente">
            <span>Presentes</span>
            <strong>
              {resumen.presente}
            </strong>
          </div>

          <div className="roster-summary-item summary-ausente">
            <span>Ausentes</span>
            <strong>
              {resumen.ausente}
            </strong>
          </div>

          <div className="roster-summary-item summary-tarde">
            <span>Tarde</span>
            <strong>
              {resumen.tarde}
            </strong>
          </div>

          <div className="roster-summary-item summary-justificado">
            <span>Justificados</span>
            <strong>
              {resumen.justificado}
            </strong>
          </div>
        </div>
      </div>

      <div className="card table-card">
        {cargando ? (
          <p className="empty-row">
            Cargando reporte...
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asignatura</th>
                <th>Estudiante</th>
                <th>Carné</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {!rangoInvalido &&
                filas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="muted">
                      {fila.fecha}
                    </td>

                    <td>
                      {fila.curso}
                    </td>

                    <td>
                      {fila.nombre}{' '}
                      {fila.apellido}
                    </td>

                    <td className="muted">
                      {fila.carne || '—'}
                    </td>

                    <td>
                      <span
                        className={
                          `pill pill-${fila.estado}`
                        }
                      >
                        {etiquetaEstado(
                          fila.estado
                        )}
                      </span>
                    </td>
                  </tr>
                ))}

              {(filas.length === 0 ||
                rangoInvalido) && (
                <tr>
                  <td
                    colSpan={5}
                    className="empty-row"
                  >
                    No hay registros para los
                    filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}