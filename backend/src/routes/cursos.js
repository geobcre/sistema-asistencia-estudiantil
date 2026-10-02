import { Router } from 'express'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()

// ======================================================
// FUNCIÓN AUXILIAR
// Comprueba si el usuario puede acceder a un curso.
// Administrador: cualquier curso.
// Docente: solamente cursos asignados a él.
// ======================================================
function puedeAccederCurso(usuario, idCurso) {
  const curso = db.prepare(`
    SELECT *
    FROM cursos
    WHERE id = ?
  `).get(idCurso)

  if (!curso) {
    return {
      permitido: false,
      existe: false,
      curso: null
    }
  }

  if (usuario.rol === 'administrador') {
    return {
      permitido: true,
      existe: true,
      curso
    }
  }

  if (
    usuario.rol === 'docente' &&
    Number(curso.id_docente) === Number(usuario.id_docente)
  ) {
    return {
      permitido: true,
      existe: true,
      curso
    }
  }

  return {
    permitido: false,
    existe: true,
    curso
  }
}

// ======================================================
// GET /api/cursos
// Administrador: todos.
// Docente: solamente sus cursos.
// ======================================================
router.get('/', (req, res) => {
  try {
    if (req.usuario.rol === 'administrador') {
      const cursos = db.prepare(`
        SELECT *
        FROM cursos
        ORDER BY id
      `).all()

      return res.json(cursos)
    }

    if (req.usuario.rol === 'docente') {
      if (!req.usuario.id_docente) {
        return res.json([])
      }

      const cursos = db.prepare(`
        SELECT *
        FROM cursos
        WHERE id_docente = ?
        ORDER BY id
      `).all(req.usuario.id_docente)

      return res.json(cursos)
    }

    return res.status(403).json({
      error: 'No tiene permisos para consultar asignaturas.'
    })
  } catch (error) {
    console.error('Error al obtener cursos:', error)

    return res.status(500).json({
      error: 'No se pudieron obtener las asignaturas.'
    })
  }
})

// ======================================================
// POST /api/cursos
// Solo administrador.
// ======================================================
router.post(
  '/',
  permitirRoles('administrador'),
  (req, res) => {
    try {
      const {
        nombre,
        codigo,
        horario,
        idDocente
      } = req.body

      if (!nombre) {
        return res.status(400).json({
          error: 'El nombre es requerido.'
        })
      }

      if (idDocente) {
        const docente = db.prepare(`
          SELECT id
          FROM docentes
          WHERE id = ?
        `).get(idDocente)

        if (!docente) {
          return res.status(400).json({
            error: 'El docente seleccionado no existe.'
          })
        }
      }

      const info = db.prepare(`
        INSERT INTO cursos (
          nombre,
          codigo,
          horario,
          id_docente
        )
        VALUES (?, ?, ?, ?)
      `).run(
        nombre.trim(),
        codigo?.trim() || null,
        horario?.trim() || null,
        idDocente ? Number(idDocente) : null
      )

      const curso = db.prepare(`
        SELECT *
        FROM cursos
        WHERE id = ?
      `).get(info.lastInsertRowid)

      return res.status(201).json(curso)
    } catch (error) {
      console.error('Error al crear curso:', error)

      return res.status(500).json({
        error: 'No se pudo crear la asignatura.'
      })
    }
  }
)

