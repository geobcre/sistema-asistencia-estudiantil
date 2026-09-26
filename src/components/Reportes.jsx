import { useMemo, useState } from 'react'
import { ESTADOS, nombreGrupo } from '../data/mockData.js'

export default function Reportes({ store }) {
  const { cursos, grupos, estudiantes, sesiones, asistencias } = store
  const [idCurso, setIdCurso] = useState('todos')
  const [idGrupo, setIdGrupo] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const filas = useMemo(() => {
    return asistencias
      .map((a) => {
        const sesion = sesiones.find((s) => s.id === a.idSesion)
        const curso = cursos.find((c) => c.id === sesion?.idCurso)
        const grupo = grupos.find((g) => g.id === sesion?.idGrupo)
        const estudiante = estudiantes.find((s) => s.id === a.idEstudiante)
        return { ...a, sesion, curso, grupo, estudiante }
      })
      .filter((f) => f.sesion && f.curso && f.estudiante)
      .filter((f) => idCurso === 'todos' || f.curso.id === Number(idCurso))
      .filter((f) => idGrupo === 'todos' || f.sesion.idGrupo === Number(idGrupo))
      .filter((f) => !desde || f.sesion.fecha >= desde)
      .filter((f) => !hasta || f.sesion.fecha <= hasta)
      .sort((a, b) => (a.sesion.fecha < b.sesion.fecha ? 1 : -1))
  }, [asistencias, sesiones, cursos, grupos, estudiantes, idCurso, idGrupo, desde, hasta])

  function etiquetaEstado(valor) {
    return ESTADOS.find((e) => e.value === valor)?.label ?? valor
  }

  function exportarCSV() {
    const encabezado = ['Fecha', 'Grado / sección', 'Asignatura', 'Estudiante', 'Carné', 'Estado']
    const filasCSV = filas.map((f) => [
      f.sesion.fecha,
      nombreGrupo(f.grupo),
      f.curso.nombre,
      `${f.estudiante.nombre} ${f.estudiante.apellido}`,
      f.estudiante.carne ?? '',
      etiquetaEstado(f.estado),
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
        <p className="section-sub">Filtra por grupo, asignatura y rango de fechas, y exporta a CSV.</p>
      </header>

      <div className="card roster-controls">
        <label>
          Asignatura
          <select value={idCurso} onChange={(e) => setIdCurso(e.target.value)}>
            <option value="todos">Todas las asignaturas</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Grado y sección
          <select value={idGrupo} onChange={(e) => setIdGrupo(e.target.value)}>
            <option value="todos">Todos los grupos</option>
            {grupos.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>{nombreGrupo(grupo)}</option>
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
              <th>Grado / sección</th>
              <th>Asignatura</th>
              <th>Estudiante</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id}>
                <td className="muted">{f.sesion.fecha}</td>
                <td>{nombreGrupo(f.grupo)}</td>
                <td>{f.curso.nombre}</td>
                <td>{f.estudiante.nombre} {f.estudiante.apellido}</td>
                <td>
                  <span className={`pill pill-${f.estado}`}>{etiquetaEstado(f.estado)}</span>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr><td colSpan={5} className="empty-row">No hay registros para los filtros seleccionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
