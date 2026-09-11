import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/:id/asistencia', (req, res) => {
  const registros = db.prepare(`
    SELECT a.*, e.nombre, e.apellido
    FROM asistencias a
    JOIN estudiantes e ON e.id = a.id_estudiante
    WHERE a.id_sesion = ?
  `).all(req.params.id)
  res.json(registros)
})

// Registra o actualiza el estado de un estudiante en una sesion (upsert)
router.post('/:id/asistencia', (req, res) => {
  const { idEstudiante, estado } = req.body
  const validos = ['presente', 'ausente', 'tarde', 'justificado']
  if (!validos.includes(estado)) return res.status(400).json({ error: 'estado invalido' })

  db.prepare(`
    INSERT INTO asistencias (id_sesion, id_estudiante, estado)
    VALUES (?, ?, ?)
    ON CONFLICT(id_sesion, id_estudiante) DO UPDATE SET estado = excluded.estado
  `).run(req.params.id, idEstudiante, estado)

  const registro = db.prepare('SELECT * FROM asistencias WHERE id_sesion = ? AND id_estudiante = ?')
    .get(req.params.id, idEstudiante)
  res.status(201).json(registro)
})

export default router
