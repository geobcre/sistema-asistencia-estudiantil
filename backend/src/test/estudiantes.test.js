import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

describe('Estudiantes', () => {
  let admin
  let docente

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  it('lista estudiantes para un usuario autenticado', async () => {
    const res = await conToken(request(app).get('/api/estudiantes'), docente)
    expect(res.status).toBe(200)
    expect(res.body[0]).toHaveProperty('id_estudiante')
  })

  it('crea un estudiante activo con carné obligatorio', async () => {
    const res = await conToken(request(app).post('/api/estudiantes'), admin)
      .send({ carne: 'EST-100', nombre: 'Renata', apellido: 'Flores' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ carne: 'EST-100', estado: 'Activo' })
  })

  it('rechaza un estudiante sin carné', async () => {
    const res = await conToken(request(app).post('/api/estudiantes'), admin)
      .send({ nombre: 'Sin', apellido: 'Carné' })
    expect(res.status).toBe(400)
  })

  it('controla el carné duplicado', async () => {
    const res = await conToken(request(app).post('/api/estudiantes'), admin)
      .send({ carne: 'EST-001', nombre: 'Duplicado', apellido: 'Prueba' })
    expect(res.status).toBe(409)
  })

  it('actualiza datos y estado', async () => {
    const creado = await conToken(request(app).post('/api/estudiantes'), admin)
      .send({ carne: 'EST-101', nombre: 'Temporal', apellido: 'Uno' })
    const res = await conToken(request(app).put(`/api/estudiantes/${creado.body.id_estudiante}`), admin)
      .send({ carne: 'EST-101', nombre: 'Temporal', apellido: 'Dos', estado: 'Inactivo' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ apellido: 'Dos', estado: 'Inactivo' })
  })

  it('realiza una baja lógica y conserva el registro', async () => {
    const creado = await conToken(request(app).post('/api/estudiantes'), admin)
      .send({ carne: 'EST-102', nombre: 'Baja', apellido: 'Lógica' })
    const res = await conToken(request(app).delete(`/api/estudiantes/${creado.body.id_estudiante}`), admin)
    expect(res.status).toBe(200)
    expect(res.body.estado).toBe('Inactivo')
    const listado = await conToken(request(app).get('/api/estudiantes'), admin)
    expect(listado.body.find((e) => e.id_estudiante === creado.body.id_estudiante)).toBeDefined()
  })

  it('impide al docente administrar estudiantes', async () => {
    const res = await conToken(request(app).post('/api/estudiantes'), docente)
      .send({ carne: 'EST-103', nombre: 'No', apellido: 'Permitido' })
    expect(res.status).toBe(403)
  })

  it('consulta el historial real con el nuevo modelo', async () => {
    const res = await conToken(request(app).get('/api/estudiantes/1/asistencia'), docente)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body.every((fila) => fila.id_docente === 1)).toBe(true)
  })

  it('mantiene 404 para el historial de un estudiante inexistente', async () => {
    const res = await conToken(request(app).get('/api/estudiantes/99999/asistencia'), admin)
    expect(res.status).toBe(404)
  })
})
