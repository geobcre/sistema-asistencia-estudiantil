import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

describe('Ciclos, grupos, asignaturas y asignaciones académicas', () => {
  let admin
  let docente

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  describe('Ciclos escolares', () => {
    it('lista y obtiene un ciclo por ID', async () => {
      const listado = await conToken(request(app).get('/api/ciclos'), docente)
      expect(listado.status).toBe(200)
      expect(listado.body[0]).toMatchObject({ anio: 2026, estado: 'Activo' })

      const detalle = await conToken(
        request(app).get(`/api/ciclos/${listado.body[0].id_ciclo}`), docente
      )
      expect(detalle.status).toBe(200)
      expect(detalle.body.id_ciclo).toBe(listado.body[0].id_ciclo)
    })

    it('permite crear y actualizar ciclos al administrador', async () => {
      const creado = await conToken(request(app).post('/api/ciclos'), admin)
        .send({ anio: 2030, estado: 'Planificado' })
      expect(creado.status).toBe(201)

      const actualizado = await conToken(
        request(app).put(`/api/ciclos/${creado.body.id_ciclo}`), admin
      ).send({ anio: 2031, estado: 'Activo' })
      expect(actualizado.status).toBe(200)
      expect(actualizado.body).toMatchObject({ anio: 2031, estado: 'Activo' })
    })

    it('controla el año duplicado', async () => {
      const res = await conToken(request(app).post('/api/ciclos'), admin)
        .send({ anio: 2026, estado: 'Planificado' })
      expect(res.status).toBe(409)
    })

    it('impide al docente escribir ciclos', async () => {
      const res = await conToken(request(app).post('/api/ciclos'), docente)
        .send({ anio: 2040, estado: 'Planificado' })
      expect(res.status).toBe(403)
    })
  })

  describe('Grupos', () => {
    it('lista y obtiene grupos con información del ciclo', async () => {
      const listado = await conToken(request(app).get('/api/grupos'), docente)
      expect(listado.status).toBe(200)
      expect(listado.body[0]).toMatchObject({ ciclo_anio: 2026, ciclo_estado: 'Activo' })

      const detalle = await conToken(
        request(app).get(`/api/grupos/${listado.body[0].id_grupo}`), docente
      )
      expect(detalle.status).toBe(200)
      expect(detalle.body).toHaveProperty('id_ciclo')
    })

    it('permite crear y actualizar grupos al administrador', async () => {
      const creado = await conToken(request(app).post('/api/grupos'), admin)
        .send({ grado: 5, seccion: 'c', id_ciclo: 1 })
      expect(creado.status).toBe(201)
      expect(creado.body.seccion).toBe('C')

      const actualizado = await conToken(
        request(app).put(`/api/grupos/${creado.body.id_grupo}`), admin
      ).send({ grado: 5, seccion: 'D', id_ciclo: 1 })
      expect(actualizado.status).toBe(200)
      expect(actualizado.body.seccion).toBe('D')
    })

    it('controla grupos duplicados dentro del mismo ciclo', async () => {
      const res = await conToken(request(app).post('/api/grupos'), admin)
        .send({ grado: 4, seccion: 'a', id_ciclo: 1 })
      expect(res.status).toBe(409)
    })

    it('rechaza un ciclo inexistente e impide escritura docente', async () => {
      const referencia = await conToken(request(app).post('/api/grupos'), admin)
        .send({ grado: 6, seccion: 'A', id_ciclo: 99999 })
      const permiso = await conToken(request(app).post('/api/grupos'), docente)
        .send({ grado: 6, seccion: 'B', id_ciclo: 1 })
      expect(referencia.status).toBe(400)
      expect(permiso.status).toBe(403)
    })
  })

  describe('Asignaturas', () => {
    it('lista y obtiene una asignatura por ID', async () => {
      const listado = await conToken(request(app).get('/api/asignaturas'), docente)
      expect(listado.status).toBe(200)
      const asignatura = listado.body.find((item) => item.codigo === 'MAT-101')
      const detalle = await conToken(
        request(app).get(`/api/asignaturas/${asignatura.id_asignatura}`), docente
      )
      expect(detalle.status).toBe(200)
      expect(detalle.body.codigo).toBe('MAT-101')
    })

    it('permite crear, actualizar e inactivar una asignatura', async () => {
      const creado = await conToken(request(app).post('/api/asignaturas'), admin)
        .send({ nombre: 'Arte', codigo: 'art-201' })
      expect(creado.status).toBe(201)
      expect(creado.body.codigo).toBe('ART-201')

      const actualizado = await conToken(
        request(app).put(`/api/asignaturas/${creado.body.id_asignatura}`), admin
      ).send({ nombre: 'Artes Plásticas', codigo: 'ART-202', estado: 'Activa' })
      expect(actualizado.status).toBe(200)

      const baja = await conToken(
        request(app).delete(`/api/asignaturas/${creado.body.id_asignatura}`), admin
      )
      expect(baja.status).toBe(200)
      expect(baja.body.estado).toBe('Inactiva')
    })

    it('controla el código duplicado', async () => {
      const res = await conToken(request(app).post('/api/asignaturas'), admin)
        .send({ nombre: 'Otra Matemática', codigo: 'mat-101' })
      expect(res.status).toBe(409)
    })

    it('impide al docente escribir asignaturas', async () => {
      const res = await conToken(request(app).post('/api/asignaturas'), docente)
        .send({ nombre: 'No permitida', codigo: 'NO-101' })
      expect(res.status).toBe(403)
    })
  })

  describe('Asignaciones académicas', () => {
    it('permite al administrador listar asignaciones con detalles completos', async () => {
      const res = await conToken(request(app).get('/api/asignaciones-academicas'), admin)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(3)
      expect(res.body[0]).toMatchObject({
        asignatura_nombre: expect.any(String),
        docente_nombre: expect.any(String),
        grado: expect.any(Number),
        ciclo_anio: 2026,
      })
    })

    it('filtra el listado del docente por id_docente', async () => {
      const login = await request(app).post('/api/auth/login')
        .send({ correo: 'msolis@escuela.edu', password: 'Docente123*' })
      const res = await conToken(request(app).get('/api/asignaciones-academicas'), docente)
      expect(res.status).toBe(200)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body.every((item) => item.id_docente === login.body.usuario.id_docente)).toBe(true)
    })

    it('permite consultar una asignación propia y rechaza una ajena', async () => {
      const propia = db.prepare(`
        SELECT id_asignacion FROM asignaciones_academicas WHERE id_docente = 1 LIMIT 1
      `).get()
      const ajena = db.prepare(`
        SELECT id_asignacion FROM asignaciones_academicas WHERE id_docente <> 1 LIMIT 1
      `).get()
      const resPropia = await conToken(
        request(app).get(`/api/asignaciones-academicas/${propia.id_asignacion}`), docente
      )
      const resAjena = await conToken(
        request(app).get(`/api/asignaciones-academicas/${ajena.id_asignacion}`), docente
      )
      expect(resPropia.status).toBe(200)
      expect(resAjena.status).toBe(403)
    })

    it('permite al administrador crear, actualizar e inactivar asignaciones', async () => {
      const creado = await conToken(request(app).post('/api/asignaciones-academicas'), admin)
        .send({
          id_asignatura: 1, id_docente: 1, id_grupo: 1,
          horario: 'Viernes 11:00', fecha_inicio: '2026-09-01'
        })
      expect(creado.status).toBe(201)
      expect(creado.body).toMatchObject({ asignatura_codigo: 'MAT-101', docente_nombre: 'Marta' })

      const actualizado = await conToken(
        request(app).put(`/api/asignaciones-academicas/${creado.body.id_asignacion}`), admin
      ).send({
        id_asignatura: 1, id_docente: 1, id_grupo: 1,
        horario: 'Viernes 12:00', fecha_inicio: '2026-09-01',
        fecha_fin: '2026-11-30', estado: 'Activa'
      })
      expect(actualizado.status).toBe(200)
      expect(actualizado.body.horario).toBe('Viernes 12:00')

      const baja = await conToken(
        request(app).delete(`/api/asignaciones-academicas/${creado.body.id_asignacion}`), admin
      )
      expect(baja.status).toBe(200)
      expect(baja.body.estado).toBe('Inactiva')
    })

    it('rechaza referencias inexistentes', async () => {
      const res = await conToken(request(app).post('/api/asignaciones-academicas'), admin)
        .send({
          id_asignatura: 99999, id_docente: 1, id_grupo: 1,
          fecha_inicio: '2026-09-01'
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('asignatura')
    })

    it('rechaza entidades inactivas y ciclos finalizados', async () => {
      const asignatura = db.prepare(`
        INSERT INTO asignaturas (nombre, codigo, estado) VALUES ('Inactiva', 'INA-101', 'Inactiva')
      `).run().lastInsertRowid
      const ciclo = db.prepare(`
        INSERT INTO ciclos_escolares (anio, estado) VALUES (2041, 'Finalizado')
      `).run().lastInsertRowid
      const grupo = db.prepare(`
        INSERT INTO grupos (grado, seccion, id_ciclo) VALUES (1, 'Z', ?)
      `).run(ciclo).lastInsertRowid

      const inactiva = await conToken(request(app).post('/api/asignaciones-academicas'), admin)
        .send({ id_asignatura: asignatura, id_docente: 1, id_grupo: 1, fecha_inicio: '2026-09-01' })
      const finalizado = await conToken(request(app).post('/api/asignaciones-academicas'), admin)
        .send({ id_asignatura: 1, id_docente: 1, id_grupo: grupo, fecha_inicio: '2041-01-10' })
      expect(inactiva.status).toBe(400)
      expect(finalizado.status).toBe(400)
    })

    it('impide al docente crear, modificar o inactivar asignaciones', async () => {
      const crear = await conToken(request(app).post('/api/asignaciones-academicas'), docente)
        .send({ id_asignatura: 1, id_docente: 1, id_grupo: 1, fecha_inicio: '2026-09-01' })
      const editar = await conToken(request(app).put('/api/asignaciones-academicas/1'), docente)
        .send({ id_asignatura: 1, id_docente: 1, id_grupo: 1, fecha_inicio: '2026-01-20' })
      const borrar = await conToken(request(app).delete('/api/asignaciones-academicas/1'), docente)
      expect([crear.status, editar.status, borrar.status]).toEqual([403, 403, 403])
    })
  })
})
