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

  let filtroDocente = ''
  const parametros = [req.params.id]

  if (req.usuario.rol === 'docente') {
    if (!req.usuario.id_docente) return res.json([])
    filtroDocente = 'AND aa.id_docente = ?'
    parametros.push(req.usuario.id_docente)
  } else if (req.usuario.rol !== 'administrador') {
    return res.status(403).json({ error: 'No tiene acceso al historial de asistencia.' })
  }

  const historial = db.prepare(`
    SELECT
      a.id_asistencia,
      a.estado,
      s.id_sesion,
      s.fecha,
      s.estado AS sesion_estado,
      i.id_inscripcion,
      aa.id_asignacion,
      asig.id_asignatura,
      asig.nombre AS asignatura_nombre,
      asig.codigo AS asignatura_codigo,
      g.id_grupo,
      g.grado,
      g.seccion,
      c.id_ciclo,
      c.anio AS ciclo_anio,
      d.id_docente,
      d.nombre AS docente_nombre,
      d.apellido AS docente_apellido
    FROM estudiantes e
    JOIN matriculas m ON m.id_estudiante = e.id_estudiante
    JOIN inscripciones i ON i.id_matricula = m.id_matricula
    JOIN asistencias a ON a.id_inscripcion = i.id_inscripcion
    JOIN sesiones s ON s.id_sesion = a.id_sesion
    JOIN asignaciones_academicas aa ON aa.id_asignacion = s.id_asignacion
    JOIN asignaturas asig ON asig.id_asignatura = aa.id_asignatura
    JOIN grupos g ON g.id_grupo = aa.id_grupo
    JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
    JOIN docentes d ON d.id_docente = aa.id_docente
    WHERE e.id_estudiante = ?
      AND s.estado <> 'Cancelada'
      ${filtroDocente}
    ORDER BY s.fecha DESC, asig.nombre
  `).all(...parametros)

  return res.json(historial)
})

export default router
