import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

const UMBRAL_RIESGO = 75

function estadisticasPorCurso(idCurso) {
  const curso = db.prepare('SELECT * FROM cursos WHERE id = ?').get(idCurso)
  if (!curso) return null

  const totalSesiones = db.prepare('SELECT COUNT(*) AS n FROM sesiones WHERE id_curso = ?').get(idCurso).n

  const alumnos = db.prepare(`
    SELECT e.id, e.nombre, e.apellido
    FROM estudiantes e
    JOIN inscripciones i ON i.id_estudiante = e.id
    WHERE i.id_curso = ?
  `).all(idCurso)

  const resultado = alumnos.map((est) => {
    const presentes = db.prepare(`
      SELECT COUNT(*) AS n FROM asistencias a
      JOIN sesiones s ON s.id = a.id_sesion
      WHERE s.id_curso = ? AND a.id_estudiante = ? AND a.estado IN ('presente','tarde')
    `).get(idCurso, est.id).n

    const porcentaje = totalSesiones > 0 ? Math.round((presentes / totalSesiones) * 100) : 0
    return { ...est, presentes, totalSesiones, porcentaje }
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

  const detalle = cursos.map((c) => {
    const totalSesiones = db.prepare('SELECT COUNT(*) AS n FROM sesiones WHERE id_curso = ?').get(c.id).n
    const presentes = db.prepare(`
      SELECT COUNT(*) AS n FROM asistencias a
      JOIN sesiones s ON s.id = a.id_sesion
      WHERE s.id_curso = ? AND a.id_estudiante = ? AND a.estado IN ('presente','tarde')
    `).get(c.id, req.params.id).n
    const porcentaje = totalSesiones > 0 ? Math.round((presentes / totalSesiones) * 100) : 0
    return { idCurso: c.id, nombre: c.nombre, porcentaje }
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