// ======================================================
// PUT /api/cursos/:id
// Solo administrador.
// ======================================================
router.put(
  '/:id',
  permitirRoles('administrador'),
  (req, res) => {
    try {
      const {
        nombre,
        codigo,
        horario,
        idDocente
      } = req.body

      if (!nombre) {
        return res.status(400).json({
          error: 'El nombre es requerido.'
        })
      }

      const cursoActual = db.prepare(`
        SELECT id
        FROM cursos
        WHERE id = ?
      `).get(req.params.id)

      if (!cursoActual) {
        return res.status(404).json({
          error: 'Asignatura no encontrada.'
        })
      }

      if (idDocente) {
        const docente = db.prepare(`
          SELECT id
          FROM docentes
          WHERE id = ?
        `).get(idDocente)

        if (!docente) {
          return res.status(400).json({
            error: 'El docente seleccionado no existe.'
          })
        }
      }

      db.prepare(`
        UPDATE cursos
        SET
          nombre = ?,
          codigo = ?,
          horario = ?,
          id_docente = ?
        WHERE id = ?
      `).run(
        nombre.trim(),
        codigo?.trim() || null,
        horario?.trim() || null,
        idDocente ? Number(idDocente) : null,
        req.params.id
      )

      const curso = db.prepare(`
        SELECT *
        FROM cursos
        WHERE id = ?
      `).get(req.params.id)

      return res.json(curso)
    } catch (error) {
      console.error('Error al editar curso:', error)

      return res.status(500).json({
        error: 'No se pudo editar la asignatura.'
      })
    }
  }
)

// ======================================================
// DELETE /api/cursos/:id
// Solo administrador.
// ======================================================
router.delete(
  '/:id',
  permitirRoles('administrador'),
  (req, res) => {
    try {
      const curso = db.prepare(`
        SELECT id
        FROM cursos
        WHERE id = ?
      `).get(req.params.id)

      if (!curso) {
        return res.status(404).json({
          error: 'Asignatura no encontrada.'
        })
      }

      db.prepare(`
        DELETE FROM cursos
        WHERE id = ?
      `).run(req.params.id)

      return res.status(204).end()
    } catch (error) {
      console.error('Error al eliminar curso:', error)

      return res.status(500).json({
        error: 'No se pudo eliminar la asignatura.'
      })
    }
  }
)

// ======================================================
// INSCRIPCIONES
// ======================================================

// GET /api/cursos/:id/estudiantes
// Administrador: cualquier curso.
// Docente: solamente sus cursos.
router.get('/:id/estudiantes', (req, res) => {
  try {
    const acceso = puedeAccederCurso(
      req.usuario,
      req.params.id
    )

    if (!acceso.existe) {
      return res.status(404).json({
        error: 'Asignatura no encontrada.'
      })
    }

    if (!acceso.permitido) {
      return res.status(403).json({
        error:
          'No tiene permisos para consultar esta asignatura.'
      })
    }

    const estudiantes = db.prepare(`
      SELECT e.*
      FROM estudiantes e
      JOIN inscripciones i
        ON i.id_estudiante = e.id
      WHERE i.id_curso = ?
      ORDER BY e.id
    `).all(req.params.id)

    return res.json(estudiantes)
  } catch (error) {
    console.error(
      'Error al obtener estudiantes del curso:',
      error
    )

    return res.status(500).json({
      error:
        'No se pudieron obtener los estudiantes de la asignatura.'
    })
  }
})

// POST /api/cursos/:id/inscripciones
// Solo administrador.
router.post(
  '/:id/inscripciones',
  permitirRoles('administrador'),
  (req, res) => {
    try {
      const { idEstudiante } = req.body

      if (!idEstudiante) {
        return res.status(400).json({
          error: 'Debe seleccionar un estudiante.'
        })
      }

      const curso = db.prepare(`
        SELECT id
        FROM cursos
        WHERE id = ?
      `).get(req.params.id)

      if (!curso) {
        return res.status(404).json({
          error: 'Asignatura no encontrada.'
        })
      }

      const estudiante = db.prepare(`
        SELECT id
        FROM estudiantes
        WHERE id = ?
      `).get(idEstudiante)

      if (!estudiante) {
        return res.status(404).json({
          error: 'Estudiante no encontrado.'
        })
      }

      try {
        db.prepare(`
          INSERT INTO inscripciones (
            id_estudiante,
            id_curso
          )
          VALUES (?, ?)
        `).run(
          idEstudiante,
          req.params.id
        )
      } catch (error) {
        // Si ya está inscrito, no duplicamos
        // el registro por la restricción UNIQUE.
      }

      const estudiantes = db.prepare(`
        SELECT e.*
        FROM estudiantes e
        JOIN inscripciones i
          ON i.id_estudiante = e.id
        WHERE i.id_curso = ?
        ORDER BY e.id
      `).all(req.params.id)

      return res.status(201).json(estudiantes)
    } catch (error) {
      console.error(
        'Error al inscribir estudiante:',
        error
      )

      return res.status(500).json({
        error: 'No se pudo inscribir al estudiante.'
      })
    }
  }
)

