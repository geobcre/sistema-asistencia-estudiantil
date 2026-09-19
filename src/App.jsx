import { useEffect, useState } from 'react'
import { api } from './api.js'
import Docentes from './components/Docentes.jsx'
import Estudiantes from './components/Estudiantes.jsx'
import Cursos from './components/Cursos.jsx'
import Asistencia from './components/Asistencia.jsx'
import Estadisticas from './components/Estadisticas.jsx'
import Reportes from './components/Reportes.jsx'

const SECCIONES = [
  { id: 'docentes', label: 'Docentes', icono: '🧑‍🏫' },
  { id: 'estudiantes', label: 'Estudiantes', icono: '🎓' },
  { id: 'cursos', label: 'Cursos', icono: '📚' },
  { id: 'asistencia', label: 'Asistencia', icono: '✅' },
  { id: 'estadisticas', label: 'Estadísticas', icono: '📊' },
  { id: 'reportes', label: 'Reportes', icono: '📄' },
]

export default function App() {
  const [vista, setVista] = useState('asistencia')
  const [docentes, setDocentes] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [cursos, setCursos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorConexion, setErrorConexion] = useState(null)

  async function cargarDatosBase() {
    setCargando(true)
    setErrorConexion(null)
    try {
      const [d, e, c] = await Promise.all([api.getDocentes(), api.getEstudiantes(), api.getCursos()])
      setDocentes(d)
      setEstudiantes(e)
      setCursos(c)
    } catch (err) {
      setErrorConexion(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatosBase()
  }, [])

  // Se pasa a cada modulo: coleccion base + su setter + una funcion para refrescar todo tras un cambio en Cursos
  const store = {
    docentes, setDocentes,
    estudiantes, setEstudiantes,
    cursos, setCursos,
    recargar: cargarDatosBase,
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">📋</span>
          <div>
            <p className="brand-title">Control de Asistencia</p>
            <p className="brand-sub">Backend real · SQLite</p>
          </div>
        </div>
        <nav className="nav">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              className={`nav-item ${vista === s.id ? 'is-active' : ''}`}
              onClick={() => setVista(s.id)}
            >
              <span className="nav-icon">{s.icono}</span>
              {s.label}
            </button>
          ))}
        </nav>
        <p className="sidebar-footnote">
          Conectado a la API en http://localhost:4000
        </p>
      </aside>

      <main className="content">
        {errorConexion && (
          <div className="card alert-card">
            <p className="alert-title">No se pudo conectar con la API</p>
            <p className="muted">{errorConexion}. Verifica que el backend esté corriendo (`npm run dev` dentro de la carpeta `backend`).</p>
          </div>
        )}

        {cargando && !errorConexion && <p className="muted">Cargando datos…</p>}

        {!cargando && !errorConexion && (
          <>
            {vista === 'docentes' && <Docentes store={store} />}
            {vista === 'estudiantes' && <Estudiantes store={store} />}
            {vista === 'cursos' && <Cursos store={store} />}
            {vista === 'asistencia' && <Asistencia store={store} />}
            {vista === 'estadisticas' && <Estadisticas store={store} />}
            {vista === 'reportes' && <Reportes store={store} />}
          </>
        )}
      </main>
    </div>
  )
}
