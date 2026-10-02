import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

describe('Asistencia e historial estudiantil', () => {
  let admin
  let docente

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  async function crearSesion(fecha, idAsignacion = 1) {
    return conToken(request(app).post('/api/sesiones'), admin)
      .send({ id_asignacion: idAsignacion, fecha })
  }

  it('devuelve todos los estudiantes esperados como Pendiente sin almacenarlo', async () => {
    const sesion = await crearSesion('2026-10-01')
    const res = await conToken(
      request(app).get(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
    )
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body.every((fila) => fila.estado === 'Pendiente')).toBe(true)
    expect(db.prepare(`
      SELECT COUNT(*) AS n FROM asistencias WHERE id_sesion = ?
    `).get(sesion.body.id_sesion).n).toBe(0)
  })

  it('acepta los cuatro estados y corrige sin duplicar', async () => {
    const sesion = await crearSesion('2026-10-02')
    const esperado = await conToken(
      request(app).get(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
    )
    const idInscripcion = esperado.body[0].id_inscripcion

    for (const estado of ['Presente', 'Ausente', 'Tarde', 'Justificado']) {
      const res = await conToken(
        request(app).post(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
      ).send({ id_inscripcion: idInscripcion, estado })
      expect([200, 201]).toContain(res.status)
      expect(res.body.estado).toBe(estado)
    }

    expect(db.prepare(`
      SELECT COUNT(*) AS n FROM asistencias
      WHERE id_sesion = ? AND id_inscripcion = ?
    `).get(sesion.body.id_sesion, idInscripcion).n).toBe(1)
  })

  it('rechaza una inscripción perteneciente a otra asignación', async () => {
    const sesion = await crearSesion('2026-10-03', 1)
    const inscripcionAjena = db.prepare(`
      SELECT id_inscripcion FROM inscripciones WHERE id_asignacion = 2 LIMIT 1
    `).get()
    const res = await conToken(
      request(app).post(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
    ).send({ id_inscripcion: inscripcionAjena.id_inscripcion, estado: 'Presente' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('otra asignación')
  })

  it('rechaza inscripciones que no eran válidas en la fecha', async () => {
    const sesion = await crearSesion('2026-10-04')
    const estudiante = Number(db.prepare(`
      INSERT INTO estudiantes (carne, nombre, apellido, estado)
      VALUES ('FECHA-001', 'Fecha', 'Posterior', 'Activo')
    `).run().lastInsertRowid)
    const matricula = Number(db.prepare(`
      INSERT INTO matriculas
        (id_estudiante, id_grupo, fecha_matricula, estado)
      VALUES (?, 1, '2026-10-05', 'Activa')
    `).run(estudiante).lastInsertRowid)
    const inscripcion = Number(db.prepare(`
      INSERT INTO inscripciones
        (id_matricula, id_asignacion, fecha_inscripcion, estado)
      VALUES (?, 1, '2026-10-05', 'Activa')
    `).run(matricula).lastInsertRowid)
    const res = await conToken(
      request(app).post(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
    ).send({ id_inscripcion: inscripcion, estado: 'Presente' })

    const matriculaVigente = Number(db.prepare(`
      INSERT INTO matriculas
        (id_estudiante, id_grupo, fecha_matricula, estado)
      VALUES (?, 1, '2026-01-15', 'Activa')
    `).run(Number(db.prepare(`
      INSERT INTO estudiantes (carne, nombre, apellido, estado)
      VALUES ('FECHA-003', 'Inscripción', 'Retirada', 'Activo')
    `).run().lastInsertRowid)).lastInsertRowid)
    const inscripcionRetirada = Number(db.prepare(`
      INSERT INTO inscripciones
        (id_matricula, id_asignacion, fecha_inscripcion, fecha_retiro, estado)
      VALUES (?, 1, '2026-01-20', '2026-09-30', 'Retirada')
    `).run(matriculaVigente).lastInsertRowid)
    const retirada = await conToken(
      request(app).post(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
    ).send({ id_inscripcion: inscripcionRetirada, estado: 'Presente' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('no era válida')
    expect(retirada.status).toBe(400)
  })

  it('rechaza matrículas retiradas antes de la sesión', async () => {
    const sesion = await crearSesion('2026-10-05')
    const estudiante = Number(db.prepare(`
      INSERT INTO estudiantes (carne, nombre, apellido, estado)
      VALUES ('FECHA-002', 'Matrícula', 'Retirada', 'Activo')
    `).run().lastInsertRowid)
    const matricula = Number(db.prepare(`
      INSERT INTO matriculas
        (id_estudiante, id_grupo, fecha_matricula, fecha_retiro, estado)
      VALUES (?, 1, '2026-01-15', '2026-09-30', 'Retirada')
    `).run(estudiante).lastInsertRowid)
    const inscripcion = Number(db.prepare(`
      INSERT INTO inscripciones
        (id_matricula, id_asignacion, fecha_inscripcion, estado)
      VALUES (?, 1, '2026-01-20', 'Activa')
    `).run(matricula).lastInsertRowid)
    const res = await conToken(
      request(app).post(`/api/sesiones/${sesion.body.id_sesion}/asistencia`), admin
    ).send({ id_inscripcion: inscripcion, estado: 'Ausente' })
    expect(res.status).toBe(400)
  })

  it('impide registrar en sesiones cerradas o canceladas', async () => {
    const inscripcion = db.prepare(`
      SELECT id_inscripcion FROM inscripciones WHERE id_asignacion = 1 LIMIT 1
    `).get()
    const cerrada = db.prepare(`
      SELECT id_sesion FROM sesiones WHERE id_asignacion = 1 AND estado = 'Cerrada' LIMIT 1
    `).get()
    const abierta = await crearSesion('2026-10-06')
    await conToken(request(app).delete(`/api/sesiones/${abierta.body.id_sesion}`), admin)

    const enCerrada = await conToken(
      request(app).post(`/api/sesiones/${cerrada.id_sesion}/asistencia`), admin
    ).send({ id_inscripcion: inscripcion.id_inscripcion, estado: 'Presente' })
    const enCancelada = await conToken(
      request(app).post(`/api/sesiones/${abierta.body.id_sesion}/asistencia`), admin
    ).send({ id_inscripcion: inscripcion.id_inscripcion, estado: 'Presente' })
    expect([enCerrada.status, enCancelada.status]).toEqual([409, 409])
  })

  it('limita asistencia a sesiones propias del docente', async () => {
    const sesionPropia = await crearSesion('2026-10-07', 1)
    const sesionAjena = await crearSesion('2026-10-07', 2)
    const propia = await conToken(
      request(app).get(`/api/sesiones/${sesionPropia.body.id_sesion}/asistencia`), docente
    )
    const ajena = await conToken(
      request(app).get(`/api/sesiones/${sesionAjena.body.id_sesion}/asistencia`), docente
    )
    expect([propia.status, ajena.status]).toEqual([200, 403])
  })

  it('devuelve historial real completo al administrador', async () => {
    const res = await conToken(request(app).get('/api/estudiantes/1/asistencia'), admin)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toMatchObject({
      fecha: expect.any(String),
      estado: expect.any(String),
      asignatura_nombre: expect.any(String),
      grado: expect.any(Number),
      ciclo_anio: 2026,
      docente_nombre: expect.any(String),
    })
  })

  it('filtra el historial para el docente autenticado', async () => {
    const res = await conToken(request(app).get('/api/estudiantes/1/asistencia'), docente)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body.every((fila) => fila.id_docente === 1)).toBe(true)
    expect(res.body.every((fila) => fila.asignatura_codigo === 'MAT-101')).toBe(true)
  })
})
