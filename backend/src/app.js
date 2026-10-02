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
import usuariosRouter from './routes/usuarios.js'
import ciclosRouter from './routes/ciclos.js'
import gruposRouter from './routes/grupos.js'
import asignaturasRouter from './routes/asignaturas.js'
import asignacionesAcademicasRouter from './routes/asignaciones-academicas.js'

import { verificarToken } from './middleware/auth.js'

export const app = express()

// ========================================
// MIDDLEWARES GENERALES
// ========================================

app.use(cors())
app.use(express.json())

// ========================================
// RUTA DE SALUD
// ========================================

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

// Todo lo que esté después de esta línea
// requiere haber iniciado sesión.
app.use(verificarToken)

app.use('/api/usuarios', usuariosRouter)
app.use('/api/docentes', docentesRouter)
app.use('/api/estudiantes', estudiantesRouter)
app.use('/api/ciclos', ciclosRouter)
app.use('/api/grupos', gruposRouter)
app.use('/api/asignaturas', asignaturasRouter)
app.use('/api/asignaciones-academicas', asignacionesAcademicasRouter)
app.use('/api/cursos', cursosRouter)
app.use('/api/sesiones', sesionesRouter)
app.use('/api/estadisticas', estadisticasRouter)
app.use('/api/reportes', reportesRouter)
