import request from 'supertest'
import { app } from '../app.js'

export async function tokenAdministrador() {
  const respuesta = await request(app).post('/api/auth/login')
    .send({ correo: 'admin@escuela.edu', password: 'Admin123*' })
  return respuesta.body.token
}

export async function tokenDocente() {
  const respuesta = await request(app).post('/api/auth/login')
    .send({ correo: 'msolis@escuela.edu', password: 'Docente123*' })
  return respuesta.body.token
}

export function conToken(solicitud, token) {
  return solicitud.set('Authorization', `Bearer ${token}`)
}
