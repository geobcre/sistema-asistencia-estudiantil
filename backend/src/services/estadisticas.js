import { db } from '../db.js'

export const UMBRAL_RIESGO = 75

// Una ausencia justificada no penaliza el porcentaje: se muestra aparte
// y se excluye de la base de cálculo. Cambiar a true para que cuente como falta.
export const JUSTIFICADO_PENALIZA = false

// Una fila por inscripción (estudiante × asignación académica) con sus conteos.
// Solo cuentan las sesiones no canceladas en las que la matrícula y la
// inscripción estaban vigentes, la misma regla que usa la toma de asistencia.
const SELECT_ESTADISTICAS = `
  SELECT
    i.id_inscripcion,
    i.estado AS inscripcion_estado,
    e.id_estudiante,
    e.carne,
    e.nombre,
    e.apellido,
    aa.id_asignacion,
    asig.id_asignatura,
    asig.nombre AS asignatura_nombre,
    asig.codigo AS asignatura_codigo,
    g.id_grupo,
    g.grado,
    g.seccion,
    c.id_ciclo,
    c.anio AS ciclo_anio,
    d.id_docente,
    d.nombre AS docente_nombre,
    d.apellido AS docente_apellido,
    SUM(CASE WHEN a.estado = 'Presente' THEN 1 ELSE 0 END) AS presentes,
    SUM(CASE WHEN a.estado = 'Tarde' THEN 1 ELSE 0 END) AS tardes,
    SUM(CASE WHEN a.estado = 'Ausente' THEN 1 ELSE 0 END) AS ausentes,
    SUM(CASE WHEN a.estado = 'Justificado' THEN 1 ELSE 0 END) AS justificados,
    SUM(CASE WHEN s.estado = 'Cerrada' AND a.id_asistencia IS NULL
             THEN 1 ELSE 0 END) AS sin_registro
  FROM inscripciones i
  JOIN matriculas m ON m.id_matricula = i.id_matricula
  JOIN estudiantes e ON e.id_estudiante = m.id_estudiante
  JOIN asignaciones_academicas aa ON aa.id_asignacion = i.id_asignacion
  JOIN asignaturas asig ON asig.id_asignatura = aa.id_asignatura
  JOIN grupos g ON g.id_grupo = aa.id_grupo
  JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
  JOIN docentes d ON d.id_docente = aa.id_docente
  LEFT JOIN sesiones s
    ON s.id_asignacion = i.id_asignacion
   AND s.estado <> 'Cancelada'
   AND i.fecha_inscripcion <= s.fecha
   AND (i.fecha_retiro IS NULL OR i.fecha_retiro >= s.fecha)
   AND m.fecha_matricula <= s.fecha
   AND (m.fecha_retiro IS NULL OR m.fecha_retiro >= s.fecha)
  LEFT JOIN asistencias a
    ON a.id_sesion = s.id_sesion
   AND a.id_inscripcion = i.id_inscripcion
`

const CONTEOS = ['presentes', 'tardes', 'ausentes', 'justificados', 'sin_registro']

// Presente y Tarde cuentan como asistencia. Sin registros → null, nunca NaN.
export function calcularPorcentaje({ presentes, tardes, ausentes, justificados }) {
  const asistidas = presentes + tardes
  const base = asistidas + ausentes + (JUSTIFICADO_PENALIZA ? justificados : 0)
  return base > 0 ? Math.round((asistidas / base) * 100) : null
}

function conPorcentaje(fila) {
  const porcentaje = calcularPorcentaje(fila)
  return {
    ...fila,
    sesiones_registradas:
      fila.presentes + fila.tardes + fila.ausentes + fila.justificados,
    porcentaje,
    en_riesgo: porcentaje !== null && porcentaje < UMBRAL_RIESGO
  }
}

// Suma los conteos de varias filas y calcula el porcentaje del conjunto.
export function totalizar(filas) {
  const total = Object.fromEntries(CONTEOS.map((campo) => [campo, 0]))
  for (const fila of filas) {
    for (const campo of CONTEOS) total[campo] += fila[campo]
  }
  total.sesiones_registradas =
    total.presentes + total.tardes + total.ausentes + total.justificados
  total.porcentaje = calcularPorcentaje(total)
  return total
}

// Consulta las estadísticas aplicando la seguridad por rol.
// Administrador: todo. Docente: solo sus asignaciones académicas.
export function consultarEstadisticas(usuario, filtros = {}) {
  const condiciones = []
  const parametros = []

  if (usuario.rol === 'docente') {
    condiciones.push('aa.id_docente = ?')
    parametros.push(Number(usuario.id_docente))
  }

  const porFiltro = {
    id_ciclo: 'c.id_ciclo = ?',
    id_grupo: 'g.id_grupo = ?',
    id_asignacion: 'aa.id_asignacion = ?',
    id_estudiante: 'e.id_estudiante = ?'
  }
  for (const [campo, condicion] of Object.entries(porFiltro)) {
    if (filtros[campo] !== undefined) {
      condiciones.push(condicion)
      parametros.push(filtros[campo])
    }
  }
  if (filtros.soloActivas) condiciones.push(`i.estado = 'Activa'`)

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  return db.prepare(`
    ${SELECT_ESTADISTICAS}
    ${where}
    GROUP BY i.id_inscripcion
    ORDER BY c.anio DESC, asig.nombre, g.grado, g.seccion, e.apellido, e.nombre
  `).all(...parametros).map(conPorcentaje)
}

// Agrupa las filas por asignación académica con su porcentaje y alumnos en riesgo.
export function resumirPorAsignacion(filas) {
  const grupos = new Map()
  for (const fila of filas) {
    if (!grupos.has(fila.id_asignacion)) grupos.set(fila.id_asignacion, [])
    grupos.get(fila.id_asignacion).push(fila)
  }
  return [...grupos.values()].map((alumnos) => {
    const [primera] = alumnos
    return {
      id_asignacion: primera.id_asignacion,
      id_ciclo: primera.id_ciclo,
      ciclo_anio: primera.ciclo_anio,
      id_grupo: primera.id_grupo,
      grado: primera.grado,
      seccion: primera.seccion,
      id_asignatura: primera.id_asignatura,
      asignatura_nombre: primera.asignatura_nombre,
      asignatura_codigo: primera.asignatura_codigo,
      id_docente: primera.id_docente,
      docente_nombre: primera.docente_nombre,
      docente_apellido: primera.docente_apellido,
      estudiantes: alumnos.length,
      en_riesgo: alumnos.filter((alumno) =>
        alumno.inscripcion_estado === 'Activa' && alumno.en_riesgo).length,
      ...totalizar(alumnos)
    }
  })
}
