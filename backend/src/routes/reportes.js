import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

// GET /api/reportes?curso=1&desde=2026-01-01&hasta=2026-12-31&estudiante=3
router.get('/', (req, res) => {
  const { curso, desde, hasta, estudiante } = req.query

  let sql = `
    SELECT a.id, a.estado, s.fecha, c.id AS id_curso, c.nombre AS curso,
           e.id AS id_estudiante, e.nombre, e.apellido, e.carne
    FROM asistencias a
    JOIN sesiones s ON s.id = a.id_sesion
    JOIN cursos c ON c.id = s.id_curso
    JOIN estudiantes e ON e.id = a.id_estudiante
    WHERE 1 = 1
  `
  const params = []

  if (curso) { sql += ' AND c.id = ?'; params.push(curso) }
  if (estudiante) { sql += ' AND e.id = ?'; params.push(estudiante) }
  if (desde) { sql += ' AND s.fecha >= ?'; params.push(desde) }
  if (hasta) { sql += ' AND s.fecha <= ?'; params.push(hasta) }

  sql += ' ORDER BY s.fecha DESC'

  res.json(db.prepare(sql).all(...params))
})

export default router
