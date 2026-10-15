// Pruebas del módulo de Reportes sobre el modelo académico.
// Los datos semilla (db.js) aportan 12 registros de asistencia:
//   Presente 8, Ausente 2, Tarde 1, Justificado 1.
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

describe('Módulo de Reportes', () => {
  let admin
  let docente // Marta Solís, dueña de la asignación 1

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  const pedir = (ruta, token = admin) => conToken(request(app).get(ruta), token)

  it('exige iniciar sesión', async () => {
    const res = await request(app).get('/api/reportes')
    expect(res.status).toBe(401)
  })

  it('CP-11: sin filtros devuelve todos los registros con su resumen', async () => {
    const res = await pedir('/api/reportes')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(12)
    expect(res.body.registros).toHaveLength(12)
    expect(res.body.resumen).toEqual({ Presente: 8, Ausente: 2, Tarde: 1, Justificado: 1 })
    expect(res.body.registros[0]).toMatchObject({
      fecha: '2026-08-28', asignatura_codigo: 'CNA-101', ciclo_anio: 2026
    })
  })

  it('filtra por asignación académica', async () => {
    const res = await pedir('/api/reportes?id_asignacion=1')

    expect(res.body.total).toBe(6)
    expect(res.body.registros.every((r) => r.id_asignacion === 1)).toBe(true)
  })

  it('filtra por estudiante', async () => {
    const res = await pedir('/api/reportes?id_estudiante=3')

    expect(res.body.total).toBe(3)
    expect(res.body.registros.every((r) => r.carne === 'EST-003')).toBe(true)
  })

  it('filtra por ciclo y por grupo', async () => {
    expect((await pedir('/api/reportes?id_ciclo=1')).body.total).toBe(12)
    const grupoB = await pedir('/api/reportes?id_grupo=2')
    expect(grupoB.body.total).toBe(3)
    expect(grupoB.body.registros.every((r) => r.seccion === 'B')).toBe(true)
  })

  it('filtra por estado de asistencia', async () => {
    const res = await pedir('/api/reportes?estado=Ausente')

    expect(res.body.total).toBe(2)
    expect(res.body.registros.every((r) => r.estado === 'Ausente')).toBe(true)
  })

  it('filtra por rango de fechas (inclusivo)', async () => {
    const res = await pedir('/api/reportes?desde=2026-08-26&hasta=2026-08-28')

    expect(res.body.total).toBe(6)
    expect(res.body.registros.every((r) => r.fecha >= '2026-08-26' && r.fecha <= '2026-08-28')).toBe(true)
  })

  it('combina varios filtros', async () => {
    const res = await pedir('/api/reportes?id_asignacion=1&estado=Presente&desde=2026-08-25')

    expect(res.body.total).toBe(2) // Ana y Sofía el 26/08
  })

  it('valida los parámetros recibidos', async () => {
    expect((await pedir('/api/reportes?id_estudiante=abc')).status).toBe(400)
    expect((await pedir('/api/reportes?estado=Dormido')).status).toBe(400)
    expect((await pedir('/api/reportes?desde=2026-13-45')).status).toBe(400)
    expect((await pedir('/api/reportes?hasta=hoy')).status).toBe(400)
    expect((await pedir('/api/reportes?desde=2026-09-01&hasta=2026-08-01')).status).toBe(400)
  })

  it('el docente solo recibe los registros de sus asignaciones', async () => {
    const res = await pedir('/api/reportes', docente)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(6)
    expect(res.body.registros.every((r) => r.docente_apellido === 'Solís')).toBe(true)
  })

  it('el docente no puede pedir una asignación ajena; una inexistente da 404', async () => {
    expect((await pedir('/api/reportes?id_asignacion=2', docente)).status).toBe(403)
    expect((await pedir('/api/reportes?id_asignacion=9999')).status).toBe(404)
  })

  it('un filtro de estudiante ajeno no revela datos al docente', async () => {
    const res = await pedir('/api/reportes?id_estudiante=4', docente)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(0)
  })

  it('excluye las sesiones canceladas', async () => {
    const sesion = Number(db.prepare(`
      INSERT INTO sesiones (id_asignacion, fecha, estado) VALUES (1, '2026-09-20', 'Cancelada')
    `).run().lastInsertRowid)
    db.prepare(`
      INSERT INTO asistencias (id_sesion, id_inscripcion, estado) VALUES (?, 1, 'Presente')
    `).run(sesion)

    const res = await pedir('/api/reportes')

    expect(res.body.total).toBe(12)
  })
})
