import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()
const estadosValidos = ['Activo', 'Inactivo']

function validarDatos({ carne, nombre, apellido, estado = 'Activo' }) {
  if (!carne?.trim()) return 'El carné es requerido.'
  if (!nombre?.trim() || !apellido?.trim()) return 'Nombre y apellido son requeridos.'
  if (!estadosValidos.includes(estado)) return 'El estado debe ser Activo o Inactivo.'
  return null
}

function buscarEstudiante(id) {
  return db.prepare(`
    SELECT id_estudiante, carne, nombre, apellido, estado
    FROM estudiantes
    WHERE id_estudiante = ?
  `).get(id)
}

router.get('/', (req, res) => {
  const estudiantes = db.prepare(`
    SELECT id_estudiante, carne, nombre, apellido, estado
    FROM estudiantes
    ORDER BY id_estudiante
  `).all()
  res.json(estudiantes)
})

router.post('/', permitirRoles('administrador'), (req, res) => {
  const { carne, nombre, apellido, estado = 'Activo' } = req.body
  const error = validarDatos({ carne, nombre, apellido, estado })
  if (error) return res.status(400).json({ error })

  try {
    const info = db.prepare(`
      INSERT INTO estudiantes (carne, nombre, apellido, estado)
      VALUES (?, ?, ?, ?)
    `).run(carne.trim(), nombre.trim(), apellido.trim(), estado)

    return res.status(201).json(buscarEstudiante(info.lastInsertRowid))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe un estudiante con ese carné.' })
    }
    throw errorSql
  }
})

router.put('/:id', permitirRoles('administrador'), (req, res) => {
  const existente = buscarEstudiante(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Estudiante no encontrado.' })

  const { carne, nombre, apellido, estado = existente.estado } = req.body
  const error = validarDatos({ carne, nombre, apellido, estado })
  if (error) return res.status(400).json({ error })

  try {
    db.prepare(`
      UPDATE estudiantes
      SET carne = ?, nombre = ?, apellido = ?, estado = ?
      WHERE id_estudiante = ?
    `).run(carne.trim(), nombre.trim(), apellido.trim(), estado, req.params.id)

    return res.json(buscarEstudiante(req.params.id))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe un estudiante con ese carné.' })
    }
    throw errorSql
  }
})

router.delete('/:id', permitirRoles('administrador'), (req, res) => {
  if (!buscarEstudiante(req.params.id)) {
    return res.status(404).json({ error: 'Estudiante no encontrado.' })
  }

  db.prepare(`
    UPDATE estudiantes SET estado = 'Inactivo' WHERE id_estudiante = ?
  `).run(req.params.id)

  return res.json(buscarEstudiante(req.params.id))
})

router.get('/:id/asistencia', (req, res) => {
  if (!buscarEstudiante(req.params.id)) {
    return res.status(404).json({ error: 'Estudiante no encontrado.' })
  }

  return res.status(501).json({
    error: 'El historial de asistencia está pendiente de adaptación al nuevo modelo académico.'
  })
})

export default router
