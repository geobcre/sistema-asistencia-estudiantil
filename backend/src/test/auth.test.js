import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'

describe('Autenticación y autorización', () => {
  it('inicia sesión como administrador y genera un JWT de 8 horas', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ correo: 'admin@escuela.edu', password: 'Admin123*' })
    expect(res.status).toBe(200)
    expect(res.body.usuario).toMatchObject({ rol: 'administrador', id_docente: null })
    expect(res.body.usuario).not.toHaveProperty('password_hash')
    const payload = jwt.decode(res.body.token)
    expect(payload).toMatchObject({ id: res.body.usuario.id, rol: 'administrador', id_docente: null })
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60)
  })

  it('inicia sesión como docente con su relación docente', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ correo: 'msolis@escuela.edu', password: 'Docente123*' })
    expect(res.status).toBe(200)
    expect(res.body.usuario.rol).toBe('docente')
    expect(res.body.usuario.id_docente).toBeTypeOf('number')
    expect(jwt.decode(res.body.token).id_docente).toBe(res.body.usuario.id_docente)
  })

  it('rechaza credenciales incorrectas sin exponer el motivo', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ correo: 'admin@escuela.edu', password: 'Incorrecta' })
    expect(res.status).toBe(401)
    expect(res.body.error).toContain('Correo o contraseña')
  })

  it('rechaza un usuario inactivo', async () => {
    const docente = db.prepare(`
      SELECT id_docente FROM docentes WHERE correo = 'hramirez@escuela.edu'
    `).get()
    db.prepare(`
      INSERT INTO usuarios (nombre, correo, password_hash, rol, activo, id_docente)
      VALUES (?, ?, ?, 'docente', 0, ?)
    `).run('Hugo Ramírez', 'hugo.inactivo@escuela.edu', bcrypt.hashSync('Inactivo123*', 4), docente.id_docente)

    const res = await request(app).post('/api/auth/login')
      .send({ correo: 'hugo.inactivo@escuela.edu', password: 'Inactivo123*' })
    expect(res.status).toBe(403)
  })

  it('protege rutas cuando falta el token', async () => {
    const res = await request(app).get('/api/docentes')
    expect(res.status).toBe(401)
  })

  it('distingue permisos de administrador y docente', async () => {
    const adminLogin = await request(app).post('/api/auth/login')
      .send({ correo: 'admin@escuela.edu', password: 'Admin123*' })
    const docenteLogin = await request(app).post('/api/auth/login')
      .send({ correo: 'msolis@escuela.edu', password: 'Docente123*' })

    const admin = await request(app).get('/api/usuarios')
      .set('Authorization', `Bearer ${adminLogin.body.token}`)
    const docente = await request(app).get('/api/usuarios')
      .set('Authorization', `Bearer ${docenteLogin.body.token}`)
    expect(admin.status).toBe(200)
    expect(docente.status).toBe(403)
  })
})
