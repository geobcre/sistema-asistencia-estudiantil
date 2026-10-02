import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()
router.use(permitirRoles('administrador'))

const consultaMatricula = `
  SELECT
    m.id_matricula,
    m.id_estudiante,
    m.id_grupo,
    m.fecha_matricula,
    m.fecha_retiro,
    m.estado,
    e.carne,
    e.nombre AS estudiante_nombre,
    e.apellido AS estudiante_apellido,
    e.estado AS estudiante_estado,
    g.grado,
    g.seccion,
    c.id_ciclo,
    c.anio AS ciclo_anio,
    c.estado AS ciclo_estado
  FROM matriculas m
  JOIN estudiantes e ON e.id_estudiante = m.id_estudiante
  JOIN grupos g ON g.id_grupo = m.id_grupo
  JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
`

function obtenerMatricula(id) {
  return db.prepare(`${consultaMatricula} WHERE m.id_matricula = ?`).get(id)
}

function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false
  const fechaUtc = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(fechaUtc.getTime())
    && fechaUtc.toISOString().slice(0, 10) === fecha
}

function validarMatricula({ id_estudiante, id_grupo, fecha_matricula }, excluirId = null) {
  if (!Number.isInteger(Number(id_estudiante))) return 'El estudiante es obligatorio.'
  if (!Number.isInteger(Number(id_grupo))) return 'El grupo es obligatorio.'
  if (!fechaValida(fecha_matricula)) return 'La fecha de matrícula no es válida.'

  const estudiante = db.prepare(`
    SELECT estado FROM estudiantes WHERE id_estudiante = ?
  `).get(id_estudiante)
  if (!estudiante) return 'El estudiante seleccionado no existe.'
  if (estudiante.estado !== 'Activo') return 'El estudiante seleccionado está inactivo.'

  const grupo = db.prepare(`
    SELECT g.id_ciclo, c.estado AS ciclo_estado
    FROM grupos g
    JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
    WHERE g.id_grupo = ?
  `).get(id_grupo)
  if (!grupo) return 'El grupo seleccionado no existe.'
  if (grupo.ciclo_estado === 'Finalizado') {
    return 'No se puede matricular en un ciclo finalizado.'
  }

  const activa = db.prepare(`
    SELECT m.id_matricula
    FROM matriculas m
    JOIN grupos g ON g.id_grupo = m.id_grupo
    WHERE m.id_estudiante = ?
      AND g.id_ciclo = ?
      AND m.estado = 'Activa'
      AND (? IS NULL OR m.id_matricula <> ?)
  `).get(id_estudiante, grupo.id_ciclo, excluirId, excluirId)
  if (activa) return 'El estudiante ya tiene una matrícula activa en este ciclo escolar.'

  return null
}

router.get('/', (req, res) => {
  res.json(db.prepare(`${consultaMatricula} ORDER BY c.anio DESC, e.apellido, e.nombre`).all())
})

router.get('/:id', (req, res) => {
  const matricula = obtenerMatricula(req.params.id)
  if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada.' })
  return res.json(matricula)
})

router.post('/', (req, res) => {
  const datos = {
    id_estudiante: req.body.id_estudiante,
    id_grupo: req.body.id_grupo,
    fecha_matricula: req.body.fecha_matricula,
  }
  const error = validarMatricula(datos)
  if (error) return res.status(400).json({ error })

  const info = db.prepare(`
    INSERT INTO matriculas
      (id_estudiante, id_grupo, fecha_matricula, fecha_retiro, estado)
    VALUES (?, ?, ?, NULL, 'Activa')
  `).run(Number(datos.id_estudiante), Number(datos.id_grupo), datos.fecha_matricula)
  return res.status(201).json(obtenerMatricula(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const existente = obtenerMatricula(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Matrícula no encontrada.' })
  if (existente.estado === 'Retirada') {
    return res.status(409).json({ error: 'Una matrícula retirada no puede modificarse.' })
  }

  const datos = {
    id_estudiante: req.body.id_estudiante,
    id_grupo: req.body.id_grupo,
    fecha_matricula: req.body.fecha_matricula,
  }
  const error = validarMatricula(datos, Number(req.params.id))
  if (error) return res.status(400).json({ error })

  const tieneInscripciones = db.prepare(`
    SELECT 1 FROM inscripciones WHERE id_matricula = ? LIMIT 1
  `).get(req.params.id)
  if (tieneInscripciones && Number(datos.id_estudiante) !== existente.id_estudiante) {
    return res.status(409).json({
      error: 'No se puede cambiar el estudiante de una matrícula con inscripciones.'
    })
  }

  const grupoIncompatible = db.prepare(`
    SELECT 1
    FROM inscripciones i
    JOIN asignaciones_academicas aa ON aa.id_asignacion = i.id_asignacion
    WHERE i.id_matricula = ?
      AND i.estado = 'Activa'
      AND aa.id_grupo <> ?
    LIMIT 1
  `).get(req.params.id, datos.id_grupo)
  if (grupoIncompatible) {
    return res.status(409).json({
      error: 'El nuevo grupo no coincide con las inscripciones activas de la matrícula.'
    })
  }

  db.prepare(`
    UPDATE matriculas
    SET id_estudiante = ?, id_grupo = ?, fecha_matricula = ?
    WHERE id_matricula = ?
  `).run(Number(datos.id_estudiante), Number(datos.id_grupo), datos.fecha_matricula, req.params.id)
  return res.json(obtenerMatricula(req.params.id))
})

router.delete('/:id', (req, res) => {
  const existente = obtenerMatricula(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Matrícula no encontrada.' })
  if (existente.estado === 'Retirada') return res.json(existente)

  const fechaRetiro = req.body.fecha_retiro || new Date().toISOString().slice(0, 10)
  if (!fechaValida(fechaRetiro) || fechaRetiro < existente.fecha_matricula) {
    return res.status(400).json({ error: 'La fecha de retiro no es válida.' })
  }

  const posterior = db.prepare(`
    SELECT 1 FROM inscripciones
    WHERE id_matricula = ? AND estado = 'Activa' AND fecha_inscripcion > ?
  `).get(req.params.id, fechaRetiro)
  if (posterior) {
    return res.status(400).json({
      error: 'La fecha de retiro no puede ser anterior a una inscripción activa.'
    })
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE inscripciones
      SET estado = 'Retirada', fecha_retiro = ?
      WHERE id_matricula = ? AND estado = 'Activa'
    `).run(fechaRetiro, req.params.id)
    db.prepare(`
      UPDATE matriculas SET estado = 'Retirada', fecha_retiro = ?
      WHERE id_matricula = ?
    `).run(fechaRetiro, req.params.id)
  })()

  return res.json(obtenerMatricula(req.params.id))
})

export default router
