import { Router } from 'express'
import { db } from '../db.js'
import { usuarioPuedeAccederAsignacion } from '../middleware/asignaciones.js'

const router = Router()
const estadosAsistencia = ['Presente', 'Ausente', 'Tarde', 'Justificado']

const consultaSesion = `
  SELECT
    s.id_sesion,
    s.id_asignacion,
    s.fecha,
    s.estado,
    aa.id_docente,
    aa.fecha_inicio,
    aa.fecha_fin,
    aa.estado AS asignacion_estado,
    a.id_asignatura,
    a.nombre AS asignatura_nombre,
    a.codigo AS asignatura_codigo,
    d.nombre AS docente_nombre,
    d.apellido AS docente_apellido,
    g.id_grupo,
    g.grado,
    g.seccion,
    c.id_ciclo,
    c.anio AS ciclo_anio
  FROM sesiones s
  JOIN asignaciones_academicas aa ON aa.id_asignacion = s.id_asignacion
  JOIN asignaturas a ON a.id_asignatura = aa.id_asignatura
  JOIN docentes d ON d.id_docente = aa.id_docente
  JOIN grupos g ON g.id_grupo = aa.id_grupo
  JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
`

function obtenerSesion(id) {
  return db.prepare(`${consultaSesion} WHERE s.id_sesion = ?`).get(id)
}

function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false
  const valor = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha
}

function autorizarSesion(req, res) {
  const sesion = obtenerSesion(req.params.id)
  if (!sesion) {
    res.status(404).json({ error: 'Sesión no encontrada.' })
    return null
  }
  if (!usuarioPuedeAccederAsignacion(req.usuario, sesion)) {
    res.status(403).json({ error: 'No tiene acceso a esta sesión.' })
    return null
  }
  return sesion
}

function estudiantesEsperados(idSesion) {
  return db.prepare(`
    SELECT
      i.id_inscripcion,
      e.id_estudiante,
      e.carne,
      e.nombre,
      e.apellido,
      a.id_asistencia,
      COALESCE(a.estado, 'Pendiente') AS estado
    FROM sesiones s
    JOIN inscripciones i ON i.id_asignacion = s.id_asignacion
    JOIN matriculas m ON m.id_matricula = i.id_matricula
    JOIN estudiantes e ON e.id_estudiante = m.id_estudiante
    LEFT JOIN asistencias a
      ON a.id_sesion = s.id_sesion AND a.id_inscripcion = i.id_inscripcion
    WHERE s.id_sesion = ?
      AND s.estado <> 'Cancelada'
      AND i.fecha_inscripcion <= s.fecha
      AND (i.fecha_retiro IS NULL OR i.fecha_retiro >= s.fecha)
      AND m.fecha_matricula <= s.fecha
      AND (m.fecha_retiro IS NULL OR m.fecha_retiro >= s.fecha)
    ORDER BY e.apellido, e.nombre
  `).all(idSesion)
}

function contarPendientes(idSesion) {
  return estudiantesEsperados(idSesion).filter((registro) => registro.estado === 'Pendiente').length
}

router.get('/', (req, res) => {
  if (req.usuario.rol === 'administrador') {
    return res.json(db.prepare(`${consultaSesion} ORDER BY s.fecha DESC, s.id_sesion`).all())
  }
  if (req.usuario.rol === 'docente' && req.usuario.id_docente) {
    return res.json(db.prepare(`
      ${consultaSesion}
      WHERE aa.id_docente = ?
      ORDER BY s.fecha DESC, s.id_sesion
    `).all(req.usuario.id_docente))
  }
  return res.status(403).json({ error: 'No tiene acceso a las sesiones.' })
})

router.get('/:id', (req, res) => {
  const sesion = autorizarSesion(req, res)
  if (!sesion) return
  return res.json(sesion)
})

router.post('/', (req, res) => {
  const { id_asignacion, fecha, estado = 'Abierta' } = req.body
  if (!Number.isInteger(Number(id_asignacion))) {
    return res.status(400).json({ error: 'La asignación académica es obligatoria.' })
  }
  if (!fechaValida(fecha)) return res.status(400).json({ error: 'La fecha no es válida.' })
  if (estado !== 'Abierta') {
    return res.status(400).json({ error: 'Una sesión nueva debe iniciar Abierta.' })
  }

  const asignacion = db.prepare(`
    SELECT id_asignacion, id_docente, fecha_inicio, fecha_fin, estado
    FROM asignaciones_academicas WHERE id_asignacion = ?
  `).get(id_asignacion)
  if (!asignacion) return res.status(400).json({ error: 'La asignación académica no existe.' })
  if (!usuarioPuedeAccederAsignacion(req.usuario, asignacion)) {
    return res.status(403).json({ error: 'No tiene acceso a esta asignación académica.' })
  }
  if (asignacion.estado !== 'Activa') {
    return res.status(400).json({ error: 'La asignación académica está inactiva.' })
  }
  if (fecha < asignacion.fecha_inicio || (asignacion.fecha_fin && fecha > asignacion.fecha_fin)) {
    return res.status(400).json({ error: 'La fecha está fuera del período de la asignación.' })
  }

  try {
    const info = db.prepare(`
      INSERT INTO sesiones (id_asignacion, fecha, estado) VALUES (?, ?, 'Abierta')
    `).run(Number(id_asignacion), fecha)
    return res.status(201).json(obtenerSesion(info.lastInsertRowid))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe una sesión para esa asignación y fecha.' })
    }
    throw errorSql
  }
})

