import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM cursos ORDER BY id').all())
})

router.post('/', (req, res) => {
  const { nombre, codigo, horario, idDocente } = req.body
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' })
  const info = db.prepare('INSERT INTO cursos (nombre, codigo, horario, id_docente) VALUES (?, ?, ?, ?)')
    .run(nombre, codigo ?? null, horario ?? null, idDocente ?? null)
  res.status(201).json(db.prepare('SELECT * FROM cursos WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const { nombre, codigo, horario, idDocente } = req.body
  db.prepare('UPDATE cursos SET nombre = ?, codigo = ?, horario = ?, id_docente = ? WHERE id = ?')
    .run(nombre, codigo ?? null, horario ?? null, idDocente ?? null, req.params.id)
  res.json(db.prepare('SELECT * FROM cursos WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM cursos WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// --- Inscripciones ---

router.get('/:id/estudiantes', (req, res) => {
  const estudiantes = db.prepare(`
    SELECT e.* FROM estudiantes e
    JOIN inscripciones i ON i.id_estudiante = e.id
    WHERE i.id_curso = ?
    ORDER BY e.id
  `).all(req.params.id)
  res.json(estudiantes)
})

router.post('/:id/inscripciones', (req, res) => {
  const { idEstudiante } = req.body
  try {
    db.prepare('INSERT INTO inscripciones (id_estudiante, id_curso) VALUES (?, ?)').run(idEstudiante, req.params.id)
  } catch (err) {
    // ya estaba inscrito (UNIQUE constraint) - lo tratamos como no-op
  }
  const estudiantes = db.prepare(`
    SELECT e.* FROM estudiantes e
    JOIN inscripciones i ON i.id_estudiante = e.id
    WHERE i.id_curso = ?
    ORDER BY e.id
  `).all(req.params.id)
  res.status(201).json(estudiantes)
})

router.delete('/:id/inscripciones/:idEstudiante', (req, res) => {
  db.prepare('DELETE FROM inscripciones WHERE id_curso = ? AND id_estudiante = ?')
    .run(req.params.id, req.params.idEstudiante)
  res.status(204).end()
})

// --- Sesiones de clase ---

router.get('/:id/sesiones', (req, res) => {
  res.json(db.prepare('SELECT * FROM sesiones WHERE id_curso = ? ORDER BY fecha').all(req.params.id))
})

// Crea la sesion si no existe para esa fecha, o devuelve la existente (ver diagrama de secuencia)
router.post('/:id/sesiones', (req, res) => {
  const { fecha } = req.body
  if (!fecha) return res.status(400).json({ error: 'fecha es requerida' })

  let sesion = db.prepare('SELECT * FROM sesiones WHERE id_curso = ? AND fecha = ?').get(req.params.id, fecha)
  if (!sesion) {
    const info = db.prepare('INSERT INTO sesiones (id_curso, fecha) VALUES (?, ?)').run(req.params.id, fecha)
    sesion = db.prepare('SELECT * FROM sesiones WHERE id = ?').get(info.lastInsertRowid)
  }
  res.status(201).json(sesion)
})

export default router
