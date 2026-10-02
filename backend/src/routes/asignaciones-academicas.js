import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'
import {
  consultaAsignacion,
  obtenerAsignacion,
  verificarAccesoAsignacion,
} from '../middleware/asignaciones.js'

const router = Router()
const estadosValidos = ['Activa', 'Inactiva']

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha || '')
    && !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))
}

function validarDatos(datos) {
  const { id_asignatura, id_docente, id_grupo, fecha_inicio, fecha_fin, estado } = datos
  if (![id_asignatura, id_docente, id_grupo].every((id) => Number.isInteger(Number(id)))) {
    return 'Asignatura, docente y grupo son obligatorios.'
  }
  if (!fechaValida(fecha_inicio)) return 'La fecha de inicio no es válida.'
  if (fecha_fin && !fechaValida(fecha_fin)) return 'La fecha de fin no es válida.'
  if (fecha_fin && fecha_fin < fecha_inicio) {
    return 'La fecha de fin no puede ser anterior a la fecha de inicio.'
  }
  if (!estadosValidos.includes(estado)) return 'El estado debe ser Activa o Inactiva.'

  const asignatura = db.prepare(`
    SELECT estado FROM asignaturas WHERE id_asignatura = ?
  `).get(id_asignatura)
  if (!asignatura) return 'La asignatura seleccionada no existe.'
  if (asignatura.estado !== 'Activa') return 'La asignatura seleccionada está inactiva.'

  const docente = db.prepare(`
    SELECT estado FROM docentes WHERE id_docente = ?
  `).get(id_docente)
  if (!docente) return 'El docente seleccionado no existe.'
  if (docente.estado !== 'Activo') return 'El docente seleccionado está inactivo.'

  const grupo = db.prepare(`
    SELECT c.estado AS ciclo_estado
    FROM grupos g
    JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
    WHERE g.id_grupo = ?
  `).get(id_grupo)
  if (!grupo) return 'El grupo seleccionado no existe.'
  if (grupo.ciclo_estado === 'Finalizado') {
    return 'No se pueden crear asignaciones en un ciclo finalizado.'
  }
  return null
}

router.get('/', (req, res) => {
  if (req.usuario.rol === 'administrador') {
    return res.json(db.prepare(`${consultaAsignacion} ORDER BY c.anio DESC, a.nombre`).all())
  }
  if (req.usuario.rol === 'docente' && req.usuario.id_docente) {
    return res.json(db.prepare(`
      ${consultaAsignacion}
      WHERE aa.id_docente = ?
      ORDER BY c.anio DESC, a.nombre
    `).all(req.usuario.id_docente))
  }
  return res.status(403).json({ error: 'No tiene acceso a las asignaciones académicas.' })
})

router.get('/:id', verificarAccesoAsignacion, (req, res) => {
  res.json(req.asignacion)
})

router.post('/', permitirRoles('administrador'), (req, res) => {
  const datos = {
    id_asignatura: req.body.id_asignatura,
    id_docente: req.body.id_docente,
    id_grupo: req.body.id_grupo,
    horario: req.body.horario?.trim() || null,
    fecha_inicio: req.body.fecha_inicio,
    fecha_fin: req.body.fecha_fin || null,
    estado: req.body.estado || 'Activa',
  }
  const error = validarDatos(datos)
  if (error) return res.status(400).json({ error })

  const info = db.prepare(`
    INSERT INTO asignaciones_academicas
      (id_asignatura, id_docente, id_grupo, horario, fecha_inicio, fecha_fin, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(datos.id_asignatura), Number(datos.id_docente), Number(datos.id_grupo),
    datos.horario, datos.fecha_inicio, datos.fecha_fin, datos.estado
  )
  return res.status(201).json(obtenerAsignacion(info.lastInsertRowid))
})

router.put('/:id', permitirRoles('administrador'), (req, res) => {
  if (!obtenerAsignacion(req.params.id)) {
    return res.status(404).json({ error: 'Asignación académica no encontrada.' })
  }
  const datos = {
    id_asignatura: req.body.id_asignatura,
    id_docente: req.body.id_docente,
    id_grupo: req.body.id_grupo,
    horario: req.body.horario?.trim() || null,
    fecha_inicio: req.body.fecha_inicio,
    fecha_fin: req.body.fecha_fin || null,
    estado: req.body.estado || 'Activa',
  }
  const error = validarDatos(datos)
  if (error) return res.status(400).json({ error })

  db.prepare(`
    UPDATE asignaciones_academicas
    SET id_asignatura = ?, id_docente = ?, id_grupo = ?, horario = ?,
        fecha_inicio = ?, fecha_fin = ?, estado = ?
    WHERE id_asignacion = ?
  `).run(
    Number(datos.id_asignatura), Number(datos.id_docente), Number(datos.id_grupo),
    datos.horario, datos.fecha_inicio, datos.fecha_fin, datos.estado, req.params.id
  )
  return res.json(obtenerAsignacion(req.params.id))
})

router.delete('/:id', permitirRoles('administrador'), (req, res) => {
  if (!obtenerAsignacion(req.params.id)) {
    return res.status(404).json({ error: 'Asignación académica no encontrada.' })
  }
  db.prepare(`
    UPDATE asignaciones_academicas SET estado = 'Inactiva' WHERE id_asignacion = ?
  `).run(req.params.id)
  return res.json(obtenerAsignacion(req.params.id))
})

export default router
