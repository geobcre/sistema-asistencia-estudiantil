// Pruebas automatizadas del módulo de Estudiantes (RF-05 del PAQ).
// QA.md lo listaba como cobertura pendiente (solo pruebas manuales hasta ahora).
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('Módulo de Estudiantes', () => {
  it('CP-10: crea un estudiante y lo devuelve con los datos enviados', async () => {
    const res = await request(app)
      .post('/api/estudiantes')
      .send({ nombre: 'Renata', apellido: 'Flores', carne: 'EST-099' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ nombre: 'Renata', apellido: 'Flores', carne: 'EST-099' })
    expect(res.body.id).toBeDefined()
  })

  it('rechaza crear un estudiante sin nombre o apellido', async () => {
    const res = await request(app).post('/api/estudiantes').send({ carne: 'EST-100' })

    expect(res.status).toBe(400)
  })

  it('actualiza los datos de un estudiante existente', async () => {
    const creado = await request(app).post('/api/estudiantes').send({ nombre: 'Temporal', apellido: 'Uno' })

    const actualizado = await request(app)
      .put(`/api/estudiantes/${creado.body.id}`)
      .send({ nombre: 'Temporal', apellido: 'Dos', carne: 'EST-101' })

    expect(actualizado.status).toBe(200)
    expect(actualizado.body).toMatchObject({ apellido: 'Dos', carne: 'EST-101' })
  })

  it('elimina un estudiante y deja de aparecer en el listado', async () => {
    const creado = await request(app).post('/api/estudiantes').send({ nombre: 'Borrar', apellido: 'Este' })

    const eliminar = await request(app).delete(`/api/estudiantes/${creado.body.id}`)
    expect(eliminar.status).toBe(204)

    const listado = await request(app).get('/api/estudiantes')
    const encontrado = listado.body.find((e) => e.id === creado.body.id)
    expect(encontrado).toBeUndefined()
  })

  it('el historial de asistencia de un estudiante recien creado (sin sesiones) llega vacio', async () => {
    const creado = await request(app).post('/api/estudiantes').send({ nombre: 'Sin', apellido: 'Historial' })

    const historial = await request(app).get(`/api/estudiantes/${creado.body.id}/asistencia`)

    expect(historial.status).toBe(200)
    expect(historial.body).toEqual([])
  })

  it('el historial de asistencia refleja los registros marcados en sus cursos', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso historial' })
    const estudiante = await request(app).post('/api/estudiantes').send({ nombre: 'Con', apellido: 'Historial' })
    await request(app)
      .post(`/api/cursos/${curso.body.id}/inscripciones`)
      .send({ idEstudiante: estudiante.body.id })

    const sesion = await request(app)
      .post(`/api/cursos/${curso.body.id}/sesiones`)
      .send({ fecha: '2026-09-15' })
    await request(app)
      .post(`/api/sesiones/${sesion.body.id}/asistencia`)
      .send({ idEstudiante: estudiante.body.id, estado: 'presente' })

    const historial = await request(app).get(`/api/estudiantes/${estudiante.body.id}/asistencia`)

    expect(historial.status).toBe(200)
    expect(historial.body).toHaveLength(1)
    expect(historial.body[0]).toMatchObject({ estado: 'presente', id_curso: curso.body.id, fecha: '2026-09-15' })
  })
})
