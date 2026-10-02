import { useEffect, useState } from 'react'
import Login from './components/Login.jsx'
import Docentes from './components/Docentes.jsx'
import Estudiantes from './components/Estudiantes.jsx'
import Cursos from './components/Cursos.jsx'
import Asistencia from './components/Asistencia.jsx'
import Estadisticas from './components/Estadisticas.jsx'
import Reportes from './components/Reportes.jsx'

const SECCIONES_ADMIN = [
  { id: 'docentes', label: 'Docentes', numero: '01' },
  { id: 'estudiantes', label: 'Estudiantes', numero: '02' },
  { id: 'cursos', label: 'Asignaturas', numero: '03' },
  { id: 'asistencia', label: 'Asistencia', numero: '04' },
  { id: 'estadisticas', label: 'Estadísticas', numero: '05' },
  { id: 'reportes', label: 'Reportes', numero: '06' },
]
const SECCIONES_DOCENTE = [
  { id: 'asistencia', label: 'Asistencia', numero: '01' },
  { id: 'estadisticas', label: 'Estadísticas', numero: '02' },
  { id: 'reportes', label: 'Reportes', numero: '03' },
]

function usuarioGuardado() {
  try {
    const usuario = localStorage.getItem('usuario')
    return usuario && localStorage.getItem('token') ? JSON.parse(usuario) : null
  } catch {
    return null
  }
}

export default function App() {
  const [usuario, setUsuario] = useState(usuarioGuardado)
  const [vista, setVista] = useState('asistencia')
  const [docentes, setDocentes] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const store = { docentes, setDocentes, estudiantes, setEstudiantes }

  function cerrarSesion() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
    setVista('asistencia')
    setDocentes([])
    setEstudiantes([])
  }

  useEffect(() => {
    window.addEventListener('auth:unauthorized', cerrarSesion)
    return () => window.removeEventListener('auth:unauthorized', cerrarSesion)
  }, [])

  if (!usuario) return <Login onLogin={setUsuario} />

  const esAdministrador = usuario.rol === 'administrador'
  const secciones = esAdministrador ? SECCIONES_ADMIN : SECCIONES_DOCENTE

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            <p className="brand-title">Control de Asistencia</p>
            <p className="brand-sub">Sistema de gestión estudiantil</p>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{usuario.nombre?.charAt(0).toUpperCase()}</div>
          <div>
            <p className="sidebar-user-name">{usuario.nombre}</p>
            <p className="sidebar-user-role">{esAdministrador ? 'Administrador' : 'Docente'}</p>
          </div>
        </div>
        <nav className="nav">
          {secciones.map((seccion) => (
            <button key={seccion.id} className={`nav-item ${vista === seccion.id ? 'is-active' : ''}`}
              onClick={() => setVista(seccion.id)}>
              <span className="nav-num">{seccion.numero}</span>{seccion.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-button" onClick={cerrarSesion}>Cerrar sesión</button>
          <p className="sidebar-footnote">Sistema conectado al servidor de asistencia.</p>
        </div>
      </aside>
      <main className="content">
        {esAdministrador && vista === 'docentes' && <Docentes store={store} />}
        {esAdministrador && vista === 'estudiantes' && <Estudiantes store={store} />}
        {esAdministrador && vista === 'cursos' && <Cursos />}
        {vista === 'asistencia' && <Asistencia usuario={usuario} />}
        {vista === 'estadisticas' && <Estadisticas />}
        {vista === 'reportes' && <Reportes />}
      </main>
    </div>
  )
}
