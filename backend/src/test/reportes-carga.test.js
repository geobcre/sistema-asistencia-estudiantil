// CP-14 / RNF-04: Reportes y Estadísticas con 10,000 registros de asistencia
// (100 estudiantes × 100 sesiones) responden en menos de 5 segundos.
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'
import { conToken, tokenAdministrador } from './auth-helpers.js'

const ESTUDIANTES = 100
const SESIONES = 100

describe('Carga de Reportes y Estadísticas (10,000 registros)', () => {
  let admin

  beforeAll(async () => {
    admin = await tokenAdministrador()

    const insertarEstudiante = db.prepare(`
      INSERT INTO estudiantes (carne, nombre, apellido) VALUES (?, 'Carga', ?)
    `)
    const insertarMatricula = db.prepare(`
      INSERT INTO matriculas (id_estudiante, id_grupo, fecha_matricula)
      VALUES (?, 1, '2026-01-15')
    `)
    const insertarInscripcion = db.prepare(`
      INSERT INTO inscripciones (id_matricula, id_asignacion, fecha_inscripcion)
      VALUES (?, 1, '2026-01-20')
    `)
    const insertarSesion = db.prepare(`
      INSERT INTO sesiones (id_asignacion, fecha, estado) VALUES (1, ?, 'Cerrada')
    `)
    const insertarAsistencia = db.prepare(`
      INSERT INTO asistencias (id_sesion, id_inscripcion, estado) VALUES (?, ?, ?)
    `)

    db.transaction(() => {
      const inscripciones = []
      for (let n = 1; n <= ESTUDIANTES; n += 1) {
        const estudiante = insertarEstudiante.run(`CARGA-${n}`, `Prueba ${n}`).lastInsertRowid
        const matricula = insertarMatricula.run(estudiante).lastInsertRowid
        inscripciones.push(Number(insertarInscripcion.run(matricula).lastInsertRowid))
      }
      for (let d = 0; d < SESIONES; d += 1) {
        const fecha = new Date(Date.UTC(2027, 0, 1 + d)).toISOString().slice(0, 10)
        const sesion = Number(insertarSesion.run(fecha).lastInsertRowid)
        inscripciones.forEach((inscripcion, i) => {
          insertarAsistencia.run(sesion, inscripcion, (i + d) % 4 === 0 ? 'Ausente' : 'Presente')
        })
      }
    })()
  })

  it('el reporte devuelve los 10,000 registros en menos de 5 segundos', async () => {
    const inicio = Date.now()
    const res = await conToken(request(app).get('/api/reportes?id_asignacion=1&desde=2027-01-01'), admin)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(ESTUDIANTES * SESIONES)
    expect(Date.now() - inicio).toBeLessThan(5000)
  })

  it('las estadísticas se calculan en menos de 5 segundos', async () => {
    const inicio = Date.now()
    const res = await conToken(request(app).get('/api/estadisticas/asignacion/1'), admin)

    expect(res.status).toBe(200)
    expect(res.body.alumnos.length).toBeGreaterThanOrEqual(ESTUDIANTES)
    expect(Date.now() - inicio).toBeLessThan(5000)
  })
})
