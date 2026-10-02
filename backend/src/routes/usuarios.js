import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()

// Todas las rutas de este archivo son exclusivas del administrador.
router.use(permitirRoles('administrador'))

// ======================================================
// GET /api/usuarios
// Listar usuarios
// ======================================================
router.get('/', (req, res) => {
  try {
    const usuarios = db.prepare(`
      SELECT
        u.id,
        u.nombre,
        u.correo,
        u.rol,
        u.activo,
        u.id_docente,
        u.creado_en,
        d.nombre AS docente_nombre,
        d.apellido AS docente_apellido
      FROM usuarios u
      LEFT JOIN docentes d
        ON d.id = u.id_docente
      ORDER BY u.id
    `).all()

    res.json(usuarios)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)

    res.status(500).json({
      error: 'No se pudieron obtener los usuarios.'
    })
  }
})

// ======================================================
// GET /api/usuarios/:id
// Obtener un usuario
// ======================================================
router.get('/:id', (req, res) => {
  try {
    const usuario = db.prepare(`
      SELECT
        u.id,
        u.nombre,
        u.correo,
        u.rol,
        u.activo,
        u.id_docente,
        u.creado_en,
        d.nombre AS docente_nombre,
        d.apellido AS docente_apellido
      FROM usuarios u
      LEFT JOIN docentes d
        ON d.id = u.id_docente
      WHERE u.id = ?
    `).get(req.params.id)

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado.'
      })
    }

    res.json(usuario)
  } catch (error) {
    console.error('Error al obtener usuario:', error)

    res.status(500).json({
      error: 'No se pudo obtener el usuario.'
    })
  }
})

