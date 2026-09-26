// Pruebas automatizadas del módulo de Sesiones (RF-05 del PAQ).
// asistencia.test.js ya cubre la creación de sesiones y el upsert de
// asistencia (CP-06/CP-07/CP-02). Este archivo cubre las rutas de consulta
// que quedaban sin probar: listar sesiones de un curso y listar la
// asistencia registrada en una sesión concreta.
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('Módulo de Sesiones', () => {
  it('CP-13: lista las sesiones de un curso ordenadas por fecha', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso con sesiones' })

    await request(app).post(`/api/cursos/${curso.body.id}/sesiones`).send({ fecha: '2026-07-20' })
    await request(app).post(`/api/cursos/${curso.body.id}/sesiones`).send({ fecha: '2026-07-05' })
    await request(app).post(`/api/cursos/${curso.body.id}/sesiones`).send({ fecha: '2026-07-12' })

    const res = await request(app).get(`/api/cursos/${curso.body.id}/sesiones`)

    expect(res.status).toBe(200)
    expect(res.body.map((s) => s.fecha)).toEqual(['2026-07-05', '2026-07-12', '2026-07-20'])
  })

  it('rechaza crear una sesión sin fecha', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso sin fecha' })

    const res = await request(app).post(`/api/cursos/${curso.body.id}/sesiones`).send({})

    expect(res.status).toBe(400)
  })

  it('una sesión recién creada no tiene asistencia registrada todavía', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso sesion vacia' })
    const sesion = await request(app).post(`/api/cursos/${curso.body.id}/sesiones`).send({ fecha: '2026-07-25' })

    const res = await request(app).get(`/api/sesiones/${sesion.body.id}/asistencia`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('lista la asistencia de una sesión con el nombre y apellido de cada estudiante', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso con marcas' })
    const est1 = await request(app).post('/api/estudiantes').send({ nombre: 'Marca', apellido: 'Uno' })
    const est2 = await request(app).post('/api/estudiantes').send({ nombre: 'Marca', apellido: 'Dos' })
    await request(app).post(`/api/cursos/${curso.body.id}/inscripciones`).send({ idEstudiante: est1.body.id })
    await request(app).post(`/api/cursos/${curso.body.id}/inscripciones`).send({ idEstudiante: est2.body.id })

    const sesion = await request(app).post(`/api/cursos/${curso.body.id}/sesiones`).send({ fecha: '2026-07-30' })
    await request(app).post(`/api/sesiones/${sesion.body.id}/asistencia`).send({ idEstudiante: est1.body.id, estado: 'presente' })
    await request(app).post(`/api/sesiones/${sesion.body.id}/asistencia`).send({ idEstudiante: est2.body.id, estado: 'justificado' })

    const res = await request(app).get(`/api/sesiones/${sesion.body.id}/asistencia`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    const porEstudiante = new Map(res.body.map((r) => [r.id_estudiante, r]))
    expect(porEstudiante.get(est1.body.id)).toMatchObject({ estado: 'presente', nombre: 'Marca', apellido: 'Uno' })
    expect(porEstudiante.get(est2.body.id)).toMatchObject({ estado: 'justificado', nombre: 'Marca', apellido: 'Dos' })
  })
})
