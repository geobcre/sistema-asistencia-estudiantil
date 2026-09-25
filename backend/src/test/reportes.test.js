// Pruebas automatizadas del módulo de Reportes (RF-05 del PAQ).
// QA.md lo listaba como cobertura pendiente (solo pruebas manuales hasta ahora).
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

async function crearEscenario() {
  const cursoA = await request(app).post('/api/cursos').send({ nombre: 'Reportes Curso A' })
  const cursoB = await request(app).post('/api/cursos').send({ nombre: 'Reportes Curso B' })
  const estudiante = await request(app).post('/api/estudiantes').send({ nombre: 'Reporte', apellido: 'Test' })

  await request(app).post(`/api/cursos/${cursoA.body.id}/inscripciones`).send({ idEstudiante: estudiante.body.id })
  await request(app).post(`/api/cursos/${cursoB.body.id}/inscripciones`).send({ idEstudiante: estudiante.body.id })

  const sesionA1 = await request(app).post(`/api/cursos/${cursoA.body.id}/sesiones`).send({ fecha: '2026-05-01' })
  const sesionA2 = await request(app).post(`/api/cursos/${cursoA.body.id}/sesiones`).send({ fecha: '2026-06-01' })
  const sesionB1 = await request(app).post(`/api/cursos/${cursoB.body.id}/sesiones`).send({ fecha: '2026-05-15' })

  await request(app).post(`/api/sesiones/${sesionA1.body.id}/asistencia`).send({ idEstudiante: estudiante.body.id, estado: 'presente' })
  await request(app).post(`/api/sesiones/${sesionA2.body.id}/asistencia`).send({ idEstudiante: estudiante.body.id, estado: 'ausente' })
  await request(app).post(`/api/sesiones/${sesionB1.body.id}/asistencia`).send({ idEstudiante: estudiante.body.id, estado: 'tarde' })

  return { cursoA: cursoA.body, cursoB: cursoB.body, estudiante: estudiante.body }
}

describe('Módulo de Reportes', () => {
  it('CP-11: sin filtros devuelve registros de todos los cursos', async () => {
    const { cursoA, cursoB } = await crearEscenario()

    const res = await request(app).get('/api/reportes')

    expect(res.status).toBe(200)
    const idsCursos = new Set(res.body.map((r) => r.id_curso))
    expect(idsCursos.has(cursoA.id)).toBe(true)
    expect(idsCursos.has(cursoB.id)).toBe(true)
  })

  it('filtra los registros por curso', async () => {
    const { cursoA, cursoB } = await crearEscenario()

    const res = await request(app).get('/api/reportes').query({ curso: cursoA.id })

    expect(res.status).toBe(200)
    expect(res.body.every((r) => r.id_curso === cursoA.id)).toBe(true)
    expect(res.body.some((r) => r.id_curso === cursoB.id)).toBe(false)
  })

  it('filtra los registros por rango de fechas', async () => {
    const { cursoA } = await crearEscenario()

    const res = await request(app)
      .get('/api/reportes')
      .query({ curso: cursoA.id, desde: '2026-05-01', hasta: '2026-05-31' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].fecha).toBe('2026-05-01')
  })

  it('filtra los registros por estudiante', async () => {
    const { estudiante } = await crearEscenario()
    const otro = await request(app).post('/api/estudiantes').send({ nombre: 'Otro', apellido: 'Alumno' })

    const res = await request(app).get('/api/reportes').query({ estudiante: estudiante.id })

    expect(res.status).toBe(200)
    expect(res.body.every((r) => r.id_estudiante === estudiante.id)).toBe(true)
    expect(res.body.some((r) => r.id_estudiante === otro.body.id)).toBe(false)
  })
})
