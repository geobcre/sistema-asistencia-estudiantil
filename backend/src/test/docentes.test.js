// Pruebas automatizadas del módulo de Docentes (RF-05 del PAQ).
// QA.md lo listaba como cobertura pendiente (solo pruebas manuales hasta ahora).
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('Módulo de Docentes', () => {
  it('CP-09: crea un docente y lo devuelve con los datos enviados', async () => {
    const res = await request(app)
      .post('/api/docentes')
      .send({ nombre: 'Carla', apellido: 'Núñez', correo: 'cnunez@escuela.edu' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ nombre: 'Carla', apellido: 'Núñez', correo: 'cnunez@escuela.edu' })
    expect(res.body.id).toBeDefined()
  })

  it('rechaza crear un docente sin nombre o apellido', async () => {
    const res = await request(app).post('/api/docentes').send({ correo: 'sin-nombre@escuela.edu' })

    expect(res.status).toBe(400)
  })

  it('actualiza los datos de un docente existente', async () => {
    const creado = await request(app).post('/api/docentes').send({ nombre: 'Temporal', apellido: 'Uno' })

    const actualizado = await request(app)
      .put(`/api/docentes/${creado.body.id}`)
      .send({ nombre: 'Temporal', apellido: 'Dos', correo: 'nuevo@escuela.edu' })

    expect(actualizado.status).toBe(200)
    expect(actualizado.body).toMatchObject({ apellido: 'Dos', correo: 'nuevo@escuela.edu' })
  })

  it('elimina un docente y deja de aparecer en el listado', async () => {
    const creado = await request(app).post('/api/docentes').send({ nombre: 'Borrar', apellido: 'Este' })

    const eliminar = await request(app).delete(`/api/docentes/${creado.body.id}`)
    expect(eliminar.status).toBe(204)

    const listado = await request(app).get('/api/docentes')
    const encontrado = listado.body.find((d) => d.id === creado.body.id)
    expect(encontrado).toBeUndefined()
  })
})
