import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()
const estadosValidos = ['Activa', 'Inactiva']

function buscarAsignatura(id) {
  return db.prepare(`
    SELECT id_asignatura, nombre, codigo, estado
    FROM asignaturas WHERE id_asignatura = ?
  `).get(id)
}

function validar({ nombre, codigo, estado }) {
  if (!nombre?.trim() || !codigo?.trim()) return 'Nombre y código son obligatorios.'
  if (!estadosValidos.includes(estado)) return 'El estado debe ser Activa o Inactiva.'
  return null
}

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT id_asignatura, nombre, codigo, estado
    FROM asignaturas ORDER BY nombre
  `).all())
})

router.get('/:id', (req, res) => {
  const asignatura = buscarAsignatura(req.params.id)
  if (!asignatura) return res.status(404).json({ error: 'Asignatura no encontrada.' })
  return res.json(asignatura)
})

router.post('/', permitirRoles('administrador'), (req, res) => {
  const { nombre, codigo, estado = 'Activa' } = req.body
  const error = validar({ nombre, codigo, estado })
  if (error) return res.status(400).json({ error })

  try {
    const info = db.prepare(`
      INSERT INTO asignaturas (nombre, codigo, estado) VALUES (?, ?, ?)
    `).run(nombre.trim(), codigo.trim().toUpperCase(), estado)
    return res.status(201).json(buscarAsignatura(info.lastInsertRowid))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe una asignatura con ese código.' })
    }
    throw errorSql
  }
})

router.put('/:id', permitirRoles('administrador'), (req, res) => {
  const existente = buscarAsignatura(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Asignatura no encontrada.' })
  const { nombre, codigo, estado = existente.estado } = req.body
  const error = validar({ nombre, codigo, estado })
  if (error) return res.status(400).json({ error })

  try {
    db.prepare(`
      UPDATE asignaturas SET nombre = ?, codigo = ?, estado = ?
      WHERE id_asignatura = ?
    `).run(nombre.trim(), codigo.trim().toUpperCase(), estado, req.params.id)
    return res.json(buscarAsignatura(req.params.id))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe una asignatura con ese código.' })
    }
    throw errorSql
  }
})

router.delete('/:id', permitirRoles('administrador'), (req, res) => {
  if (!buscarAsignatura(req.params.id)) {
    return res.status(404).json({ error: 'Asignatura no encontrada.' })
  }
  db.prepare(`
    UPDATE asignaturas SET estado = 'Inactiva' WHERE id_asignatura = ?
  `).run(req.params.id)
  return res.json(buscarAsignatura(req.params.id))
})

export default router
