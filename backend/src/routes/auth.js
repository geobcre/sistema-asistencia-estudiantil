import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'clave-desarrollo-asistencia'

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { correo, password } = req.body

    // Validar campos obligatorios
    if (!correo || !password) {
      return res.status(400).json({
        error: 'El correo y la contraseña son obligatorios.'
      })
    }

    // Buscar usuario por correo
    const usuario = db.prepare(`
      SELECT
        id,
        nombre,
        correo,
        password,
        rol,
        activo,
        id_docente
      FROM usuarios
      WHERE LOWER(correo) = LOWER(?)
    `).get(correo.trim())

    // No revelar si el correo existe o no
    if (!usuario) {
      return res.status(401).json({
        error: 'Correo o contraseña incorrectos.'
      })
    }

    // Verificar que la cuenta esté activa
    if (usuario.activo !== 1) {
      return res.status(403).json({
        error: 'La cuenta se encuentra desactivada.'
      })
    }

    // Comparar contraseña con el hash almacenado
    const passwordCorrecta = bcrypt.compareSync(
      password,
      usuario.password
    )

    if (!passwordCorrecta) {
      return res.status(401).json({
        error: 'Correo o contraseña incorrectos.'
      })
    }

    // Generar token
    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol,
        id_docente: usuario.id_docente
      },
      JWT_SECRET,
      {
        expiresIn: '8h'
      }
    )

    // Nunca devolver el hash de la contraseña
    return res.json({
      mensaje: 'Inicio de sesión correcto.',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        id_docente: usuario.id_docente
      }
    })
  } catch (error) {
    console.error('Error al iniciar sesión:', error)

    return res.status(500).json({
      error: 'Ocurrió un error al iniciar sesión.'
    })
  }
})

export default router