import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()
const consultaGrupo = `
  SELECT g.id_grupo, g.grado, g.seccion, g.id_ciclo,
         c.anio AS ciclo_anio, c.estado AS ciclo_estado
  FROM grupos g
  JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
`

function buscarGrupo(id) {
  return db.prepare(`${consultaGrupo} WHERE g.id_grupo = ?`).get(id)
}

function validar({ grado, seccion, id_ciclo }) {
  if (!Number.isInteger(Number(grado)) || Number(grado) < 1) {
    return 'El grado debe ser un número entero válido.'
  }
  if (!seccion?.trim()) return 'La sección es obligatoria.'
  if (!Number.isInteger(Number(id_ciclo))) return 'El ciclo escolar es obligatorio.'
  if (!db.prepare('SELECT 1 FROM ciclos_escolares WHERE id_ciclo = ?').get(id_ciclo)) {
    return 'El ciclo escolar seleccionado no existe.'
  }
  return null
}

router.get('/', (req, res) => {
  res.json(db.prepare(`${consultaGrupo} ORDER BY c.anio DESC, g.grado, g.seccion`).all())
})

router.get('/:id', (req, res) => {
  const grupo = buscarGrupo(req.params.id)
  if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado.' })
  return res.json(grupo)
})

router.post('/', permitirRoles('administrador'), (req, res) => {
  const { grado, seccion, id_ciclo } = req.body
  const error = validar({ grado, seccion, id_ciclo })
  if (error) return res.status(400).json({ error })

  try {
    const info = db.prepare(`
      INSERT INTO grupos (grado, seccion, id_ciclo) VALUES (?, ?, ?)
    `).run(Number(grado), seccion.trim().toUpperCase(), Number(id_ciclo))
    return res.status(201).json(buscarGrupo(info.lastInsertRowid))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ese grupo ya existe dentro del ciclo escolar.' })
    }
    throw errorSql
  }
})

router.put('/:id', permitirRoles('administrador'), (req, res) => {
  if (!buscarGrupo(req.params.id)) return res.status(404).json({ error: 'Grupo no encontrado.' })
  const { grado, seccion, id_ciclo } = req.body
  const error = validar({ grado, seccion, id_ciclo })
  if (error) return res.status(400).json({ error })

  try {
    db.prepare(`
      UPDATE grupos SET grado = ?, seccion = ?, id_ciclo = ? WHERE id_grupo = ?
    `).run(Number(grado), seccion.trim().toUpperCase(), Number(id_ciclo), req.params.id)
    return res.json(buscarGrupo(req.params.id))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ese grupo ya existe dentro del ciclo escolar.' })
    }
    throw errorSql
  }
})

export default router
