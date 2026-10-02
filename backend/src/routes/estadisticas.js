import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

const UMBRAL_RIESGO = 75

function calcularPorcentaje(presentes, totalSesiones) {
  return totalSesiones > 0
    ? Math.round((presentes / totalSesiones) * 100)
    : 0
}

// ======================================================
// COMPROBAR ACCESO A UN CURSO
// Administrador: cualquier curso.
// Docente: solamente sus cursos.
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
// ESTADÍSTICAS POR ESTUDIANTE Y CURSO
// ======================================================
function statsPorEstudianteYCurso({
  idCurso,
  idEstudiante
} = {}) {
  let sql = `
    SELECT
      i.id_estudiante,
      i.id_curso,
      COUNT(DISTINCT s.id) AS totalSesiones,
      COUNT(
        DISTINCT CASE
          WHEN a.estado IN ('presente', 'tarde')
          THEN a.id_sesion
        END
      ) AS presentes
    FROM inscripciones i
    JOIN sesiones s
      ON s.id_curso = i.id_curso
    LEFT JOIN asistencias a
      ON a.id_sesion = s.id
      AND a.id_estudiante = i.id_estudiante
    WHERE 1 = 1
  `

  const params = []

  if (idCurso) {
    sql += ' AND i.id_curso = ?'
    params.push(idCurso)
  }

  if (idEstudiante) {
    sql += ' AND i.id_estudiante = ?'
    params.push(idEstudiante)
  }

  sql += `
    GROUP BY
      i.id_estudiante,
      i.id_curso
  `

  return db.prepare(sql).all(...params)
}

// ======================================================
// ESTADÍSTICAS COMPLETAS DE UN CURSO
// ======================================================
function estadisticasPorCurso(idCurso) {
  const curso = db.prepare(`
    SELECT *
    FROM cursos
    WHERE id = ?
  `).get(idCurso)

  if (!curso) {
    return null
  }

  const alumnos = db.prepare(`
    SELECT
      e.id,
      e.nombre,
      e.apellido,
      e.carne
    FROM estudiantes e
    JOIN inscripciones i
      ON i.id_estudiante = e.id
    WHERE i.id_curso = ?
    ORDER BY e.apellido, e.nombre
  `).all(idCurso)

  const stats = statsPorEstudianteYCurso({
    idCurso
  })

  const statsPorAlumno = new Map(
    stats.map((s) => [
      s.id_estudiante,
      s
    ])
  )

  const resultado = alumnos.map((estudiante) => {
    const {
      totalSesiones = 0,
      presentes = 0
    } = statsPorAlumno.get(estudiante.id) ?? {}

    return {
      ...estudiante,
      presentes,
      totalSesiones,
      porcentaje: calcularPorcentaje(
        presentes,
        totalSesiones
      )
    }
  })

  return {
    curso,
    alumnos: resultado
  }
}

// ======================================================
// GET /api/estadisticas/curso/:id
//
// Administrador: cualquier curso.
// Docente: solamente sus cursos.
// ======================================================
router.get('/curso/:id', (req, res) => {
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
          'No tiene permisos para consultar las estadísticas de esta asignatura.'
      })
    }

    const data = estadisticasPorCurso(
      req.params.id
    )

    return res.json(data)
  } catch (error) {
    console.error(
      'Error al consultar estadísticas:',
      error
    )

    return res.status(500).json({
      error:
        'No se pudieron consultar las estadísticas.'
    })
  }
})

