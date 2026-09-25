import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM estudiantes ORDER BY id').all())
})

router.post('/', (req, res) => {
  const { nombre, apellido, carne } = req.body
  if (!nombre || !apellido) return res.status(400).json({ error: 'nombre y apellido son requeridos' })
  const info = db.prepare('INSERT INTO estudiantes (nombre, apellido, carne) VALUES (?, ?, ?)').run(nombre, apellido, carne ?? null)
  res.status(201).json(db.prepare('SELECT * FROM estudiantes WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const { nombre, apellido, carne } = req.body
  db.prepare('UPDATE estudiantes SET nombre = ?, apellido = ?, carne = ? WHERE id = ?')
    .run(nombre, apellido, carne ?? null, req.params.id)
  res.json(db.prepare('SELECT * FROM estudiantes WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM estudiantes WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// Historial de asistencia de un estudiante especifico
router.get('/:id/asistencia', (req, res) => {
  const registros = db.prepare(`
    SELECT a.id, a.estado, s.fecha, c.id AS id_curso, c.nombre AS curso
    FROM asistencias a
    JOIN sesiones s ON s.id = a.id_sesion
    JOIN cursos c ON c.id = s.id_curso
    WHERE a.id_estudiante = ?
    ORDER BY s.fecha DESC
  `).all(req.params.id)
  res.json(registros)
})

export default router
