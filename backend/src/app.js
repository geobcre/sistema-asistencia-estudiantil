import express from 'express'
import cors from 'cors'
import './db.js'

import docentesRouter from './routes/docentes.js'
import estudiantesRouter from './routes/estudiantes.js'
import cursosRouter from './routes/cursos.js'
import sesionesRouter from './routes/sesiones.js'
import estadisticasRouter from './routes/estadisticas.js'
import reportesRouter from './routes/reportes.js'

export const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/docentes', docentesRouter)
app.use('/api/estudiantes', estudiantesRouter)
app.use('/api/cursos', cursosRouter)
app.use('/api/sesiones', sesionesRouter)
app.use('/api/estadisticas', estadisticasRouter)
app.use('/api/reportes', reportesRouter)
