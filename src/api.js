const BASE_URL = 'http://localhost:4000/api'

async function solicitar(ruta, opciones = {}) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...(opciones.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const respuesta = await fetch(`${BASE_URL}${ruta}`, { ...opciones, headers })
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}))
    if (respuesta.status === 401 && ruta !== '/auth/login') {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    const error = new Error(cuerpo.error || `Error ${respuesta.status} al llamar ${ruta}`)
    error.status = respuesta.status
    throw error
  }
  return respuesta.status === 204 ? null : respuesta.json()
}

const json = (method, data) => ({ method, body: JSON.stringify(data) })

export const api = {
  login: (correo, password) => solicitar('/auth/login', json('POST', { correo, password })),

  getUsuarios: () => solicitar('/usuarios'),
  getUsuario: (id) => solicitar(`/usuarios/${id}`),
  crearUsuario: (data) => solicitar('/usuarios', json('POST', data)),
  editarUsuario: (id, data) => solicitar(`/usuarios/${id}`, json('PUT', data)),
  cambiarEstadoUsuario: (id, activo) => solicitar(`/usuarios/${id}/estado`, json('PATCH', { activo })),

  getDocentes: () => solicitar('/docentes'),
  crearDocente: (data) => solicitar('/docentes', json('POST', data)),
  editarDocente: (id, data) => solicitar(`/docentes/${id}`, json('PUT', data)),
  eliminarDocente: (id) => solicitar(`/docentes/${id}`, { method: 'DELETE' }),

  getEstudiantes: () => solicitar('/estudiantes'),
  crearEstudiante: (data) => solicitar('/estudiantes', json('POST', data)),
  editarEstudiante: (id, data) => solicitar(`/estudiantes/${id}`, json('PUT', data)),
  eliminarEstudiante: (id) => solicitar(`/estudiantes/${id}`, { method: 'DELETE' }),
  getHistorialEstudiante: (id) => solicitar(`/estudiantes/${id}/asistencia`),

  getCiclos: () => solicitar('/ciclos'),
  getGrupos: () => solicitar('/grupos'),

  getAsignaturas: () => solicitar('/asignaturas'),
  crearAsignatura: (data) => solicitar('/asignaturas', json('POST', data)),
  editarAsignatura: (id, data) => solicitar(`/asignaturas/${id}`, json('PUT', data)),
  eliminarAsignatura: (id) => solicitar(`/asignaturas/${id}`, { method: 'DELETE' }),

  getAsignaciones: () => solicitar('/asignaciones-academicas'),
  crearAsignacion: (data) => solicitar('/asignaciones-academicas', json('POST', data)),
  editarAsignacion: (id, data) => solicitar(`/asignaciones-academicas/${id}`, json('PUT', data)),
  eliminarAsignacion: (id) => solicitar(`/asignaciones-academicas/${id}`, { method: 'DELETE' }),

  getMatriculas: () => solicitar('/matriculas'),
  getInscripciones: () => solicitar('/inscripciones'),
  crearInscripcion: (data) => solicitar('/inscripciones', json('POST', data)),
  retirarInscripcion: (id, fecha_retiro) => solicitar(
    `/inscripciones/${id}`,
    json('DELETE', fecha_retiro ? { fecha_retiro } : {})
  ),

  getSesiones: () => solicitar('/sesiones'),
  crearSesion: (id_asignacion, fecha) => solicitar(
    '/sesiones', json('POST', { id_asignacion, fecha })
  ),
  actualizarSesion: (id, data) => solicitar(`/sesiones/${id}`, json('PUT', data)),
  cancelarSesion: (id) => solicitar(`/sesiones/${id}`, { method: 'DELETE' }),
  getAsistenciaDeSesion: (id) => solicitar(`/sesiones/${id}/asistencia`),
  marcarAsistencia: (idSesion, idInscripcion, estado) => solicitar(
    `/sesiones/${idSesion}/asistencia`,
    json('POST', { id_inscripcion: idInscripcion, estado })
  ),
}
