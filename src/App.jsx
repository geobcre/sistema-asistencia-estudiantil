import { useState } from 'react'

import {
  gruposIniciales,
} from './data/mockData.js'

import Login from './components/Login.jsx'
import Docentes from './components/Docentes.jsx'
import Estudiantes from './components/Estudiantes.jsx'
import Cursos from './components/Cursos.jsx'
import Asistencia from './components/Asistencia.jsx'
import Estadisticas from './components/Estadisticas.jsx'
import Reportes from './components/Reportes.jsx'

// ======================================================
// SECCIONES DISPONIBLES
// ======================================================

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

// ======================================================
// RECUPERAR USUARIO GUARDADO
// ======================================================

function obtenerUsuarioGuardado() {
  try {
    const usuario = localStorage.getItem('usuario')

    return usuario ? JSON.parse(usuario) : null
  } catch {
    return null
  }
}

export default function App() {
  const [usuario, setUsuario] = useState(obtenerUsuarioGuardado)
  const [vista, setVista] = useState('asistencia')

  // ====================================================
  // DATOS DEL SISTEMA
  // ====================================================

  // Estos estados comienzan vacíos.
  // Cada módulo obtiene sus datos reales desde el backend.

  const [docentes, setDocentes] = useState([])

  const [estudiantes, setEstudiantes] = useState([])

  const [cursos, setCursos] = useState([])

  // Temporalmente mantenemos los grupos del mockData
  // hasta conectar este catálogo con el backend.
  const [grupos] = useState(gruposIniciales)

  const [inscripciones, setInscripciones] = useState([])

  const [sesiones, setSesiones] = useState([])

  const [asistencias, setAsistencias] = useState([])

  // ====================================================
  // STORE
  // ====================================================

  const store = {
    docentes,
    setDocentes,

    estudiantes,
    setEstudiantes,

    cursos,
    setCursos,

    grupos,

    inscripciones,
    setInscripciones,

    sesiones,
    setSesiones,

    asistencias,
    setAsistencias,
  }

  // ====================================================
  // CERRAR SESIÓN
  // ====================================================

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')

    setUsuario(null)
    setVista('asistencia')

    // Limpiamos los datos de la sesión anterior.
    setDocentes([])
    setEstudiantes([])
    setCursos([])
    setInscripciones([])
    setSesiones([])
    setAsistencias([])
  }

  // ====================================================
  // LOGIN
  // ====================================================

  if (!usuario) {
    return <Login onLogin={setUsuario} />
  }

  // ====================================================
  // DETERMINAR MENÚ SEGÚN EL ROL
  // ====================================================

  const esAdministrador =
    usuario.rol === 'administrador'

  const esDocente =
    usuario.rol === 'docente'

  const secciones = esAdministrador
    ? SECCIONES_ADMIN
    : SECCIONES_DOCENTE

  // ====================================================
  // INTERFAZ PRINCIPAL
  // ====================================================

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">

          <span className="brand-mark">
            Ⓐ
          </span>

          <div>

            <p className="brand-title">
              Control de Asistencia
            </p>

            <p className="brand-sub">
              Sistema de gestión estudiantil
            </p>

          </div>

        </div>

        {/* ============================================= */}
        {/* USUARIO AUTENTICADO */}
        {/* ============================================= */}

        <div className="sidebar-user">

          <div className="sidebar-avatar">
            {usuario.nombre
              ?.charAt(0)
              .toUpperCase()}
          </div>

          <div>

            <p className="sidebar-user-name">
              {usuario.nombre}
            </p>

            <p className="sidebar-user-role">
              {esAdministrador
                ? 'Administrador'
                : esDocente
                  ? 'Docente'
                  : usuario.rol}
            </p>

          </div>

        </div>

        {/* ============================================= */}
        {/* NAVEGACIÓN SEGÚN ROL */}
        {/* ============================================= */}

        <nav className="nav">

          {secciones.map((seccion) => (

            <button
              key={seccion.id}
              className={`nav-item ${
                vista === seccion.id
                  ? 'is-active'
                  : ''
              }`}
              onClick={() =>
                setVista(seccion.id)
              }
            >

              <span className="nav-num">
                {seccion.numero}
              </span>

              {seccion.label}

            </button>

          ))}

        </nav>

        {/* ============================================= */}
        {/* PARTE INFERIOR */}
        {/* ============================================= */}

        <div className="sidebar-bottom">

          <button
            className="logout-button"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>

          <p className="sidebar-footnote">
            Sistema conectado al servidor de asistencia.
          </p>

        </div>

      </aside>

      {/* =============================================== */}
      {/* CONTENIDO PRINCIPAL */}
      {/* =============================================== */}

      <main className="content">

        {/* SOLO ADMINISTRADOR */}

        {esAdministrador &&
          vista === 'docentes' && (
            <Docentes store={store} />
          )}

        {esAdministrador &&
          vista === 'estudiantes' && (
            <Estudiantes store={store} />
          )}

        {esAdministrador &&
          vista === 'cursos' && (
            <Cursos store={store} />
          )}

        {/* ADMINISTRADOR Y DOCENTE */}

        {vista === 'asistencia' && (
          <Asistencia
            store={store}
            usuario={usuario}
          />
        )}

        {vista === 'estadisticas' && (
          <Estadisticas
            store={store}
            usuario={usuario}
          />
        )}

        {vista === 'reportes' && (
          <Reportes
            store={store}
            usuario={usuario}
          />
        )}

      </main>

    </div>
  )
}