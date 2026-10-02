import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'
import { usuarioPuedeAccederAsignacion } from '../middleware/asignaciones.js'

const router = Router()

const consultaInscripcion = `
  SELECT
    i.id_inscripcion,
    i.id_matricula,
    i.id_asignacion,
    i.fecha_inscripcion,
    i.fecha_retiro,
    i.estado,
    e.id_estudiante,
    e.carne,
    e.nombre AS estudiante_nombre,
    e.apellido AS estudiante_apellido,
    a.id_asignatura,
    a.nombre AS asignatura_nombre,
    a.codigo AS asignatura_codigo,
    aa.id_docente,
    d.nombre AS docente_nombre,
    d.apellido AS docente_apellido,
    g.id_grupo,
    g.grado,
    g.seccion,
    c.id_ciclo,
    c.anio AS ciclo_anio,
    c.estado AS ciclo_estado
  FROM inscripciones i
  JOIN matriculas m ON m.id_matricula = i.id_matricula
  JOIN estudiantes e ON e.id_estudiante = m.id_estudiante
  JOIN asignaciones_academicas aa ON aa.id_asignacion = i.id_asignacion
  JOIN asignaturas a ON a.id_asignatura = aa.id_asignatura
  JOIN docentes d ON d.id_docente = aa.id_docente
  JOIN grupos g ON g.id_grupo = aa.id_grupo
  JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
`

function obtenerInscripcion(id) {
  return db.prepare(`${consultaInscripcion} WHERE i.id_inscripcion = ?`).get(id)
}

function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false
  const fechaUtc = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(fechaUtc.getTime())
    && fechaUtc.toISOString().slice(0, 10) === fecha
}

function validarInscripcion({ id_matricula, id_asignacion, fecha_inscripcion }) {
  if (!Number.isInteger(Number(id_matricula))) return 'La matrícula es obligatoria.'
  if (!Number.isInteger(Number(id_asignacion))) return 'La asignación académica es obligatoria.'
  if (!fechaValida(fecha_inscripcion)) return 'La fecha de inscripción no es válida.'

  const matricula = db.prepare(`
    SELECT id_grupo, fecha_matricula, estado
    FROM matriculas WHERE id_matricula = ?
  `).get(id_matricula)
  if (!matricula) return 'La matrícula seleccionada no existe.'
  if (matricula.estado !== 'Activa') return 'La matrícula seleccionada está retirada.'
  if (fecha_inscripcion < matricula.fecha_matricula) {
    return 'La inscripción no puede ser anterior a la matrícula.'
  }

  const asignacion = db.prepare(`
    SELECT id_grupo, estado
    FROM asignaciones_academicas WHERE id_asignacion = ?
  `).get(id_asignacion)
  if (!asignacion) return 'La asignación académica seleccionada no existe.'
  if (asignacion.estado !== 'Activa') return 'La asignación académica está inactiva.'
  if (Number(matricula.id_grupo) !== Number(asignacion.id_grupo)) {
    return 'La matrícula y la asignación académica deben pertenecer al mismo grupo.'
  }
  return null
}

router.get('/', (req, res) => {
  if (req.usuario.rol === 'administrador') {
    return res.json(db.prepare(`${consultaInscripcion} ORDER BY c.anio DESC, e.apellido`).all())
  }
  if (req.usuario.rol === 'docente' && req.usuario.id_docente) {
    return res.json(db.prepare(`
      ${consultaInscripcion}
      WHERE aa.id_docente = ?
      ORDER BY c.anio DESC, e.apellido
    `).all(req.usuario.id_docente))
  }
  return res.status(403).json({ error: 'No tiene acceso a las inscripciones.' })
})

router.get('/:id', (req, res) => {
  const inscripcion = obtenerInscripcion(req.params.id)
  if (!inscripcion) return res.status(404).json({ error: 'Inscripción no encontrada.' })
  if (!usuarioPuedeAccederAsignacion(req.usuario, inscripcion)) {
    return res.status(403).json({ error: 'No tiene acceso a esta inscripción.' })
  }
  return res.json(inscripcion)
})

