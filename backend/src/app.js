import express from 'express'
import cors from 'cors'
import './db.js'

import docentesRouter from './routes/docentes.js'
import estudiantesRouter from './routes/estudiantes.js'
import cursosRouter from './routes/cursos.js'
import sesionesRouter from './routes/sesiones.js'
import estadisticasRouter from './routes/estadisticas.js'
import reportesRouter from './routes/reportes.js'
import authRouter from './routes/auth.js'

import { verificarToken } from './middleware/auth.js'

export const app = express()

// Middlewares generales
app.use(cors())
app.use(express.json())

// Ruta para comprobar que el backend está funcionando
app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// ========================================
// RUTAS PÚBLICAS
// ========================================

// Login: no requiere token
app.use('/api/auth', authRouter)

// ========================================
// RUTAS PROTEGIDAS
// ========================================

// Todas estas rutas requieren haber iniciado sesión
app.use('/api/docentes', verificarToken, docentesRouter)
app.use('/api/estudiantes', verificarToken, estudiantesRouter)
app.use('/api/cursos', verificarToken, cursosRouter)
app.use('/api/sesiones', verificarToken, sesionesRouter)
app.use('/api/estadisticas', verificarToken, estadisticasRouter)
app.use('/api/reportes', verificarToken, reportesRouter)
