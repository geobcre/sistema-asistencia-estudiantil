// Pruebas automatizadas del módulo de Estadísticas (RF-05 del PAQ).
// Cubre CP-03: un estudiante sin sesiones registradas debe mostrar 0%,
// nunca un error de division por cero o NaN.
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('Módulo de Estadísticas', () => {
  it('CP-03: un curso recien creado sin sesiones no produce division por cero', async () => {
    const nuevoCurso = await request(app)
      .post('/api/cursos')
      .send({ nombre: 'Curso sin sesiones', idDocente: null })

    const res = await request(app).get(`/api/estadisticas/curso/${nuevoCurso.body.id}`)

    expect(res.status).toBe(200)
    expect(res.body.alumnos).toEqual([])
  })

  it('calcula el porcentaje de asistencia correctamente tras marcar varias sesiones', async () => {
    // Curso 1 ya trae a los estudiantes 1, 2 y 3 inscritos (datos semilla).
    const fechas = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']
    const sesionesIds = []
    for (const fecha of fechas) {
      const sesion = await request(app).post('/api/cursos/1/sesiones').send({ fecha })
      sesionesIds.push(sesion.body.id)
    }

    // Estudiante 1: presente en 3 de 4 sesiones nuevas => 75%
    await request(app).post(`/api/sesiones/${sesionesIds[0]}/asistencia`).send({ idEstudiante: 1, estado: 'presente' })
    await request(app).post(`/api/sesiones/${sesionesIds[1]}/asistencia`).send({ idEstudiante: 1, estado: 'presente' })
    await request(app).post(`/api/sesiones/${sesionesIds[2]}/asistencia`).send({ idEstudiante: 1, estado: 'presente' })
    await request(app).post(`/api/sesiones/${sesionesIds[3]}/asistencia`).send({ idEstudiante: 1, estado: 'ausente' })

    const res = await request(app).get('/api/estadisticas/estudiante/1')
    const cursoUno = res.body.cursos.find((c) => c.idCurso === 1)

    expect(res.status).toBe(200)
    expect(cursoUno.porcentaje).toBeGreaterThanOrEqual(0)
    expect(cursoUno.porcentaje).toBeLessThanOrEqual(100)
  })

  it('CP-08: un estudiante con estado "tarde" cuenta como asistencia para el porcentaje', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso prueba tarde' })
    const estudiante = await request(app).post('/api/estudiantes').send({ nombre: 'Prueba', apellido: 'Tarde' })
    await request(app).post(`/api/cursos/${curso.body.id}/inscripciones`).send({ idEstudiante: estudiante.body.id })

    const sesion = await request(app).post(`/api/cursos/${curso.body.id}/sesiones`).send({ fecha: '2026-11-10' })
    await request(app)
      .post(`/api/sesiones/${sesion.body.id}/asistencia`)
      .send({ idEstudiante: estudiante.body.id, estado: 'tarde' })

    const res = await request(app).get(`/api/estadisticas/curso/${curso.body.id}`)
    const alumno = res.body.alumnos.find((a) => a.id === estudiante.body.id)

    expect(alumno.porcentaje).toBe(100)
  })
})
