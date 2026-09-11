import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM docentes ORDER BY id').all())
})

router.post('/', (req, res) => {
  const { nombre, apellido, correo } = req.body
  if (!nombre || !apellido) return res.status(400).json({ error: 'nombre y apellido son requeridos' })
  const info = db.prepare('INSERT INTO docentes (nombre, apellido, correo) VALUES (?, ?, ?)').run(nombre, apellido, correo ?? null)
  res.status(201).json(db.prepare('SELECT * FROM docentes WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const { nombre, apellido, correo } = req.body
  db.prepare('UPDATE docentes SET nombre = ?, apellido = ?, correo = ? WHERE id = ?')
    .run(nombre, apellido, correo ?? null, req.params.id)
  res.json(db.prepare('SELECT * FROM docentes WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM docentes WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
