const BASE_URL = 'http://localhost:4000/api'

function obtenerToken() {
  return localStorage.getItem('token')
}

async function solicitar(ruta, opciones = {}) {
  const token = obtenerToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(opciones.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${ruta}`, {
    ...opciones,
    headers,
  })

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}))

    // Si el token venció o dejó de ser válido
    if (res.status === 401 && ruta !== '/auth/login') {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
    }

    throw new Error(
      cuerpo.error || `Error ${res.status} al llamar ${ruta}`
    )
  }

  if (res.status === 204) {
    return null
  }

  return res.json()
}

export const api = {
  // ====================================================
  // AUTENTICACIÓN
  // ====================================================

  login: (correo, password) =>
    solicitar('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        correo,
        password,
      }),
    }),

  // ====================================================
  // USUARIOS
  // ====================================================

  getUsuarios: () =>
    solicitar('/usuarios'),

  getUsuario: (id) =>
    solicitar(`/usuarios/${id}`),

  crearUsuario: (data) =>
    solicitar('/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editarUsuario: (id, data) =>
    solicitar(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cambiarEstadoUsuario: (id, activo) =>
    solicitar(`/usuarios/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({
        activo,
      }),
    }),

  // ====================================================
  // DOCENTES
  // ====================================================

  getDocentes: () =>
    solicitar('/docentes'),

  crearDocente: (data) =>
    solicitar('/docentes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editarDocente: (id, data) =>
    solicitar(`/docentes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  eliminarDocente: (id) =>
    solicitar(`/docentes/${id}`, {
      method: 'DELETE',
    }),

  // ====================================================
  // ESTUDIANTES
  // ====================================================

  getEstudiantes: () =>
    solicitar('/estudiantes'),

  crearEstudiante: (data) =>
    solicitar('/estudiantes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editarEstudiante: (id, data) =>
    solicitar(`/estudiantes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  eliminarEstudiante: (id) =>
    solicitar(`/estudiantes/${id}`, {
      method: 'DELETE',
    }),

  // ====================================================
  // CURSOS / ASIGNATURAS
  // ====================================================

  getCursos: () =>
    solicitar('/cursos'),

  crearCurso: (data) =>
    solicitar('/cursos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editarCurso: (id, data) =>
    solicitar(`/cursos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  eliminarCurso: (id) =>
    solicitar(`/cursos/${id}`, {
      method: 'DELETE',
    }),

  // ====================================================
  // INSCRIPCIONES
  // ====================================================

  getEstudiantesDeCurso: (idCurso) =>
    solicitar(`/cursos/${idCurso}/estudiantes`),

  inscribirEstudiante: (idCurso, idEstudiante) =>
    solicitar(`/cursos/${idCurso}/inscripciones`, {
      method: 'POST',
      body: JSON.stringify({
        idEstudiante,
      }),
    }),

  desinscribirEstudiante: (idCurso, idEstudiante) =>
    solicitar(
      `/cursos/${idCurso}/inscripciones/${idEstudiante}`,
      {
        method: 'DELETE',
      }
    ),

  // ====================================================
  // SESIONES Y ASISTENCIA
  // ====================================================

  getSesionesDeCurso: (idCurso) =>
    solicitar(`/cursos/${idCurso}/sesiones`),

  crearOEncontrarSesion: (idCurso, fecha) =>
    solicitar(`/cursos/${idCurso}/sesiones`, {
      method: 'POST',
      body: JSON.stringify({
        fecha,
      }),
    }),

  getAsistenciaDeSesion: (idSesion) =>
    solicitar(`/sesiones/${idSesion}/asistencia`),

  marcarAsistencia: (idSesion, idEstudiante, estado) =>
    solicitar(`/sesiones/${idSesion}/asistencia`, {
      method: 'POST',
      body: JSON.stringify({
        idEstudiante,
        estado,
      }),
    }),

  // ====================================================
  // ESTADÍSTICAS
  // ====================================================

  getEstadisticasCurso: (idCurso) =>
    solicitar(`/estadisticas/curso/${idCurso}`),

  getEstudiantesEnRiesgo: () =>
    solicitar('/estadisticas/riesgo'),

  // ====================================================
  // REPORTES
  // ====================================================

  getReportes: (filtros = {}) => {
    const params = new URLSearchParams()

    Object.entries(filtros).forEach(([clave, valor]) => {
      if (
        valor !== undefined &&
        valor !== null &&
        valor !== ''
      ) {
        params.append(clave, valor)
      }
    })

    const query = params.toString()

    return solicitar(
      `/reportes${query ? `?${query}` : ''}`
    )
  },
}