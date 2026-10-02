import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()

// ======================================================
// GET /api/docentes
// Administrador y docente pueden consultar docentes
// ======================================================
router.get('/', (req, res) => {
  res.json(
    db.prepare(`
      SELECT *
      FROM docentes
      ORDER BY id
    `).all()
  )
})

// ======================================================
// POST /api/docentes
// Solo administrador
// ======================================================
router.post(
  '/',
  permitirRoles('administrador'),
  (req, res) => {
    const { nombre, apellido, correo } = req.body

    if (!nombre || !apellido) {
      return res.status(400).json({
        error: 'Nombre y apellido son requeridos.'
      })
    }

    const info = db.prepare(`
      INSERT INTO docentes (
        nombre,
        apellido,
        correo
      )
      VALUES (?, ?, ?)
    `).run(
      nombre.trim(),
      apellido.trim(),
      correo?.trim() || null
    )

    const docente = db.prepare(`
      SELECT *
      FROM docentes
      WHERE id = ?
    `).get(info.lastInsertRowid)

    res.status(201).json(docente)
  }
)

// ======================================================
// PUT /api/docentes/:id
// Solo administrador
// ======================================================
router.put(
  '/:id',
  permitirRoles('administrador'),
  (req, res) => {
    const { nombre, apellido, correo } = req.body

    if (!nombre || !apellido) {
      return res.status(400).json({
        error: 'Nombre y apellido son requeridos.'
      })
    }

    const existente = db.prepare(`
      SELECT id
      FROM docentes
      WHERE id = ?
    `).get(req.params.id)

    if (!existente) {
      return res.status(404).json({
        error: 'Docente no encontrado.'
      })
    }

    db.prepare(`
      UPDATE docentes
      SET
        nombre = ?,
        apellido = ?,
        correo = ?
      WHERE id = ?
    `).run(
      nombre.trim(),
      apellido.trim(),
      correo?.trim() || null,
      req.params.id
    )

    const docente = db.prepare(`
      SELECT *
      FROM docentes
      WHERE id = ?
    `).get(req.params.id)

    res.json(docente)
  }
)

// ======================================================
// DELETE /api/docentes/:id
// Solo administrador
// ======================================================
router.delete(
  '/:id',
  permitirRoles('administrador'),
  (req, res) => {
    const existente = db.prepare(`
      SELECT id
      FROM docentes
      WHERE id = ?
    `).get(req.params.id)

    if (!existente) {
      return res.status(404).json({
        error: 'Docente no encontrado.'
      })
    }

    db.prepare(`
      DELETE FROM docentes
      WHERE id = ?
    `).run(req.params.id)

    res.status(204).end()
  }
)

export default router