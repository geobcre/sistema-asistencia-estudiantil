// Datos en memoria que representan el MER del sistema.
// No hay base de datos real: todo vive en el estado de React y se reinicia
// al recargar la página. Sirve como prototipo funcional para el proyecto académico.

export const docentesIniciales = [
  { id: 1, nombre: 'Marta', apellido: 'Solís', correo: 'msolis@escuela.edu' },
  { id: 2, nombre: 'Hugo', apellido: 'Ramírez', correo: 'hramirez@escuela.edu' },
  { id: 3, nombre: 'Elena', apellido: 'Vásquez', correo: 'evasquez@escuela.edu' },
]

export const estudiantesIniciales = [
  { id: 1, nombre: 'Ana', apellido: 'García', carne: 'EST-001' },
  { id: 2, nombre: 'Luis', apellido: 'Pérez', carne: 'EST-002' },
  { id: 3, nombre: 'Sofía', apellido: 'Morales', carne: 'EST-003' },
  { id: 4, nombre: 'Diego', apellido: 'Castillo', carne: 'EST-004' },
  { id: 5, nombre: 'Valeria', apellido: 'Ortiz', carne: 'EST-005' },
  { id: 6, nombre: 'Mateo', apellido: 'Ríos', carne: 'EST-006' },
]

export const cursosIniciales = [
  { id: 1, nombre: 'Matemática I', codigo: 'MAT-101', horario: 'Lun/Mié 8:00', idDocente: 1 },
  { id: 2, nombre: 'Lenguaje', codigo: 'LEN-101', horario: 'Mar/Jue 10:00', idDocente: 2 },
  { id: 3, nombre: 'Ciencias Naturales', codigo: 'CNA-101', horario: 'Vie 9:00', idDocente: 3 },
]

// Inscripción: relación muchos-a-muchos entre estudiantes y cursos
export const inscripcionesIniciales = [
  { id: 1, idEstudiante: 1, idCurso: 1 },
  { id: 2, idEstudiante: 2, idCurso: 1 },
  { id: 3, idEstudiante: 3, idCurso: 1 },
  { id: 4, idEstudiante: 4, idCurso: 2 },
  { id: 5, idEstudiante: 5, idCurso: 2 },
  { id: 6, idEstudiante: 1, idCurso: 2 },
  { id: 7, idEstudiante: 6, idCurso: 3 },
  { id: 8, idEstudiante: 2, idCurso: 3 },
  { id: 9, idEstudiante: 3, idCurso: 3 },
]

// Sesión de clase: una fecha/hora concreta en la que se puede tomar asistencia
export const sesionesIniciales = [
  { id: 1, idCurso: 1, fecha: '2026-08-24' },
  { id: 2, idCurso: 1, fecha: '2026-08-26' },
  { id: 3, idCurso: 2, fecha: '2026-08-25' },
  { id: 4, idCurso: 3, fecha: '2026-08-28' },
]

// Asistencia: estado por estudiante en cada sesión
export const asistenciasIniciales = [
  { id: 1, idSesion: 1, idEstudiante: 1, estado: 'presente' },
  { id: 2, idSesion: 1, idEstudiante: 2, estado: 'presente' },
  { id: 3, idSesion: 1, idEstudiante: 3, estado: 'ausente' },
  { id: 4, idSesion: 2, idEstudiante: 1, estado: 'presente' },
  { id: 5, idSesion: 2, idEstudiante: 2, estado: 'tarde' },
  { id: 6, idSesion: 2, idEstudiante: 3, estado: 'presente' },
  { id: 7, idSesion: 3, idEstudiante: 4, estado: 'presente' },
  { id: 8, idSesion: 3, idEstudiante: 5, estado: 'justificado' },
  { id: 9, idSesion: 3, idEstudiante: 1, estado: 'presente' },
  { id: 10, idSesion: 4, idEstudiante: 6, estado: 'presente' },
  { id: 11, idSesion: 4, idEstudiante: 2, estado: 'presente' },
  { id: 12, idSesion: 4, idEstudiante: 3, estado: 'ausente' },
]

export const ESTADOS = [
  { value: 'presente', label: 'Presente', short: 'P' },
  { value: 'ausente', label: 'Ausente', short: 'A' },
  { value: 'tarde', label: 'Tarde', short: 'T' },
  { value: 'justificado', label: 'Justificado', short: 'J' },
]
