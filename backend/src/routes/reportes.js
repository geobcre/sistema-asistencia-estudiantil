import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'
import {
  obtenerAsignacion,
  usuarioPuedeAccederAsignacion
} from '../middleware/asignaciones.js'
import { fechaValida, leerIds } from '../utils/validaciones.js'

const router = Router()
const ESTADOS = ['Presente', 'Ausente', 'Tarde', 'Justificado']

router.use(permitirRoles('administrador', 'docente'))

// ======================================================
// GET /api/reportes
//
// Filtros opcionales:
//   id_ciclo, id_grupo, id_asignacion, id_estudiante,
//   estado (Presente | Ausente | Tarde | Justificado),
//   desde, hasta (AAAA-MM-DD)
//
// Administrador: todos los registros.
// Docente: solo los de sus asignaciones académicas.
// Las sesiones canceladas no forman parte del reporte.
// ======================================================
router.get('/', (req, res) => {
  const { valores, error } = leerIds(req.query, [
    'id_ciclo', 'id_grupo', 'id_asignacion', 'id_estudiante'
  ])
  if (error) return res.status(400).json({ error })

  const { estado, desde, hasta } = req.query

  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'El estado de asistencia no es válido.' })
  }
  if (desde && !fechaValida(desde)) {
    return res.status(400).json({ error: 'La fecha "desde" no es válida (AAAA-MM-DD).' })
  }
  if (hasta && !fechaValida(hasta)) {
    return res.status(400).json({ error: 'La fecha "hasta" no es válida (AAAA-MM-DD).' })
  }
  if (desde && hasta && desde > hasta) {
    return res.status(400).json({ error: 'La fecha "desde" no puede ser posterior a "hasta".' })
  }

  if (valores.id_asignacion !== undefined) {
    const asignacion = obtenerAsignacion(valores.id_asignacion)
    if (!asignacion) {
      return res.status(404).json({ error: 'Asignación académica no encontrada.' })
    }
    if (!usuarioPuedeAccederAsignacion(req.usuario, asignacion)) {
      return res.status(403).json({
        error: 'No tiene permisos para consultar reportes de esta asignación académica.'
      })
    }
  }

  const condiciones = [`s.estado <> 'Cancelada'`]
  const parametros = []

  if (req.usuario.rol === 'docente') {
    condiciones.push('aa.id_docente = ?')
    parametros.push(Number(req.usuario.id_docente))
  }

  const porFiltro = {
    id_ciclo: 'c.id_ciclo = ?',
    id_grupo: 'g.id_grupo = ?',
    id_asignacion: 'aa.id_asignacion = ?',
    id_estudiante: 'e.id_estudiante = ?'
  }
  for (const [campo, condicion] of Object.entries(porFiltro)) {
    if (valores[campo] !== undefined) {
      condiciones.push(condicion)
      parametros.push(valores[campo])
    }
  }
  if (estado) { condiciones.push('a.estado = ?'); parametros.push(estado) }
  if (desde) { condiciones.push('s.fecha >= ?'); parametros.push(desde) }
  if (hasta) { condiciones.push('s.fecha <= ?'); parametros.push(hasta) }

  const registros = db.prepare(`
    SELECT
      a.id_asistencia,
      a.estado,
      s.id_sesion,
      s.fecha,
      s.estado AS sesion_estado,
      i.id_inscripcion,
      e.id_estudiante,
      e.carne,
      e.nombre,
      e.apellido,
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
    FROM asistencias a
    JOIN sesiones s ON s.id_sesion = a.id_sesion
    JOIN inscripciones i ON i.id_inscripcion = a.id_inscripcion
    JOIN matriculas m ON m.id_matricula = i.id_matricula
    JOIN estudiantes e ON e.id_estudiante = m.id_estudiante
    JOIN asignaciones_academicas aa ON aa.id_asignacion = s.id_asignacion
    JOIN asignaturas asig ON asig.id_asignatura = aa.id_asignatura
    JOIN grupos g ON g.id_grupo = aa.id_grupo
    JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
    JOIN docentes d ON d.id_docente = aa.id_docente
    WHERE ${condiciones.join(' AND ')}
    ORDER BY s.fecha DESC, asig.nombre, g.grado, g.seccion, e.apellido, e.nombre
  `).all(...parametros)

  const resumen = Object.fromEntries(ESTADOS.map((nombre) => [nombre, 0]))
  for (const registro of registros) resumen[registro.estado] += 1

  return res.json({ total: registros.length, resumen, registros })
})

export default router
