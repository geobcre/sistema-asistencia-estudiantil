import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

// ======================================================
// GET /api/reportes
//
// Filtros disponibles:
// ?curso=1
// ?estudiante=3
// ?desde=2026-01-01
// ?hasta=2026-12-31
//
// Administrador:
//   Puede consultar todos los cursos.
//
// Docente:
//   Solamente puede consultar reportes de los cursos
//   que tenga asignados.
// ======================================================
router.get('/', (req, res) => {
  try {
    const {
      curso,
      desde,
      hasta,
      estudiante
    } = req.query

    // ==================================================
    // VALIDAR CURSO SOLICITADO
    // ==================================================

    if (curso) {
      const cursoSolicitado = db.prepare(`
        SELECT
          id,
          nombre,
          id_docente
        FROM cursos
        WHERE id = ?
      `).get(curso)

      if (!cursoSolicitado) {
        return res.status(404).json({
          error: 'Asignatura no encontrada.'
        })
      }

      // Si es docente, solamente puede solicitar
      // explícitamente uno de sus propios cursos.
      if (
        req.usuario.rol === 'docente' &&
        Number(cursoSolicitado.id_docente) !==
          Number(req.usuario.id_docente)
      ) {
        return res.status(403).json({
          error:
            'No tiene permisos para consultar reportes de esta asignatura.'
        })
      }
    }

    // ==================================================
    // CONSULTA BASE
    // ==================================================

    let sql = `
      SELECT
        a.id,
        a.estado,
        s.fecha,

        c.id AS id_curso,
        c.nombre AS curso,
        c.codigo AS codigo_curso,
        c.id_docente,

        e.id AS id_estudiante,
        e.nombre,
        e.apellido,
        e.carne

      FROM asistencias a

      JOIN sesiones s
        ON s.id = a.id_sesion

      JOIN cursos c
        ON c.id = s.id_curso

      JOIN estudiantes e
        ON e.id = a.id_estudiante

      WHERE 1 = 1
    `

    const params = []

    // ==================================================
    // SEGURIDAD POR ROL
    // ==================================================

    if (req.usuario.rol === 'docente') {
      if (!req.usuario.id_docente) {
        return res.json([])
      }

      sql += `
        AND c.id_docente = ?
      `

      params.push(req.usuario.id_docente)
    } else if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({
        error:
          'No tiene permisos para consultar reportes.'
      })
    }

    // ==================================================
    // FILTROS
    // ==================================================

    if (curso) {
      sql += `
        AND c.id = ?
      `
      params.push(curso)
    }

    if (estudiante) {
      sql += `
        AND e.id = ?
      `
      params.push(estudiante)
    }

    if (desde) {
      sql += `
        AND s.fecha >= ?
      `
      params.push(desde)
    }

    if (hasta) {
      sql += `
        AND s.fecha <= ?
      `
      params.push(hasta)
    }

    // ==================================================
    // ORDEN
    // ==================================================

    sql += `
      ORDER BY
        s.fecha DESC,
        c.nombre ASC,
        e.apellido ASC,
        e.nombre ASC
    `

    const registros = db
      .prepare(sql)
      .all(...params)

    return res.json(registros)
  } catch (error) {
    console.error(
      'Error al generar reporte:',
      error
    )

    return res.status(500).json({
      error: 'No se pudo generar el reporte.'
    })
  }
})

export default router