// ======================================================
// POST /api/usuarios
// Crear usuario
// ======================================================
router.post('/', (req, res) => {
  try {
    const {
      nombre,
      correo,
      password,
      rol,
      idDocente
    } = req.body

    if (!nombre || !correo || !password || !rol) {
      return res.status(400).json({
        error:
          'Nombre, correo, contraseña y rol son obligatorios.'
      })
    }

    const rolesValidos = [
      'administrador',
      'docente'
    ]

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        error: 'El rol seleccionado no es válido.'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        error:
          'La contraseña debe tener al menos 8 caracteres.'
      })
    }

    const correoLimpio =
      correo.trim().toLowerCase()

    const existente = db.prepare(`
      SELECT id
      FROM usuarios
      WHERE LOWER(correo) = LOWER(?)
    `).get(correoLimpio)

    if (existente) {
      return res.status(409).json({
        error:
          'Ya existe un usuario con ese correo.'
      })
    }

    let docenteAsociado = null

    if (rol === 'docente') {
      if (!idDocente) {
        return res.status(400).json({
          error:
            'Debe seleccionar el docente asociado.'
        })
      }

      docenteAsociado = db.prepare(`
        SELECT id
        FROM docentes
        WHERE id = ?
      `).get(idDocente)

      if (!docenteAsociado) {
        return res.status(400).json({
          error:
            'El docente seleccionado no existe.'
        })
      }

      const usuarioDelDocente = db.prepare(`
        SELECT id
        FROM usuarios
        WHERE id_docente = ?
      `).get(idDocente)

      if (usuarioDelDocente) {
        return res.status(409).json({
          error:
            'Este docente ya tiene un usuario asociado.'
        })
      }
    }

    const passwordHash =
      bcrypt.hashSync(password, 12)

    const info = db.prepare(`
      INSERT INTO usuarios (
        nombre,
        correo,
        password,
        rol,
        activo,
        id_docente
      )
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      nombre.trim(),
      correoLimpio,
      passwordHash,
      rol,
      rol === 'docente'
        ? Number(idDocente)
        : null
    )

    const usuario = db.prepare(`
      SELECT
        id,
        nombre,
        correo,
        rol,
        activo,
        id_docente,
        creado_en
      FROM usuarios
      WHERE id = ?
    `).get(info.lastInsertRowid)

    res.status(201).json(usuario)
  } catch (error) {
    console.error('Error al crear usuario:', error)

    res.status(500).json({
      error: 'No se pudo crear el usuario.'
    })
  }
})

// ======================================================
// PUT /api/usuarios/:id
// Editar usuario
// ======================================================
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id)

    const usuarioActual = db.prepare(`
      SELECT *
      FROM usuarios
      WHERE id = ?
    `).get(id)

    if (!usuarioActual) {
      return res.status(404).json({
        error: 'Usuario no encontrado.'
      })
    }

    const {
      nombre,
      correo,
      rol,
      activo,
      idDocente,
      password
    } = req.body

    if (!nombre || !correo || !rol) {
      return res.status(400).json({
        error:
          'Nombre, correo y rol son obligatorios.'
      })
    }

    const rolesValidos = [
      'administrador',
      'docente'
    ]

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        error: 'El rol seleccionado no es válido.'
      })
    }

    const correoLimpio =
      correo.trim().toLowerCase()

    const correoOcupado = db.prepare(`
      SELECT id
      FROM usuarios
      WHERE LOWER(correo) = LOWER(?)
        AND id <> ?
    `).get(correoLimpio, id)

    if (correoOcupado) {
      return res.status(409).json({
        error:
          'Ya existe otro usuario con ese correo.'
      })
    }

    let idDocenteFinal = null

    if (rol === 'docente') {
      if (!idDocente) {
        return res.status(400).json({
          error:
            'Debe seleccionar el docente asociado.'
        })
      }

      const docente = db.prepare(`
        SELECT id
        FROM docentes
        WHERE id = ?
      `).get(idDocente)

      if (!docente) {
        return res.status(400).json({
          error:
            'El docente seleccionado no existe.'
        })
      }

      const usuarioDelDocente = db.prepare(`
        SELECT id
        FROM usuarios
        WHERE id_docente = ?
          AND id <> ?
      `).get(idDocente, id)

      if (usuarioDelDocente) {
        return res.status(409).json({
          error:
            'Este docente ya tiene otro usuario asociado.'
        })
      }

      idDocenteFinal = Number(idDocente)
    }

    const activoFinal =
      activo === false ||
      activo === 0 ||
      activo === '0'
        ? 0
        : 1

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          error:
            'La nueva contraseña debe tener al menos 8 caracteres.'
        })
      }

      const passwordHash =
        bcrypt.hashSync(password, 12)

      db.prepare(`
        UPDATE usuarios
        SET
          nombre = ?,
          correo = ?,
          password = ?,
          rol = ?,
          activo = ?,
          id_docente = ?
        WHERE id = ?
      `).run(
        nombre.trim(),
        correoLimpio,
        passwordHash,
        rol,
        activoFinal,
        idDocenteFinal,
        id
      )
    } else {
      db.prepare(`
        UPDATE usuarios
        SET
          nombre = ?,
          correo = ?,
          rol = ?,
          activo = ?,
          id_docente = ?
        WHERE id = ?
      `).run(
        nombre.trim(),
        correoLimpio,
        rol,
        activoFinal,
        idDocenteFinal,
        id
      )
    }

    const usuario = db.prepare(`
      SELECT
        id,
        nombre,
        correo,
        rol,
        activo,
        id_docente,
        creado_en
      FROM usuarios
      WHERE id = ?
    `).get(id)

    res.json(usuario)
  } catch (error) {
    console.error('Error al editar usuario:', error)

    res.status(500).json({
      error: 'No se pudo editar el usuario.'
    })
  }
})

// ======================================================
// PATCH /api/usuarios/:id/estado
// Activar o desactivar usuario
// ======================================================
router.patch('/:id/estado', (req, res) => {
  try {
    const id = Number(req.params.id)
    const { activo } = req.body

    const usuario = db.prepare(`
      SELECT id
      FROM usuarios
      WHERE id = ?
    `).get(id)

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado.'
      })
    }

    // Evitar que el administrador desactive
    // accidentalmente su propia sesión.
    if (Number(req.usuario.id) === id && !activo) {
      return res.status(400).json({
        error:
          'No puede desactivar su propio usuario.'
      })
    }

    db.prepare(`
      UPDATE usuarios
      SET activo = ?
      WHERE id = ?
    `).run(activo ? 1 : 0, id)

    const actualizado = db.prepare(`
      SELECT
        id,
        nombre,
        correo,
        rol,
        activo,
        id_docente,
        creado_en
      FROM usuarios
      WHERE id = ?
    `).get(id)

    res.json(actualizado)
  } catch (error) {
    console.error(
      'Error al cambiar estado del usuario:',
      error
    )

    res.status(500).json({
      error:
        'No se pudo cambiar el estado del usuario.'
    })
  }
})

export default router