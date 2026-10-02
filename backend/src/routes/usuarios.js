import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { permitirRoles } from '../middleware/auth.js'

const router = Router()
const rolesValidos = ['administrador', 'docente']

router.use(permitirRoles('administrador'))

const consultaUsuario = `
  SELECT
    u.id_usuario,
    u.nombre,
    u.correo,
    u.rol,
    u.activo,
    u.id_docente,
    u.creado_en,
    d.nombre AS docente_nombre,
    d.apellido AS docente_apellido
  FROM usuarios u
  LEFT JOIN docentes d ON d.id_docente = u.id_docente
`

function buscarUsuario(id) {
  return db.prepare(`${consultaUsuario} WHERE u.id_usuario = ?`).get(id)
}

function validarBase({ nombre, correo, rol }) {
  if (!nombre?.trim() || !correo?.trim() || !rol) {
    return 'Nombre, correo y rol son obligatorios.'
  }
  if (!rolesValidos.includes(rol)) return 'El rol seleccionado no es válido.'
  return null
}

function validarDocente(idDocente, idUsuario = null) {
  if (!idDocente) return { error: 'Debe seleccionar el docente asociado.' }

  const docente = db.prepare(`
    SELECT id_docente FROM docentes WHERE id_docente = ?
  `).get(idDocente)
  if (!docente) return { error: 'El docente seleccionado no existe.' }

  const asociado = db.prepare(`
    SELECT id_usuario FROM usuarios
    WHERE id_docente = ? AND (? IS NULL OR id_usuario <> ?)
  `).get(idDocente, idUsuario, idUsuario)
  if (asociado) return { conflicto: 'Este docente ya tiene un usuario asociado.' }

  return { id: Number(idDocente) }
}

router.get('/', (req, res) => {
  res.json(db.prepare(`${consultaUsuario} ORDER BY u.id_usuario`).all())
})

router.get('/:id', (req, res) => {
  const usuario = buscarUsuario(req.params.id)
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' })
  return res.json(usuario)
})

router.post('/', (req, res) => {
  const { nombre, correo, password, rol, idDocente } = req.body
  const error = validarBase({ nombre, correo, rol })
  if (error || !password) {
    return res.status(400).json({
      error: error || 'La contraseña es obligatoria.'
    })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' })
  }

  let idDocenteFinal = null
  if (rol === 'docente') {
    const validacion = validarDocente(idDocente)
    if (validacion.error) return res.status(400).json({ error: validacion.error })
    if (validacion.conflicto) return res.status(409).json({ error: validacion.conflicto })
    idDocenteFinal = validacion.id
  }

  try {
    const info = db.prepare(`
      INSERT INTO usuarios
        (nombre, correo, password_hash, rol, activo, id_docente)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      nombre.trim(),
      correo.trim().toLowerCase(),
      bcrypt.hashSync(password, 12),
      rol,
      idDocenteFinal
    )
    return res.status(201).json(buscarUsuario(info.lastInsertRowid))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo o docente.' })
    }
    throw errorSql
  }
})

router.put('/:id', (req, res) => {
  const id = Number(req.params.id)
  const actual = buscarUsuario(id)
  if (!actual) return res.status(404).json({ error: 'Usuario no encontrado.' })

  const { nombre, correo, password, rol, activo, idDocente } = req.body
  const error = validarBase({ nombre, correo, rol })
  if (error) return res.status(400).json({ error })
  if (password && password.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  }

  let idDocenteFinal = null
  if (rol === 'docente') {
    const validacion = validarDocente(idDocente, id)
    if (validacion.error) return res.status(400).json({ error: validacion.error })
    if (validacion.conflicto) return res.status(409).json({ error: validacion.conflicto })
    idDocenteFinal = validacion.id
  }

  const activoFinal = activo === false || activo === 0 || activo === '0' ? 0 : 1

  try {
    if (password) {
      db.prepare(`
        UPDATE usuarios
        SET nombre = ?, correo = ?, password_hash = ?, rol = ?, activo = ?, id_docente = ?
        WHERE id_usuario = ?
      `).run(
        nombre.trim(), correo.trim().toLowerCase(), bcrypt.hashSync(password, 12),
        rol, activoFinal, idDocenteFinal, id
      )
    } else {
      db.prepare(`
        UPDATE usuarios
        SET nombre = ?, correo = ?, rol = ?, activo = ?, id_docente = ?
        WHERE id_usuario = ?
      `).run(nombre.trim(), correo.trim().toLowerCase(), rol, activoFinal, idDocenteFinal, id)
    }
    return res.json(buscarUsuario(id))
  } catch (errorSql) {
    if (errorSql.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo o docente.' })
    }
    throw errorSql
  }
})

router.patch('/:id/estado', (req, res) => {
  const id = Number(req.params.id)
  if (!buscarUsuario(id)) return res.status(404).json({ error: 'Usuario no encontrado.' })

  const { activo } = req.body
  if (![true, false, 1, 0, '1', '0'].includes(activo)) {
    return res.status(400).json({ error: 'El estado activo debe ser verdadero o falso.' })
  }
  const activoFinal = activo === true || activo === 1 || activo === '1' ? 1 : 0
  if (Number(req.usuario.id) === id && activoFinal === 0) {
    return res.status(400).json({ error: 'No puede desactivar su propio usuario.' })
  }

  db.prepare('UPDATE usuarios SET activo = ? WHERE id_usuario = ?').run(activoFinal, id)
  return res.json(buscarUsuario(id))
})

export default router
