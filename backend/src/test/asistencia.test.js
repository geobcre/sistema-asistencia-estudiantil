// Pruebas automatizadas del módulo de Asistencia (RF-05 del PAQ).
// Cubren CP-02 (upsert de asistencia) y la creación idempotente de sesiones
// descrita en el diagrama de secuencia "Docente toma asistencia".
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('Módulo de Asistencia', () => {
  it('CP-06: crea una sesión nueva si no existe para esa fecha y curso', async () => {
    const res = await request(app)
      .post('/api/cursos/1/sesiones')
      .send({ fecha: '2026-10-01' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id_curso: 1, fecha: '2026-10-01' })
  })

  it('CP-07: no duplica la sesión si ya existe para el mismo curso y fecha (idempotencia)', async () => {
    const primera = await request(app)
      .post('/api/cursos/1/sesiones')
      .send({ fecha: '2026-10-02' })

    const segunda = await request(app)
      .post('/api/cursos/1/sesiones')
      .send({ fecha: '2026-10-02' })

    expect(primera.status).toBe(201)
    expect(segunda.status).toBe(201)
    // Misma sesion (mismo id), no una nueva
    expect(segunda.body.id).toBe(primera.body.id)
  })

  it('CP-02: registrar asistencia dos veces para el mismo estudiante actualiza el estado (upsert), no duplica', async () => {
    const sesion = await request(app)
      .post('/api/cursos/1/sesiones')
      .send({ fecha: '2026-10-03' })

    await request(app)
      .post(`/api/sesiones/${sesion.body.id}/asistencia`)
      .send({ idEstudiante: 1, estado: 'ausente' })

    const segundaMarca = await request(app)
      .post(`/api/sesiones/${sesion.body.id}/asistencia`)
      .send({ idEstudiante: 1, estado: 'presente' })

    expect(segundaMarca.status).toBe(201)

    const registros = await request(app).get(`/api/sesiones/${sesion.body.id}/asistencia`)
    const registrosDelEstudiante = registros.body.filter((r) => r.id_estudiante === 1)

    expect(registrosDelEstudiante).toHaveLength(1)
    expect(registrosDelEstudiante[0].estado).toBe('presente')
  })

  it('rechaza un estado de asistencia invalido', async () => {
    const sesion = await request(app)
      .post('/api/cursos/1/sesiones')
      .send({ fecha: '2026-10-04' })

    const res = await request(app)
      .post(`/api/sesiones/${sesion.body.id}/asistencia`)
      .send({ idEstudiante: 1, estado: 'de-vacaciones' })

    expect(res.status).toBe(400)
  })
})