// DELETE /api/cursos/:id/inscripciones/:idEstudiante
// Solo administrador.
router.delete(
  '/:id/inscripciones/:idEstudiante',
  permitirRoles('administrador'),
  (req, res) => {
    try {
      db.prepare(`
        DELETE FROM inscripciones
        WHERE id_curso = ?
          AND id_estudiante = ?
      `).run(
        req.params.id,
        req.params.idEstudiante
      )

      return res.status(204).end()
    } catch (error) {
      console.error(
        'Error al retirar estudiante:',
        error
      )

      return res.status(500).json({
        error:
          'No se pudo retirar al estudiante de la asignatura.'
      })
    }
  }
)

// ======================================================
// SESIONES DE CLASE
// ======================================================

// GET /api/cursos/:id/sesiones
// Administrador: cualquier curso.
// Docente: solamente sus cursos.
router.get('/:id/sesiones', (req, res) => {
  try {
    const acceso = puedeAccederCurso(
      req.usuario,
      req.params.id
    )

    if (!acceso.existe) {
      return res.status(404).json({
        error: 'Asignatura no encontrada.'
      })
    }

    if (!acceso.permitido) {
      return res.status(403).json({
        error:
          'No tiene permisos para consultar las sesiones de esta asignatura.'
      })
    }

    const sesiones = db.prepare(`
      SELECT *
      FROM sesiones
      WHERE id_curso = ?
      ORDER BY fecha
    `).all(req.params.id)

    return res.json(sesiones)
  } catch (error) {
    console.error(
      'Error al obtener sesiones:',
      error
    )

    return res.status(500).json({
      error:
        'No se pudieron obtener las sesiones.'
    })
  }
})

// POST /api/cursos/:id/sesiones
// Administrador y docente pueden crear/obtener sesión,
// pero el docente solamente en sus propios cursos.
router.post('/:id/sesiones', (req, res) => {
  try {
    const acceso = puedeAccederCurso(
      req.usuario,
      req.params.id
    )

    if (!acceso.existe) {
      return res.status(404).json({
        error: 'Asignatura no encontrada.'
      })
    }

    if (!acceso.permitido) {
      return res.status(403).json({
        error:
          'No tiene permisos para registrar asistencia en esta asignatura.'
      })
    }

    const { fecha } = req.body

    if (!fecha) {
      return res.status(400).json({
        error: 'La fecha es requerida.'
      })
    }

    let sesion = db.prepare(`
      SELECT *
      FROM sesiones
      WHERE id_curso = ?
        AND fecha = ?
    `).get(
      req.params.id,
      fecha
    )

    if (!sesion) {
      const info = db.prepare(`
        INSERT INTO sesiones (
          id_curso,
          fecha
        )
        VALUES (?, ?)
      `).run(
        req.params.id,
        fecha
      )

      sesion = db.prepare(`
        SELECT *
        FROM sesiones
        WHERE id = ?
      `).get(info.lastInsertRowid)
    }

    return res.status(201).json(sesion)
  } catch (error) {
    console.error(
      'Error al crear sesión:',
      error
    )

    return res.status(500).json({
      error: 'No se pudo crear la sesión.'
    })
  }
})

export default router