router.post('/', permitirRoles('administrador'), (req, res) => {
  const datos = {
    id_matricula: req.body.id_matricula,
    id_asignacion: req.body.id_asignacion,
    fecha_inscripcion: req.body.fecha_inscripcion,
  }
  const error = validarInscripcion(datos)
  if (error) return res.status(400).json({ error })

  const existente = db.prepare(`
    SELECT id_inscripcion, estado
    FROM inscripciones
    WHERE id_matricula = ? AND id_asignacion = ?
  `).get(datos.id_matricula, datos.id_asignacion)

  if (existente?.estado === 'Activa') {
    return res.status(409).json({ error: 'La inscripción ya se encuentra activa.' })
  }
  if (existente) {
    db.prepare(`
      UPDATE inscripciones
      SET fecha_inscripcion = ?, fecha_retiro = NULL, estado = 'Activa'
      WHERE id_inscripcion = ?
    `).run(datos.fecha_inscripcion, existente.id_inscripcion)
    return res.json(obtenerInscripcion(existente.id_inscripcion))
  }

  const info = db.prepare(`
    INSERT INTO inscripciones
      (id_matricula, id_asignacion, fecha_inscripcion, fecha_retiro, estado)
    VALUES (?, ?, ?, NULL, 'Activa')
  `).run(Number(datos.id_matricula), Number(datos.id_asignacion), datos.fecha_inscripcion)
  return res.status(201).json(obtenerInscripcion(info.lastInsertRowid))
})

router.put('/:id', permitirRoles('administrador'), (req, res) => {
  const existente = obtenerInscripcion(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Inscripción no encontrada.' })
  if (existente.estado === 'Retirada') {
    return res.status(409).json({
      error: 'Para reactivar una inscripción retirada debe solicitarla nuevamente.'
    })
  }

  const datos = {
    id_matricula: req.body.id_matricula,
    id_asignacion: req.body.id_asignacion,
    fecha_inscripcion: req.body.fecha_inscripcion,
  }
  const error = validarInscripcion(datos)
  if (error) return res.status(400).json({ error })

  const tieneAsistencias = db.prepare(`
    SELECT 1 FROM asistencias WHERE id_inscripcion = ? LIMIT 1
  `).get(req.params.id)
  const cambiaRelacion = Number(datos.id_matricula) !== existente.id_matricula
    || Number(datos.id_asignacion) !== existente.id_asignacion
  if (tieneAsistencias && cambiaRelacion) {
    return res.status(409).json({
      error: 'No se pueden cambiar las relaciones de una inscripción con asistencias.'
    })
  }

  const duplicada = db.prepare(`
    SELECT 1 FROM inscripciones
    WHERE id_matricula = ? AND id_asignacion = ? AND id_inscripcion <> ?
  `).get(datos.id_matricula, datos.id_asignacion, req.params.id)
  if (duplicada) return res.status(409).json({ error: 'Esa inscripción ya existe.' })

  db.prepare(`
    UPDATE inscripciones
    SET id_matricula = ?, id_asignacion = ?, fecha_inscripcion = ?
    WHERE id_inscripcion = ?
  `).run(Number(datos.id_matricula), Number(datos.id_asignacion), datos.fecha_inscripcion, req.params.id)
  return res.json(obtenerInscripcion(req.params.id))
})

router.delete('/:id', permitirRoles('administrador'), (req, res) => {
  const existente = obtenerInscripcion(req.params.id)
  if (!existente) return res.status(404).json({ error: 'Inscripción no encontrada.' })
  if (existente.estado === 'Retirada') return res.json(existente)

  const fechaRetiro = req.body.fecha_retiro || new Date().toISOString().slice(0, 10)
  if (!fechaValida(fechaRetiro) || fechaRetiro < existente.fecha_inscripcion) {
    return res.status(400).json({ error: 'La fecha de retiro no es válida.' })
  }
  db.prepare(`
    UPDATE inscripciones SET estado = 'Retirada', fecha_retiro = ?
    WHERE id_inscripcion = ?
  `).run(fechaRetiro, req.params.id)
  return res.json(obtenerInscripcion(req.params.id))
})

export default router