router.put('/:id', (req, res) => {
  const sesion = autorizarSesion(req, res)
  if (!sesion) return
  if (sesion.estado !== 'Abierta') {
    return res.status(409).json({ error: 'Una sesión cerrada o cancelada no puede modificarse.' })
  }

  const fecha = req.body.fecha || sesion.fecha
  const estado = req.body.estado || sesion.estado
  if (!fechaValida(fecha)) return res.status(400).json({ error: 'La fecha no es válida.' })
  if (!['Abierta', 'Cerrada'].includes(estado)) {
    return res.status(400).json({ error: 'El estado debe ser Abierta o Cerrada.' })
  }
  if (fecha < sesion.fecha_inicio || (sesion.fecha_fin && fecha > sesion.fecha_fin)) {
    return res.status(400).json({ error: 'La fecha está fuera del período de la asignación.' })
  }
  if (fecha !== sesion.fecha) {
    const tieneAsistencias = db.prepare(`
      SELECT 1 FROM asistencias WHERE id_sesion = ? LIMIT 1
    `).get(req.params.id)
    if (tieneAsistencias) {
      return res.status(409).json({ error: 'No se puede cambiar la fecha de una sesión con asistencias.' })
    }
  }
  if (estado === 'Cerrada' && fecha !== sesion.fecha) {
    return res.status(400).json({ error: 'Actualice la fecha antes de cerrar la sesión.' })
  }
  if (estado === 'Cerrada' && contarPendientes(req.params.id) > 0) {
    return res.status(409).json({ error: 'No se puede cerrar la sesión mientras existan asistencias pendientes.' })
  }

  try {
    db.prepare(`
      UPDATE sesiones SET fecha = ?, estado = ? WHERE id_sesion = ?
    `).run(fecha, estado, req.params.id)
    return res.json(obtenerSesion(req.params.id))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe una sesión para esa asignación y fecha.' })
    }
    throw errorSql
  }
})

router.delete('/:id', (req, res) => {
  const sesion = autorizarSesion(req, res)
  if (!sesion) return
  if (sesion.estado === 'Cerrada') {
    return res.status(409).json({ error: 'Una sesión cerrada no puede cancelarse.' })
  }
  if (sesion.estado !== 'Cancelada') {
    db.prepare(`UPDATE sesiones SET estado = 'Cancelada' WHERE id_sesion = ?`).run(req.params.id)
  }
  return res.json(obtenerSesion(req.params.id))
})

router.get('/:id/asistencia', (req, res) => {
  const sesion = autorizarSesion(req, res)
  if (!sesion) return
  return res.json(estudiantesEsperados(req.params.id))
})

router.post('/:id/asistencia', (req, res) => {
  const sesion = autorizarSesion(req, res)
  if (!sesion) return
  if (sesion.estado !== 'Abierta') {
    return res.status(409).json({ error: 'Solo se puede registrar asistencia en una sesión abierta.' })
  }

  const { id_inscripcion, estado } = req.body
  if (!Number.isInteger(Number(id_inscripcion))) {
    return res.status(400).json({ error: 'La inscripción es obligatoria.' })
  }
  if (!estadosAsistencia.includes(estado)) {
    return res.status(400).json({ error: 'Estado de asistencia inválido.' })
  }

  const inscripcion = db.prepare(`
    SELECT
      i.id_inscripcion,
      i.id_asignacion,
      i.fecha_inscripcion,
      i.fecha_retiro,
      m.fecha_matricula,
      m.fecha_retiro AS matricula_fecha_retiro
    FROM inscripciones i
    JOIN matriculas m ON m.id_matricula = i.id_matricula
    WHERE i.id_inscripcion = ?
  `).get(id_inscripcion)
  if (!inscripcion) return res.status(400).json({ error: 'La inscripción no existe.' })
  if (Number(inscripcion.id_asignacion) !== Number(sesion.id_asignacion)) {
    return res.status(400).json({ error: 'La inscripción pertenece a otra asignación académica.' })
  }

  const fecha = sesion.fecha
  const inscripcionValida = inscripcion.fecha_inscripcion <= fecha
    && (!inscripcion.fecha_retiro || inscripcion.fecha_retiro >= fecha)
  const matriculaValida = inscripcion.fecha_matricula <= fecha
    && (!inscripcion.matricula_fecha_retiro || inscripcion.matricula_fecha_retiro >= fecha)
  if (!inscripcionValida || !matriculaValida) {
    return res.status(400).json({ error: 'La inscripción o matrícula no era válida en la fecha de la sesión.' })
  }

  const existente = db.prepare(`
    SELECT id_asistencia FROM asistencias
    WHERE id_sesion = ? AND id_inscripcion = ?
  `).get(req.params.id, id_inscripcion)
  db.prepare(`
    INSERT INTO asistencias (id_sesion, id_inscripcion, estado)
    VALUES (?, ?, ?)
    ON CONFLICT(id_sesion, id_inscripcion)
    DO UPDATE SET estado = excluded.estado
  `).run(req.params.id, Number(id_inscripcion), estado)

  const registro = db.prepare(`
    SELECT a.id_asistencia, a.id_sesion, a.id_inscripcion, a.estado,
           e.id_estudiante, e.carne, e.nombre, e.apellido
    FROM asistencias a
    JOIN inscripciones i ON i.id_inscripcion = a.id_inscripcion
    JOIN matriculas m ON m.id_matricula = i.id_matricula
    JOIN estudiantes e ON e.id_estudiante = m.id_estudiante
    WHERE a.id_sesion = ? AND a.id_inscripcion = ?
  `).get(req.params.id, id_inscripcion)
  return res.status(existente ? 200 : 201).json(registro)
})

export default router
