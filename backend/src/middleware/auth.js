import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'clave-desarrollo-asistencia'

export function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado. Debe iniciar sesión.'
      })
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(token, JWT_SECRET)

    req.usuario = decoded

    next()
  } catch (error) {
    return res.status(401).json({
      error: 'Sesión inválida o expirada.'
    })
  }
}