import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

// ======================================================
// FUNCIÓN AUXILIAR
// Administrador: puede acceder a cualquier sesión.
// Docente: solo a sesiones de sus propias asignaturas.
// ======================================================
function puedeAccederSesion(usuario, idSesion) {
  const sesion = db.prepare(`
    SELECT
      s.id,
      s.id_curso,
      s.fecha,
      c.id_docente
    FROM sesiones s
    JOIN cursos c ON c.id = s.id_curso
    WHERE s.id = ?
  `).get(idSesion)

  if (!sesion) {
    return {
      permitido: false,
      existe: false,
      sesion: null
    }
  }

  if (usuario.rol === 'administrador') {
    return {
      permitido: true,
      existe: true,
      sesion
    }
  }

  if (
    usuario.rol === 'docente' &&
    Number(sesion.id_docente) === Number(usuario.id_docente)
  ) {
    return {
      permitido: true,
      existe: true,
      sesion
    }
  }

  return {
    permitido: false,
    existe: true,
    sesion
  }
}

// ======================================================
// GET /api/sesiones/:id/asistencia
// Administrador: cualquier sesión.
// Docente: solamente sesiones de sus cursos.
// ======================================================
router.get('/:id/asistencia', (req, res) => {
  try {
    const acceso = puedeAccederSesion(
      req.usuario,
      req.params.id
    )

    if (!acceso.existe) {
      return res.status(404).json({
        error: 'Sesión no encontrada.'
      })
    }

    if (!acceso.permitido) {
      return res.status(403).json({
        error: 'No tiene permisos para consultar esta sesión.'
      })
    }

    const registros = db.prepare(`
      SELECT
        a.*,
        e.nombre,
        e.apellido,
        e.carne
      FROM asistencias a
      JOIN estudiantes e
        ON e.id = a.id_estudiante
      WHERE a.id_sesion = ?
      ORDER BY e.apellido, e.nombre
    `).all(req.params.id)

    return res.json(registros)
  } catch (error) {
    console.error('Error al consultar asistencia:', error)

    return res.status(500).json({
      error: 'No se pudo consultar la asistencia.'
    })
  }
})

// ======================================================
// POST /api/sesiones/:id/asistencia
// Registra o actualiza la asistencia.
// Docente: solamente en sesiones de sus propios cursos.
// ======================================================
router.post('/:id/asistencia', (req, res) => {
  try {
    const acceso = puedeAccederSesion(
      req.usuario,
      req.params.id
    )

    if (!acceso.existe) {
      return res.status(404).json({
        error: 'Sesión no encontrada.'
      })
    }

    if (!acceso.permitido) {
      return res.status(403).json({
        error: 'No tiene permisos para modificar esta sesión.'
      })
    }

    const { idEstudiante, estado } = req.body

    if (!idEstudiante) {
      return res.status(400).json({
        error: 'El estudiante es requerido.'
      })
    }

    const estadosValidos = [
      'presente',
      'ausente',
      'tarde',
      'justificado'
    ]

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: 'Estado de asistencia inválido.'
      })
    }

    // ==================================================
    // VERIFICAR QUE EL ESTUDIANTE ESTÉ INSCRITO
    // EN EL CURSO DE ESTA SESIÓN
    // ==================================================
    const inscripcion = db.prepare(`
      SELECT id
      FROM inscripciones
      WHERE id_curso = ?
        AND id_estudiante = ?
    `).get(
      acceso.sesion.id_curso,
      idEstudiante
    )

    if (!inscripcion) {
      return res.status(400).json({
        error: 'El estudiante no está inscrito en esta asignatura.'
      })
    }

    // ==================================================
    // INSERTAR O ACTUALIZAR ASISTENCIA
    // ==================================================
    db.prepare(`
      INSERT INTO asistencias (
        id_sesion,
        id_estudiante,
        estado
      )
      VALUES (?, ?, ?)

      ON CONFLICT(id_sesion, id_estudiante)
      DO UPDATE SET
        estado = excluded.estado
    `).run(
      req.params.id,
      idEstudiante,
      estado
    )

    const registro = db.prepare(`
      SELECT
        a.*,
        e.nombre,
        e.apellido,
        e.carne
      FROM asistencias a
      JOIN estudiantes e
        ON e.id = a.id_estudiante
      WHERE a.id_sesion = ?
        AND a.id_estudiante = ?
    `).get(
      req.params.id,
      idEstudiante
    )

    return res.status(201).json(registro)
  } catch (error) {
    console.error('Error al registrar asistencia:', error)

    return res.status(500).json({
      error: 'No se pudo registrar la asistencia.'
    })
  }
})

export default router