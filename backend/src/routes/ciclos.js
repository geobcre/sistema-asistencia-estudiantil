import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()
const estadosValidos = ['Planificado', 'Activo', 'Finalizado']

function buscarCiclo(id) {
  return db.prepare(`
    SELECT id_ciclo, anio, estado
    FROM ciclos_escolares
    WHERE id_ciclo = ?
  `).get(id)
}

function validar({ anio, estado }) {
  if (!Number.isInteger(Number(anio)) || Number(anio) < 1) {
    return 'El año debe ser un número entero válido.'
  }
  if (!estadosValidos.includes(estado)) {
    return 'El estado debe ser Planificado, Activo o Finalizado.'
  }
  return null
}

router.get('/', (req, res) => {
  res.json(db.prepare(`
    SELECT id_ciclo, anio, estado
    FROM ciclos_escolares
    ORDER BY anio DESC
  `).all())
})

router.get('/:id', (req, res) => {
  const ciclo = buscarCiclo(req.params.id)
  if (!ciclo) return res.status(404).json({ error: 'Ciclo escolar no encontrado.' })
  return res.json(ciclo)
})

router.post('/', permitirRoles('administrador'), (req, res) => {
  const { anio, estado = 'Planificado' } = req.body
  const error = validar({ anio, estado })
  if (error) return res.status(400).json({ error })

  try {
    const info = db.prepare(`
      INSERT INTO ciclos_escolares (anio, estado) VALUES (?, ?)
    `).run(Number(anio), estado)
    return res.status(201).json(buscarCiclo(info.lastInsertRowid))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe un ciclo escolar para ese año.' })
    }
    throw errorSql
  }
})

router.put('/:id', permitirRoles('administrador'), (req, res) => {
  if (!buscarCiclo(req.params.id)) {
    return res.status(404).json({ error: 'Ciclo escolar no encontrado.' })
  }

  const { anio, estado } = req.body
  const error = validar({ anio, estado })
  if (error) return res.status(400).json({ error })

  try {
    db.prepare(`
      UPDATE ciclos_escolares SET anio = ?, estado = ? WHERE id_ciclo = ?
    `).run(Number(anio), estado, req.params.id)
    return res.json(buscarCiclo(req.params.id))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe un ciclo escolar para ese año.' })
    }
    throw errorSql
  }
})

export default router
