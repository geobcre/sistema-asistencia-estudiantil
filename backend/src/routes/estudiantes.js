import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()

// ======================================================
// GET /api/estudiantes
// Administrador y docente pueden consultar estudiantes
// ======================================================
router.get('/', (req, res) => {
  res.json(
    db.prepare(`
      SELECT *
      FROM estudiantes
      ORDER BY id
    `).all()
  )
})

// ======================================================
// POST /api/estudiantes
// Solo administrador
// ======================================================
router.post(
  '/',
  permitirRoles('administrador'),
  (req, res) => {
    const { nombre, apellido, carne } = req.body

    if (!nombre || !apellido) {
      return res.status(400).json({
        error: 'Nombre y apellido son requeridos.'
      })
    }

    const info = db.prepare(`
      INSERT INTO estudiantes (
        nombre,
        apellido,
        carne
      )
      VALUES (?, ?, ?)
    `).run(
      nombre.trim(),
      apellido.trim(),
      carne?.trim() || null
    )

    const estudiante = db.prepare(`
      SELECT *
      FROM estudiantes
      WHERE id = ?
    `).get(info.lastInsertRowid)

    res.status(201).json(estudiante)
  }
)

// ======================================================
// PUT /api/estudiantes/:id
// Solo administrador
// ======================================================
router.put(
  '/:id',
  permitirRoles('administrador'),
  (req, res) => {
    const { nombre, apellido, carne } = req.body

    if (!nombre || !apellido) {
      return res.status(400).json({
        error: 'Nombre y apellido son requeridos.'
      })
    }

    const existente = db.prepare(`
      SELECT id
      FROM estudiantes
      WHERE id = ?
    `).get(req.params.id)

    if (!existente) {
      return res.status(404).json({
        error: 'Estudiante no encontrado.'
      })
    }

    db.prepare(`
      UPDATE estudiantes
      SET
        nombre = ?,
        apellido = ?,
        carne = ?
      WHERE id = ?
    `).run(
      nombre.trim(),
      apellido.trim(),
      carne?.trim() || null,
      req.params.id
    )

    const estudiante = db.prepare(`
      SELECT *
      FROM estudiantes
      WHERE id = ?
    `).get(req.params.id)

    res.json(estudiante)
  }
)

// ======================================================
// DELETE /api/estudiantes/:id
// Solo administrador
// ======================================================
router.delete(
  '/:id',
  permitirRoles('administrador'),
  (req, res) => {
    const existente = db.prepare(`
      SELECT id
      FROM estudiantes
      WHERE id = ?
    `).get(req.params.id)

    if (!existente) {
      return res.status(404).json({
        error: 'Estudiante no encontrado.'
      })
    }

    db.prepare(`
      DELETE FROM estudiantes
      WHERE id = ?
    `).run(req.params.id)

    res.status(204).end()
  }
)

// ======================================================
// GET /api/estudiantes/:id/asistencia
// Administrador y docente pueden consultar historial
// ======================================================
router.get('/:id/asistencia', (req, res) => {
  const estudiante = db.prepare(`
    SELECT id
    FROM estudiantes
    WHERE id = ?
  `).get(req.params.id)

  if (!estudiante) {
    return res.status(404).json({
      error: 'Estudiante no encontrado.'
    })
  }

  const registros = db.prepare(`
    SELECT
      a.id,
      a.estado,
      s.fecha,
      c.id AS id_curso,
      c.nombre AS curso
    FROM asistencias a
    JOIN sesiones s
      ON s.id = a.id_sesion
    JOIN cursos c
      ON c.id = s.id_curso
    WHERE a.id_estudiante = ?
    ORDER BY s.fecha DESC
  `).all(req.params.id)

  res.json(registros)
})

export default router