// ======================================================
// GET /api/estadisticas/estudiante/:id
//
// Administrador:
//   ve todos los cursos del estudiante.
//
// Docente:
//   solamente ve sus propios cursos.
// ======================================================
router.get('/estudiante/:id', (req, res) => {
  try {
    const estudiante = db.prepare(`
      SELECT *
      FROM estudiantes
      WHERE id = ?
    `).get(req.params.id)

    if (!estudiante) {
      return res.status(404).json({
        error: 'Estudiante no encontrado.'
      })
    }

    let cursos

    if (req.usuario.rol === 'administrador') {
      cursos = db.prepare(`
        SELECT c.*
        FROM cursos c
        JOIN inscripciones i
          ON i.id_curso = c.id
        WHERE i.id_estudiante = ?
        ORDER BY c.nombre
      `).all(req.params.id)
    } else if (req.usuario.rol === 'docente') {
      cursos = db.prepare(`
        SELECT c.*
        FROM cursos c
        JOIN inscripciones i
          ON i.id_curso = c.id
        WHERE i.id_estudiante = ?
          AND c.id_docente = ?
        ORDER BY c.nombre
      `).all(
        req.params.id,
        req.usuario.id_docente
      )
    } else {
      return res.status(403).json({
        error:
          'No tiene permisos para consultar estadísticas.'
      })
    }

    // El docente no debe obtener estadísticas de un
    // estudiante que no pertenece a ninguno de sus cursos.
    if (
      req.usuario.rol === 'docente' &&
      cursos.length === 0
    ) {
      return res.status(403).json({
        error:
          'No tiene permisos para consultar las estadísticas de este estudiante.'
      })
    }

    const detalle = cursos.map((curso) => {
      const stats = statsPorEstudianteYCurso({
        idCurso: curso.id,
        idEstudiante: req.params.id
      })

      const registro = stats[0] ?? {
        totalSesiones: 0,
        presentes: 0
      }

      return {
        idCurso: curso.id,
        nombre: curso.nombre,
        presentes: registro.presentes,
        totalSesiones: registro.totalSesiones,
        porcentaje: calcularPorcentaje(
          registro.presentes,
          registro.totalSesiones
        )
      }
    })

    const promedioGlobal =
      detalle.length > 0
        ? Math.round(
            detalle.reduce(
              (suma, curso) =>
                suma + curso.porcentaje,
              0
            ) / detalle.length
          )
        : 0

    return res.json({
      idEstudiante: estudiante.id,
      nombre:
        `${estudiante.nombre} ${estudiante.apellido}`,
      porcentajeGlobal: promedioGlobal,
      cursos: detalle
    })
  } catch (error) {
    console.error(
      'Error al consultar estudiante:',
      error
    )

    return res.status(500).json({
      error:
        'No se pudieron consultar las estadísticas del estudiante.'
    })
  }
})

// ======================================================
// GET /api/estadisticas/riesgo
//
// Administrador:
//   revisa todos los cursos.
//
// Docente:
//   solamente revisa sus cursos.
// ======================================================
router.get('/riesgo', (req, res) => {
  try {
    let cursos

    if (req.usuario.rol === 'administrador') {
      cursos = db.prepare(`
        SELECT *
        FROM cursos
        ORDER BY id
      `).all()
    } else if (req.usuario.rol === 'docente') {
      cursos = db.prepare(`
        SELECT *
        FROM cursos
        WHERE id_docente = ?
        ORDER BY id
      `).all(req.usuario.id_docente)
    } else {
      return res.status(403).json({
        error:
          'No tiene permisos para consultar estudiantes en riesgo.'
      })
    }

    const enRiesgo = []

    for (const curso of cursos) {
      const data = estadisticasPorCurso(
        curso.id
      )

      if (!data) {
        continue
      }

      data.alumnos
        .filter(
          (alumno) =>
            alumno.totalSesiones > 0 &&
            alumno.porcentaje < UMBRAL_RIESGO
        )
        .forEach((alumno) => {
          enRiesgo.push({
            ...alumno,
            curso: curso.nombre,
            idCurso: curso.id
          })
        })
    }

    return res.json(enRiesgo)
  } catch (error) {
    console.error(
      'Error al consultar estudiantes en riesgo:',
      error
    )

    return res.status(500).json({
      error:
        'No se pudieron consultar los estudiantes en riesgo.'
    })
  }
})

export default router