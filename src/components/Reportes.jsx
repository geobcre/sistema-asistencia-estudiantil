import { useEffect, useState } from 'react'
import { api } from '../api.js'

const ETIQUETAS_ESTADO = {
  presente: 'Presente',
  ausente: 'Ausente',
  tarde: 'Tarde',
  justificado: 'Justificado',
}

export default function Reportes({ store }) {
  const { cursos } = store
  const [idCurso, setIdCurso] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filas, setFilas] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    const filtros = {}
    if (idCurso !== 'todos') filtros.curso = idCurso
    if (desde) filtros.desde = desde
    if (hasta) filtros.hasta = hasta

    api.getReportes(filtros)
      .then((data) => { if (!cancelado) setFilas(data) })
      .catch((err) => { if (!cancelado) setError(err.message) })

    return () => { cancelado = true }
  }, [idCurso, desde, hasta])

  function exportarCSV() {
    const encabezado = ['Fecha', 'Curso', 'Estudiante', 'Carné', 'Estado']
    const filasCSV = filas.map((f) => [
      f.fecha,
      f.curso,
      `${f.nombre} ${f.apellido}`,
      f.carne ?? '',
      ETIQUETAS_ESTADO[f.estado] ?? f.estado,
    ])
    const contenido = [encabezado, ...filasCSV].map((fila) => fila.join(',')).join('\n')
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'reporte_asistencia.csv'
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 06</p>
        <h1>Reportes</h1>
        <p className="section-sub">Filtra por curso y rango de fechas, y exporta a CSV.</p>
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
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <button className="btn btn-secondary" onClick={exportarCSV} disabled={filas.length === 0}>
          Exportar CSV
        </button>
      </div>

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Curso</th>
              <th>Estudiante</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id}>
                <td className="muted">{f.fecha}</td>
                <td>{f.curso}</td>
                <td>{f.nombre} {f.apellido}</td>
                <td>
                  <span className={`pill pill-${f.estado}`}>{ETIQUETAS_ESTADO[f.estado] ?? f.estado}</span>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr><td colSpan={4} className="empty-row">No hay registros para los filtros seleccionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
