import { useState } from 'react'
import {
  docentesIniciales,
  estudiantesIniciales,
  cursosIniciales,
  inscripcionesIniciales,
  sesionesIniciales,
  asistenciasIniciales,
} from './data/mockData.js'
import Docentes from './components/Docentes.jsx'
import Estudiantes from './components/Estudiantes.jsx'
import Cursos from './components/Cursos.jsx'
import Asistencia from './components/Asistencia.jsx'
import Estadisticas from './components/Estadisticas.jsx'
import Reportes from './components/Reportes.jsx'

const SECCIONES = [
  { id: 'docentes', label: 'Docentes', numero: '01' },
  { id: 'estudiantes', label: 'Estudiantes', numero: '02' },
  { id: 'cursos', label: 'Cursos', numero: '03' },
  { id: 'asistencia', label: 'Asistencia', numero: '04' },
  { id: 'estadisticas', label: 'Estadísticas', numero: '05' },
  { id: 'reportes', label: 'Reportes', numero: '06' },
]

export default function App() {
  const [vista, setVista] = useState('asistencia')

  // Todo el "backend" vive aquí, en memoria. No hay base de datos real:
  // al recargar la página, los datos vuelven a su estado inicial.
  const [docentes, setDocentes] = useState(docentesIniciales)
  const [estudiantes, setEstudiantes] = useState(estudiantesIniciales)
  const [cursos, setCursos] = useState(cursosIniciales)
  const [inscripciones, setInscripciones] = useState(inscripcionesIniciales)
  const [sesiones, setSesiones] = useState(sesionesIniciales)
  const [asistencias, setAsistencias] = useState(asistenciasIniciales)

  const store = {
    docentes, setDocentes,
    estudiantes, setEstudiantes,
    cursos, setCursos,
    inscripciones, setInscripciones,
    sesiones, setSesiones,
    asistencias, setAsistencias,
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Ⓐ</span>
          <div>
            <p className="brand-title">Control de Asistencia</p>
            <p className="brand-sub">Prototipo académico</p>
          </div>
        </div>
        <nav className="nav">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              className={`nav-item ${vista === s.id ? 'is-active' : ''}`}
              onClick={() => setVista(s.id)}
            >
              <span className="nav-num">{s.numero}</span>
              {s.label}
            </button>
          ))}
        </nav>
        <p className="sidebar-footnote">
          Sin base de datos real — los datos viven en memoria durante la sesión.
        </p>
      </aside>

      <main className="content">
        {vista === 'docentes' && <Docentes store={store} />}
        {vista === 'estudiantes' && <Estudiantes store={store} />}
        {vista === 'cursos' && <Cursos store={store} />}
        {vista === 'asistencia' && <Asistencia store={store} />}
        {vista === 'estadisticas' && <Estadisticas store={store} />}
        {vista === 'reportes' && <Reportes store={store} />}
      </main>
    </div>
  )
}
