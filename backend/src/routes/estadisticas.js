import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'
import { verificarAccesoAsignacion } from '../middleware/asignaciones.js'
import { leerIds } from '../utils/validaciones.js'
import {
  UMBRAL_RIESGO,
  consultarEstadisticas,
  resumirPorAsignacion,
  totalizar
} from '../services/estadisticas.js'

const router = Router()

router.use(permitirRoles('administrador', 'docente'))

// ======================================================
// GET /api/estadisticas/resumen?id_ciclo=&id_grupo=
// Indicadores generales y detalle por asignación académica.
// Administrador: todo. Docente: solo sus asignaciones.
// ======================================================
router.get('/resumen', (req, res) => {
  const { valores, error } = leerIds(req.query, ['id_ciclo', 'id_grupo'])
  if (error) return res.status(400).json({ error })

  const filas = consultarEstadisticas(req.usuario, valores)
  const activas = filas.filter((fila) => fila.inscripcion_estado === 'Activa')

  return res.json({
    umbral: UMBRAL_RIESGO,
    total: {
      ...totalizar(filas),
      estudiantes: new Set(filas.map((fila) => fila.id_estudiante)).size,
      en_riesgo: activas.filter((fila) => fila.en_riesgo).length
    },
    asignaciones: resumirPorAsignacion(filas)
  })
})

// ======================================================
// GET /api/estadisticas/asignacion/:id
// Estadísticas por estudiante de una asignación académica.
// ======================================================
router.get('/asignacion/:id', verificarAccesoAsignacion, (req, res) => {
  const alumnos = consultarEstadisticas(req.usuario, {
    id_asignacion: Number(req.params.id)
  })

  return res.json({
    umbral: UMBRAL_RIESGO,
    asignacion: req.asignacion,
    resumen: totalizar(alumnos),
    alumnos
  })
})

// ======================================================
// GET /api/estadisticas/estudiante/:id
// Docente: solo ve las asignaciones que le corresponden.
// ======================================================
router.get('/estudiante/:id', (req, res) => {
  const estudiante = db.prepare(`
    SELECT id_estudiante, carne, nombre, apellido, estado
    FROM estudiantes
    WHERE id_estudiante = ?
  `).get(req.params.id)
  if (!estudiante) {
    return res.status(404).json({ error: 'Estudiante no encontrado.' })
  }

  const asignaciones = consultarEstadisticas(req.usuario, {
    id_estudiante: estudiante.id_estudiante
  })

  // Un docente no debe consultar a un estudiante que no está en ninguna de sus asignaciones.
  if (req.usuario.rol === 'docente' && asignaciones.length === 0) {
    return res.status(403).json({
      error: 'No tiene permisos para consultar las estadísticas de este estudiante.'
    })
  }

  return res.json({
    umbral: UMBRAL_RIESGO,
    estudiante,
    resumen: totalizar(asignaciones),
    asignaciones
  })
})

// ======================================================
// GET /api/estadisticas/riesgo?umbral=75&id_ciclo=&id_grupo=
// Inscripciones activas con porcentaje por debajo del umbral.
// ======================================================
router.get('/riesgo', (req, res) => {
  const { valores, error } = leerIds(req.query, ['id_ciclo', 'id_grupo'])
  if (error) return res.status(400).json({ error })

  let umbral = UMBRAL_RIESGO
  if (req.query.umbral !== undefined && req.query.umbral !== '') {
    umbral = Number(req.query.umbral)
    if (!Number.isInteger(umbral) || umbral < 1 || umbral > 100) {
      return res.status(400).json({ error: 'El umbral debe ser un entero entre 1 y 100.' })
    }
  }

  const enRiesgo = consultarEstadisticas(req.usuario, { ...valores, soloActivas: true })
    .filter((fila) => fila.porcentaje !== null && fila.porcentaje < umbral)
    .sort((a, b) =>
      a.porcentaje - b.porcentaje
      || a.apellido.localeCompare(b.apellido)
      || a.nombre.localeCompare(b.nombre))

  return res.json(enRiesgo)
})

export default router
