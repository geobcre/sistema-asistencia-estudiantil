import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()
const estadosValidos = ['Activo', 'Inactivo']

function normalizarCorreo(correo) {
  return correo?.trim().toLowerCase() || null
}

function validarDatos({ nombre, apellido, estado = 'Activo' }) {
  if (!nombre?.trim() || !apellido?.trim()) {
    return 'Nombre y apellido son requeridos.'
  }
  if (!estadosValidos.includes(estado)) {
    return 'El estado debe ser Activo o Inactivo.'
  }
  return null
}

function buscarDocente(id) {
  return db.prepare(`
    SELECT id_docente, nombre, apellido, correo, estado
    FROM docentes
    WHERE id_docente = ?
  `).get(id)
}

router.get('/', (req, res) => {
  const docentes = db.prepare(`
    SELECT id_docente, nombre, apellido, correo, estado
    FROM docentes
    ORDER BY id_docente
  `).all()
  res.json(docentes)
})

router.post('/', permitirRoles('administrador'), (req, res) => {
  const { nombre, apellido, correo, estado = 'Activo' } = req.body
  const error = validarDatos({ nombre, apellido, estado })
  if (error) return res.status(400).json({ error })

  try {
    const info = db.prepare(`
      INSERT INTO docentes (nombre, apellido, correo, estado)
      VALUES (?, ?, ?, ?)
    `).run(nombre.trim(), apellido.trim(), normalizarCorreo(correo), estado)

    return res.status(201).json(buscarDocente(info.lastInsertRowid))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe un docente con ese correo.' })
    }
    throw errorSql
  }
})

router.put('/:id', permitirRoles('administrador'), (req, res) => {
  const existente = buscarDocente(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Docente no encontrado.' })

  const { nombre, apellido, correo, estado = existente.estado } = req.body
  const error = validarDatos({ nombre, apellido, estado })
  if (error) return res.status(400).json({ error })

  try {
    db.prepare(`
      UPDATE docentes
      SET nombre = ?, apellido = ?, correo = ?, estado = ?
      WHERE id_docente = ?
    `).run(nombre.trim(), apellido.trim(), normalizarCorreo(correo), estado, req.params.id)

    return res.json(buscarDocente(req.params.id))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe un docente con ese correo.' })
    }
    throw errorSql
  }
})

router.delete('/:id', permitirRoles('administrador'), (req, res) => {
  if (!buscarDocente(req.params.id)) {
    return res.status(404).json({ error: 'Docente no encontrado.' })
  }

  db.prepare(`
    UPDATE docentes SET estado = 'Inactivo' WHERE id_docente = ?
  `).run(req.params.id)

  return res.json(buscarDocente(req.params.id))
})

export default router
