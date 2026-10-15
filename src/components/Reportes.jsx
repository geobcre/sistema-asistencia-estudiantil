import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { descargarCsv, generarCsv } from '../utils/csv.js'

const ESTADOS = ['Presente', 'Ausente', 'Tarde', 'Justificado']
const FILTROS_VACIOS = {
  id_ciclo: '', id_grupo: '', id_asignacion: '', id_estudiante: '',
  estado: '', desde: '', hasta: ''
}
// La tabla muestra solo las primeras filas; el CSV siempre incluye todas.
const MAX_FILAS_EN_PANTALLA = 200

const COLUMNAS_CSV = [
  { encabezado: 'Fecha', valor: (r) => r.fecha },
  { encabezado: 'Ciclo', valor: (r) => r.ciclo_anio },
  { encabezado: 'Grado', valor: (r) => r.grado },
  { encabezado: 'Sección', valor: (r) => r.seccion },
  { encabezado: 'Código asignatura', valor: (r) => r.asignatura_codigo },
  { encabezado: 'Asignatura', valor: (r) => r.asignatura_nombre },
  { encabezado: 'Docente', valor: (r) => `${r.docente_nombre} ${r.docente_apellido}` },
  { encabezado: 'Carné', valor: (r) => r.carne },
  { encabezado: 'Apellido', valor: (r) => r.apellido },
  { encabezado: 'Nombre', valor: (r) => r.nombre },
  { encabezado: 'Estado', valor: (r) => r.estado },
]

const hoy = () => new Date().toISOString().slice(0, 10)

export default function Reportes() {
  const [catalogo, setCatalogo] = useState({ ciclos: [], grupos: [], asignaciones: [], estudiantes: [] })
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function iniciar() {
      try {
        const [ciclos, grupos, asignaciones, estudiantes] = await Promise.all([
          api.getCiclos(), api.getGrupos(), api.getAsignaciones(), api.getEstudiantes()
        ])
        setCatalogo({ ciclos, grupos, asignaciones, estudiantes })
      } catch (e) { setError(e.message) }
      await generar(FILTROS_VACIOS)
    }
    iniciar()
  }, [])

  async function generar(filtrosActuales = filtros) {
    if (filtrosActuales.desde && filtrosActuales.hasta && filtrosActuales.desde > filtrosActuales.hasta) {
      return setError('La fecha "desde" no puede ser posterior a "hasta".')
    }
    try {
      setCargando(true); setError('')
      setReporte(await api.getReporte(filtrosActuales))
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  function cambiar(e) { setFiltros({ ...filtros, [e.target.name]: e.target.value }) }
  function limpiar() { setFiltros(FILTROS_VACIOS); generar(FILTROS_VACIOS) }

  function exportar() {
    if (!reporte?.registros.length) return
    descargarCsv(`reporte-asistencia-${hoy()}.csv`, generarCsv(COLUMNAS_CSV, reporte.registros))
  }

  const gruposVisibles = catalogo.grupos.filter((g) => !filtros.id_ciclo || g.id_ciclo === Number(filtros.id_ciclo))
  const registros = reporte?.registros ?? []

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 06</p>
        <h1>Reportes</h1>
        <p className="section-sub">Consulta y exportación del historial de asistencia.</p>
      </header>
      {error && <div className="module-message module-message-error">{error}</div>}

      <form className="card roster-controls" onSubmit={(e) => { e.preventDefault(); generar() }}>
        <label>Ciclo
          <select name="id_ciclo" value={filtros.id_ciclo} onChange={(e) => setFiltros({ ...filtros, id_ciclo: e.target.value, id_grupo: '' })}>
            <option value="">Todos</option>
            {catalogo.ciclos.map((c) => <option key={c.id_ciclo} value={c.id_ciclo}>{c.anio}</option>)}
          </select>
        </label>
        <label>Grupo
          <select name="id_grupo" value={filtros.id_grupo} onChange={cambiar}>
            <option value="">Todos</option>
            {gruposVisibles.map((g) => <option key={g.id_grupo} value={g.id_grupo}>{g.ciclo_anio} · {g.grado}° {g.seccion}</option>)}
          </select>
        </label>
        <label>Asignación académica
          <select name="id_asignacion" value={filtros.id_asignacion} onChange={cambiar}>
            <option value="">Todas</option>
            {catalogo.asignaciones.map((a) => <option key={a.id_asignacion} value={a.id_asignacion}>
              {a.asignatura_codigo} · {a.grado}° {a.seccion} · {a.ciclo_anio} · {a.docente_nombre} {a.docente_apellido}
            </option>)}
          </select>
        </label>
        <label>Estudiante
          <select name="id_estudiante" value={filtros.id_estudiante} onChange={cambiar}>
            <option value="">Todos</option>
            {catalogo.estudiantes.map((e) => <option key={e.id_estudiante} value={e.id_estudiante}>
              {e.apellido}, {e.nombre} ({e.carne})
            </option>)}
          </select>
        </label>
        <label>Estado
          <select name="estado" value={filtros.estado} onChange={cambiar}>
            <option value="">Todos</option>
            {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
          </select>
        </label>
        <label>Desde<input type="date" name="desde" value={filtros.desde} onChange={cambiar} /></label>
        <label>Hasta<input type="date" name="hasta" value={filtros.hasta} onChange={cambiar} /></label>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={cargando}>{cargando ? 'Generando...' : 'Generar reporte'}</button>
          <button type="button" className="btn btn-ghost" onClick={limpiar} disabled={cargando}>Limpiar</button>
        </div>
      </form>

      {reporte && <div className="card roster-summary">
        <div className="roster-summary-heading">
          <h2>Resultado</h2>
          <span>{reporte.total} registros</span>
        </div>
        <div className="roster-summary-grid">
          {ESTADOS.map((estado) => <div key={estado} className={`roster-summary-item summary-${estado.toLowerCase()}`}>
            <span>{estado}</span><strong>{reporte.resumen[estado]}</strong>
          </div>)}
          <div className="roster-summary-item summary-pendiente"><span>Total</span><strong>{reporte.total}</strong></div>
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={exportar} disabled={!registros.length}>Exportar CSV</button>
        </div>
      </div>}

      {reporte && <div className="card table-card">
        <table>
          <thead><tr>
            <th>Fecha</th><th>Asignatura</th><th>Grupo</th><th>Estudiante</th><th>Carné</th><th>Estado</th>
          </tr></thead>
          <tbody>
            {registros.slice(0, MAX_FILAS_EN_PANTALLA).map((r) => <tr key={r.id_asistencia}>
              <td>{r.fecha}</td>
              <td>{r.asignatura_nombre}</td>
              <td>{r.ciclo_anio} · {r.grado}° {r.seccion}</td>
              <td>{r.apellido}, {r.nombre}</td>
              <td>{r.carne}</td>
              <td><span className={`pill pill-${r.estado.toLowerCase()}`}>{r.estado}</span></td>
            </tr>)}
            {!registros.length && <tr><td colSpan={6} className="empty-row">No hay registros para los filtros seleccionados.</td></tr>}
          </tbody>
        </table>
        {registros.length > MAX_FILAS_EN_PANTALLA && <p className="muted stats-note">
          Se muestran los primeros {MAX_FILAS_EN_PANTALLA} de {registros.length} registros. El CSV incluye todos.
        </p>}
      </div>}
    </section>
  )
}
