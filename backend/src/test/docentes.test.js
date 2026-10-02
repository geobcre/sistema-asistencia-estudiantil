import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

describe('Docentes', () => {
  let admin
  let docente

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  it('lista docentes para un usuario autenticado', async () => {
    const res = await conToken(request(app).get('/api/docentes'), docente)
    expect(res.status).toBe(200)
    expect(res.body[0]).toHaveProperty('id_docente')
    expect(res.body[0]).toHaveProperty('estado')
  })

  it('permite al administrador crear un docente activo', async () => {
    const res = await conToken(request(app).post('/api/docentes'), admin)
      .send({ nombre: 'Carla', apellido: 'Núñez', correo: 'cnunez@escuela.edu' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ correo: 'cnunez@escuela.edu', estado: 'Activo' })
    expect(res.body.id_docente).toBeTypeOf('number')
  })

  it('rechaza estados inválidos', async () => {
    const res = await conToken(request(app).post('/api/docentes'), admin)
      .send({ nombre: 'Estado', apellido: 'Inválido', estado: 'Suspendido' })
    expect(res.status).toBe(400)
  })

  it('controla el correo duplicado', async () => {
    const res = await conToken(request(app).post('/api/docentes'), admin)
      .send({ nombre: 'Otra', apellido: 'Marta', correo: 'msolis@escuela.edu' })
    expect(res.status).toBe(409)
  })

  it('actualiza datos y estado', async () => {
    const creado = await conToken(request(app).post('/api/docentes'), admin)
      .send({ nombre: 'Temporal', apellido: 'Uno', correo: 'temporal.docente@escuela.edu' })
    const res = await conToken(request(app).put(`/api/docentes/${creado.body.id_docente}`), admin)
      .send({ nombre: 'Temporal', apellido: 'Dos', correo: 'temporal.docente@escuela.edu', estado: 'Inactivo' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ apellido: 'Dos', estado: 'Inactivo' })
  })

  it('realiza una baja lógica y conserva el registro', async () => {
    const creado = await conToken(request(app).post('/api/docentes'), admin)
      .send({ nombre: 'Baja', apellido: 'Lógica', correo: 'baja.docente@escuela.edu' })
    const res = await conToken(request(app).delete(`/api/docentes/${creado.body.id_docente}`), admin)
    expect(res.status).toBe(200)
    expect(res.body.estado).toBe('Inactivo')
    const listado = await conToken(request(app).get('/api/docentes'), admin)
    expect(listado.body.find((d) => d.id_docente === creado.body.id_docente)).toBeDefined()
  })

  it('impide al docente administrar docentes', async () => {
    const res = await conToken(request(app).post('/api/docentes'), docente)
      .send({ nombre: 'No', apellido: 'Permitido' })
    expect(res.status).toBe(403)
  })
})
