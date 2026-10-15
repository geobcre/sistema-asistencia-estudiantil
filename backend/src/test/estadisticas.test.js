// Pruebas del módulo de Estadísticas sobre el modelo académico
// (asignaciones académicas → inscripciones → sesiones → asistencias).
// Datos semilla (db.js):
//   Asignación 1 (Matemática 4A, Marta):  Ana 100 %, Luis 100 % (1 presente + 1 tarde), Sofía 50 %
//   Asignación 2 (Lenguaje 4A, Hugo):     Ana 100 %, Luis 100 %, Sofía solo Justificado (sin %)
//   Asignación 3 (Ciencias 4B, Elena):    Diego 100 %, Valeria 100 %, Mateo 0 %
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

describe('Módulo de Estadísticas', () => {
  let admin
  let docente // Marta Solís, dueña de la asignación 1

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  const pedir = (ruta, token = admin) => conToken(request(app).get(ruta), token)

  it('exige iniciar sesión', async () => {
    const res = await request(app).get('/api/estadisticas/resumen')
    expect(res.status).toBe(401)
  })

  it('resumen: totales, estudiantes y riesgo del administrador', async () => {
    const res = await pedir('/api/estadisticas/resumen')

    expect(res.status).toBe(200)
    expect(res.body.umbral).toBe(75)
    expect(res.body.total).toMatchObject({
      presentes: 8,
      tardes: 1,
      ausentes: 2,
      justificados: 1,
      sesiones_registradas: 12,
      porcentaje: 82, // 9 asistencias de 11 (el justificado no entra en la base)
      estudiantes: 6,
      en_riesgo: 2
    })
    expect(res.body.asignaciones).toHaveLength(3)
  })

  it('resumen: el docente solo ve sus asignaciones', async () => {
    const res = await pedir('/api/estadisticas/resumen', docente)

    expect(res.status).toBe(200)
    expect(res.body.asignaciones.map((a) => a.id_asignacion)).toEqual([1])
    expect(res.body.total).toMatchObject({
      presentes: 4, tardes: 1, ausentes: 1, porcentaje: 83, estudiantes: 3, en_riesgo: 1
    })
  })

  it('resumen: filtra por grupo y valida los identificadores', async () => {
    const grupoB = await pedir('/api/estadisticas/resumen?id_grupo=2')
    expect(grupoB.body.asignaciones.map((a) => a.id_asignacion)).toEqual([3])
    expect(grupoB.body.total.estudiantes).toBe(3)

    const invalido = await pedir('/api/estadisticas/resumen?id_grupo=abc')
    expect(invalido.status).toBe(400)
  })

  it('asignación: Presente y Tarde cuentan como asistencia (CP-08)', async () => {
    const res = await pedir('/api/estadisticas/asignacion/1')

    expect(res.status).toBe(200)
    expect(res.body.asignacion.asignatura_codigo).toBe('MAT-101')
    const porNombre = Object.fromEntries(res.body.alumnos.map((a) => [a.nombre, a]))
    expect(porNombre['Ana'].porcentaje).toBe(100)
    expect(porNombre['Luis']).toMatchObject({ presentes: 1, tardes: 1, porcentaje: 100 })
    expect(porNombre['Sofía']).toMatchObject({ ausentes: 1, porcentaje: 50, en_riesgo: true })
  })

  it('asignación: un Justificado no penaliza y no genera porcentaje', async () => {
    const res = await pedir('/api/estadisticas/asignacion/2')
    const sofia = res.body.alumnos.find((a) => a.nombre === 'Sofía')

    expect(sofia).toMatchObject({ justificados: 1, ausentes: 0, porcentaje: null, en_riesgo: false })
  })

  it('asignación: 404 si no existe y 403 si es de otro docente', async () => {
    expect((await pedir('/api/estadisticas/asignacion/9999')).status).toBe(404)
    expect((await pedir('/api/estadisticas/asignacion/2', docente)).status).toBe(403)
    expect((await pedir('/api/estadisticas/asignacion/1', docente)).status).toBe(200)
  })

  it('estudiante: detalle por asignación y porcentaje global ponderado', async () => {
    const res = await pedir('/api/estadisticas/estudiante/1')

    expect(res.status).toBe(200)
    expect(res.body.estudiante.carne).toBe('EST-001')
    expect(res.body.asignaciones).toHaveLength(2)
    expect(res.body.resumen.porcentaje).toBe(100)
  })

  it('estudiante: el docente solo ve sus asignaciones y no puede ver ajenos', async () => {
    const propio = await pedir('/api/estadisticas/estudiante/1', docente)
    expect(propio.status).toBe(200)
    expect(propio.body.asignaciones.map((a) => a.id_asignacion)).toEqual([1])

    expect((await pedir('/api/estadisticas/estudiante/4', docente)).status).toBe(403)
    expect((await pedir('/api/estadisticas/estudiante/9999')).status).toBe(404)
  })

  it('riesgo: lista ordenada de peor a mejor porcentaje', async () => {
    const res = await pedir('/api/estadisticas/riesgo')

    expect(res.status).toBe(200)
    expect(res.body.map((r) => [r.nombre, r.porcentaje])).toEqual([['Mateo', 0], ['Sofía', 50]])
  })

  it('riesgo: umbral configurable, validado y restringido por rol', async () => {
    const bajo = await pedir('/api/estadisticas/riesgo?umbral=40')
    expect(bajo.body.map((r) => r.nombre)).toEqual(['Mateo'])

    expect((await pedir('/api/estadisticas/riesgo?umbral=0')).status).toBe(400)
    expect((await pedir('/api/estadisticas/riesgo?umbral=abc')).status).toBe(400)

    const propio = await pedir('/api/estadisticas/riesgo', docente)
    expect(propio.body.map((r) => r.nombre)).toEqual(['Sofía'])
  })

  // --- Las pruebas siguientes modifican datos; deben ir al final. ---

  it('ignora sesiones canceladas, abiertas sin registros y anteriores a la inscripción', async () => {
    const crearSesion = (fecha, estado) => Number(db.prepare(`
      INSERT INTO sesiones (id_asignacion, fecha, estado) VALUES (1, ?, ?)
    `).run(fecha, estado).lastInsertRowid)

    const cancelada = crearSesion('2026-09-10', 'Cancelada')
    db.prepare(`
      INSERT INTO asistencias (id_sesion, id_inscripcion, estado) VALUES (?, 1, 'Ausente')
    `).run(cancelada)
    crearSesion('2026-09-11', 'Cerrada') // cerrada sin registros → sin_registro
    crearSesion('2026-09-12', 'Abierta') // en curso → no cuenta
    crearSesion('2026-01-10', 'Cerrada') // antes de la inscripción (2026-01-20) → no cuenta

    const res = await pedir('/api/estadisticas/asignacion/1')
    const ana = res.body.alumnos.find((a) => a.nombre === 'Ana')

    expect(ana).toMatchObject({ ausentes: 0, porcentaje: 100, sin_registro: 1 })
  })

  it('CP-03: una asignación sin sesiones no produce división por cero', async () => {
    const id = Number(db.prepare(`
      INSERT INTO asignaciones_academicas
        (id_asignatura, id_docente, id_grupo, fecha_inicio, estado)
      VALUES (1, 1, 1, '2026-01-20', 'Activa')
    `).run().lastInsertRowid)
    db.prepare(`
      INSERT INTO inscripciones (id_matricula, id_asignacion, fecha_inscripcion, estado)
      VALUES (1, ?, '2026-01-20', 'Activa')
    `).run(id)

    const res = await pedir(`/api/estadisticas/asignacion/${id}`)

    expect(res.status).toBe(200)
    expect(res.body.alumnos).toHaveLength(1)
    expect(res.body.alumnos[0]).toMatchObject({
      sesiones_registradas: 0, porcentaje: null, en_riesgo: false
    })
    expect(res.body.resumen.porcentaje).toBeNull()
  })
})
