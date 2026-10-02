import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

describe('Administración de usuarios', () => {
  let admin
  let docente

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  it('lista usuarios sin exponer password_hash', async () => {
    const res = await conToken(request(app).get('/api/usuarios'), admin)
    expect(res.status).toBe(200)
    expect(res.body[0]).toHaveProperty('id_usuario')
    expect(res.body[0]).not.toHaveProperty('password_hash')
  })

  it('crea y consulta un administrador sin docente', async () => {
    const creado = await conToken(request(app).post('/api/usuarios'), admin).send({
      nombre: 'Administrador Dos', correo: 'admin2@escuela.edu',
      password: 'AdminDos123*', rol: 'administrador', idDocente: 1
    })
    expect(creado.status).toBe(201)
    expect(creado.body).toMatchObject({ rol: 'administrador', id_docente: null, activo: 1 })
    expect(creado.body).not.toHaveProperty('password_hash')
    const consulta = await conToken(request(app).get(`/api/usuarios/${creado.body.id_usuario}`), admin)
    expect(consulta.status).toBe(200)
  })

  it('crea un usuario docente asociado a un docente disponible', async () => {
    const hugo = db.prepare("SELECT id_docente FROM docentes WHERE correo = 'hramirez@escuela.edu'").get()
    const res = await conToken(request(app).post('/api/usuarios'), admin).send({
      nombre: 'Hugo Ramírez', correo: 'hugo.usuario@escuela.edu',
      password: 'HugoUsuario123*', rol: 'docente', idDocente: hugo.id_docente
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ rol: 'docente', id_docente: hugo.id_docente })
  })

  it('exige docente para el rol docente', async () => {
    const res = await conToken(request(app).post('/api/usuarios'), admin).send({
      nombre: 'Sin Docente', correo: 'sin.docente@escuela.edu',
      password: 'SinDocente123*', rol: 'docente'
    })
    expect(res.status).toBe(400)
  })

  it('controla correo y asociación docente duplicados', async () => {
    const correo = await conToken(request(app).post('/api/usuarios'), admin).send({
      nombre: 'Correo Duplicado', correo: 'admin@escuela.edu',
      password: 'Duplicado123*', rol: 'administrador'
    })
    const marta = db.prepare("SELECT id_docente FROM docentes WHERE correo = 'msolis@escuela.edu'").get()
    const asociacion = await conToken(request(app).post('/api/usuarios'), admin).send({
      nombre: 'Otra Marta', correo: 'otra.marta@escuela.edu',
      password: 'OtraMarta123*', rol: 'docente', idDocente: marta.id_docente
    })
    expect(correo.status).toBe(409)
    expect(asociacion.status).toBe(409)
  })

  it('actualiza un usuario sin exponer su hash', async () => {
    const creado = await conToken(request(app).post('/api/usuarios'), admin).send({
      nombre: 'Usuario Editable', correo: 'editable@escuela.edu',
      password: 'Editable123*', rol: 'administrador'
    })
    const res = await conToken(request(app).put(`/api/usuarios/${creado.body.id_usuario}`), admin).send({
      nombre: 'Usuario Editado', correo: 'editado@escuela.edu',
      password: 'Editado123*', rol: 'administrador', activo: 1
    })
    expect(res.status).toBe(200)
    expect(res.body.nombre).toBe('Usuario Editado')
    expect(res.body).not.toHaveProperty('password_hash')
  })

  it('activa o desactiva usuarios pero no permite auto-desactivarse', async () => {
    const creado = await conToken(request(app).post('/api/usuarios'), admin).send({
      nombre: 'Desactivable', correo: 'desactivable@escuela.edu',
      password: 'Desactivar123*', rol: 'administrador'
    })
    const desactivado = await conToken(
      request(app).patch(`/api/usuarios/${creado.body.id_usuario}/estado`), admin
    ).send({ activo: false })
    expect(desactivado.status).toBe(200)
    expect(desactivado.body.activo).toBe(0)

    const adminActual = db.prepare("SELECT id_usuario FROM usuarios WHERE correo = 'admin@escuela.edu'").get()
    const propio = await conToken(
      request(app).patch(`/api/usuarios/${adminActual.id_usuario}/estado`), admin
    ).send({ activo: false })
    expect(propio.status).toBe(400)
  })

  it('impide al docente administrar usuarios', async () => {
    const res = await conToken(request(app).get('/api/usuarios'), docente)
    expect(res.status).toBe(403)
  })
})
