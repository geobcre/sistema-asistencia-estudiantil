import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

describe('Sesiones académicas', () => {
  let admin
  let docente

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  it('crea, lista y obtiene una sesión de una asignación activa', async () => {
    const creado = await conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: 1, fecha: '2026-09-01' })
    expect(creado.status).toBe(201)
    expect(creado.body).toMatchObject({ id_asignacion: 1, estado: 'Abierta' })

    const listado = await conToken(request(app).get('/api/sesiones'), admin)
    const detalle = await conToken(
      request(app).get(`/api/sesiones/${creado.body.id_sesion}`), admin
    )
    expect(listado.body.some((s) => s.id_sesion === creado.body.id_sesion)).toBe(true)
    expect(detalle.body.asignatura_codigo).toBe('MAT-101')
  })

  it('impide duplicar asignación y fecha', async () => {
    await conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: 1, fecha: '2026-09-02' })
    const duplicada = await conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: 1, fecha: '2026-09-02' })
    expect(duplicada.status).toBe(409)
  })

  it('rechaza una asignación inactiva', async () => {
    const id = Number(db.prepare(`
      INSERT INTO asignaciones_academicas
        (id_asignatura, id_docente, id_grupo, fecha_inicio, estado)
      VALUES (1, 1, 1, '2026-01-20', 'Inactiva')
    `).run().lastInsertRowid)
    const res = await conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: id, fecha: '2026-09-03' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('inactiva')
  })

  it('rechaza fechas fuera del período de la asignación', async () => {
    const id = Number(db.prepare(`
      INSERT INTO asignaciones_academicas
        (id_asignatura, id_docente, id_grupo, fecha_inicio, fecha_fin, estado)
      VALUES (1, 1, 1, '2026-03-01', '2026-03-31', 'Activa')
    `).run().lastInsertRowid)
    const anterior = await conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: id, fecha: '2026-02-28' })
    const posterior = await conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: id, fecha: '2026-04-01' })
    expect([anterior.status, posterior.status]).toEqual([400, 400])
  })

  it('limita al docente a sesiones de sus asignaciones', async () => {
    const propia = await conToken(request(app).post('/api/sesiones'), docente)
      .send({ id_asignacion: 1, fecha: '2026-09-04' })
    const ajena = await conToken(request(app).post('/api/sesiones'), docente)
      .send({ id_asignacion: 2, fecha: '2026-09-04' })
    const listado = await conToken(request(app).get('/api/sesiones'), docente)
    expect(propia.status).toBe(201)
    expect(ajena.status).toBe(403)
    expect(listado.body.every((sesion) => sesion.id_docente === 1)).toBe(true)
  })

  it('impide cerrar una sesión con estudiantes pendientes', async () => {
    const sesion = await conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: 1, fecha: '2026-09-05' })
    const res = await conToken(
      request(app).put(`/api/sesiones/${sesion.body.id_sesion}`), admin
    ).send({ estado: 'Cerrada' })
    expect(res.status).toBe(409)
    expect(res.body.error).toContain('pendientes')
  })

  it('cierra cuando todos los estudiantes esperados tienen asistencia', async () => {
    const sesion = await conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: 1, fecha: '2026-09-06' })
    const esperados = await conToken(
      request(app).get(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
    )
    for (const estudiante of esperados.body) {
      await conToken(
        request(app).post(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
      ).send({ id_inscripcion: estudiante.id_inscripcion, estado: 'Presente' })
    }
    const cierre = await conToken(
      request(app).put(`/api/sesiones/${sesion.body.id_sesion}`), admin
    ).send({ estado: 'Cerrada' })
    expect(cierre.status).toBe(200)
    expect(cierre.body.estado).toBe('Cerrada')
  })

  it('cancela lógicamente una sesión y deja de exigir asistencia', async () => {
    const sesion = await conToken(request(app).post('/api/sesiones'), docente)
      .send({ id_asignacion: 1, fecha: '2026-09-07' })
    const cancelada = await conToken(
      request(app).delete(`/api/sesiones/${sesion.body.id_sesion}`), docente
    )
    const asistencia = await conToken(
      request(app).get(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), docente
    )
    expect(cancelada.status).toBe(200)
    expect(cancelada.body.estado).toBe('Cancelada')
    expect(asistencia.body).toEqual([])
  })
})
