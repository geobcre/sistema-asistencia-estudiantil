import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

const UMBRAL_RIESGO = 75

function calcularPorcentaje(presentes, totalSesiones) {
  return totalSesiones > 0 ? Math.round((presentes / totalSesiones) * 100) : 0
}

// Una fila agregada por (estudiante, curso) inscrito, sin importar si tiene
// asistencias registradas. Filtra por curso y/o estudiante en una sola query,
// en vez de repetir un COUNT por cada alumno.
function statsPorEstudianteYCurso({ idCurso, idEstudiante } = {}) {
  let sql = `
    SELECT i.id_estudiante, i.id_curso,
           COUNT(DISTINCT s.id) AS totalSesiones,
           COUNT(DISTINCT CASE WHEN a.estado IN ('presente','tarde') THEN a.id_sesion END) AS presentes
    FROM inscripciones i
    JOIN sesiones s ON s.id_curso = i.id_curso
    LEFT JOIN asistencias a ON a.id_sesion = s.id AND a.id_estudiante = i.id_estudiante
    WHERE 1 = 1
  `
  const params = []
  if (idCurso) { sql += ' AND i.id_curso = ?'; params.push(idCurso) }
  if (idEstudiante) { sql += ' AND i.id_estudiante = ?'; params.push(idEstudiante) }
  sql += ' GROUP BY i.id_estudiante, i.id_curso'

  return db.prepare(sql).all(...params)
}

function estadisticasPorCurso(idCurso) {
  const curso = db.prepare('SELECT * FROM cursos WHERE id = ?').get(idCurso)
  if (!curso) return null

  const alumnos = db.prepare(`
    SELECT e.id, e.nombre, e.apellido
    FROM estudiantes e
    JOIN inscripciones i ON i.id_estudiante = e.id
    WHERE i.id_curso = ?
  `).all(idCurso)

  const stats = statsPorEstudianteYCurso({ idCurso })
  const statsPorAlumno = new Map(stats.map((s) => [s.id_estudiante, s]))

  const resultado = alumnos.map((est) => {
    const { totalSesiones = 0, presentes = 0 } = statsPorAlumno.get(est.id) ?? {}
    return { ...est, presentes, totalSesiones, porcentaje: calcularPorcentaje(presentes, totalSesiones) }
  })

  return { curso, alumnos: resultado }
}

// GET /api/estadisticas/curso/:id
router.get('/curso/:id', (req, res) => {
  const data = estadisticasPorCurso(req.params.id)
  if (!data) return res.status(404).json({ error: 'curso no encontrado' })
  res.json(data)
})

// GET /api/estadisticas/estudiante/:id  -> porcentaje global y por curso
router.get('/estudiante/:id', (req, res) => {
  const estudiante = db.prepare('SELECT * FROM estudiantes WHERE id = ?').get(req.params.id)
  if (!estudiante) return res.status(404).json({ error: 'estudiante no encontrado' })

  const cursos = db.prepare(`
    SELECT c.* FROM cursos c
    JOIN inscripciones i ON i.id_curso = c.id
    WHERE i.id_estudiante = ?
  `).all(req.params.id)

  const stats = statsPorEstudianteYCurso({ idEstudiante: req.params.id })
  const statsPorCurso = new Map(stats.map((s) => [s.id_curso, s]))

  const detalle = cursos.map((c) => {
    const { totalSesiones = 0, presentes = 0 } = statsPorCurso.get(c.id) ?? {}
    return { idCurso: c.id, nombre: c.nombre, porcentaje: calcularPorcentaje(presentes, totalSesiones) }
  })

  const promedioGlobal = detalle.length > 0
    ? Math.round(detalle.reduce((sum, d) => sum + d.porcentaje, 0) / detalle.length)
    : 0

  res.json({ idEstudiante: estudiante.id, nombre: `${estudiante.nombre} ${estudiante.apellido}`, porcentajeGlobal: promedioGlobal, cursos: detalle })
})

// GET /api/estadisticas/riesgo -> estudiantes bajo el umbral, en todos los cursos
router.get('/riesgo', (req, res) => {
  const cursos = db.prepare('SELECT * FROM cursos').all()
  const enRiesgo = []
  for (const curso of cursos) {
    const { alumnos } = estadisticasPorCurso(curso.id)
    alumnos
      .filter((a) => a.totalSesiones > 0 && a.porcentaje < UMBRAL_RIESGO)
      .forEach((a) => enRiesgo.push({ ...a, curso: curso.nombre, idCurso: curso.id }))
  }
  res.json(enRiesgo)
})

export default router
