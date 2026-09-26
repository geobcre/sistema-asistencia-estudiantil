// Pruebas automatizadas del módulo de Cursos (RF-05 del PAQ).
// cursos.test.js ya cubre inscripciones (CP-01) y el efecto de eliminar un
// docente (CP-05). Este archivo cubre el CRUD básico del curso en sí y las
// rutas de consulta/eliminación de inscripciones, que quedaban sin probar.
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('Módulo de Cursos (CRUD)', () => {
  it('CP-12: crea un curso con todos sus campos', async () => {
    const docente = await request(app).post('/api/docentes').send({ nombre: 'Docente', apellido: 'DeCurso' })

    const res = await request(app)
      .post('/api/cursos')
      .send({ nombre: 'Historia Universal', codigo: 'HIS-201', horario: 'Vie 14:00', idDocente: docente.body.id })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      nombre: 'Historia Universal',
      codigo: 'HIS-201',
      horario: 'Vie 14:00',
      id_docente: docente.body.id,
    })
  })

  it('rechaza crear un curso sin nombre', async () => {
    const res = await request(app).post('/api/cursos').send({ codigo: 'SIN-NOMBRE' })

    expect(res.status).toBe(400)
  })

  it('actualiza los datos de un curso existente', async () => {
    const creado = await request(app).post('/api/cursos').send({ nombre: 'Curso temporal' })

    const actualizado = await request(app)
      .put(`/api/cursos/${creado.body.id}`)
      .send({ nombre: 'Curso renombrado', codigo: 'REN-100', horario: 'Lun 7:00', idDocente: null })

    expect(actualizado.status).toBe(200)
    expect(actualizado.body).toMatchObject({ nombre: 'Curso renombrado', codigo: 'REN-100' })
  })

  it('elimina un curso y deja de aparecer en el listado', async () => {
    const creado = await request(app).post('/api/cursos').send({ nombre: 'Curso a borrar' })

    const eliminar = await request(app).delete(`/api/cursos/${creado.body.id}`)
    expect(eliminar.status).toBe(204)

    const listado = await request(app).get('/api/cursos')
    expect(listado.body.find((c) => c.id === creado.body.id)).toBeUndefined()
  })

  it('lista los estudiantes inscritos en un curso (datos semilla del curso 1)', async () => {
    const res = await request(app).get('/api/cursos/1/estudiantes')

    expect(res.status).toBe(200)
    // Semilla: Ana, Luis y Sofía están inscritos en el curso 1 (Matemática I)
    expect(res.body.length).toBeGreaterThanOrEqual(3)
    expect(res.body.every((e) => e.nombre && e.apellido)).toBe(true)
  })

  it('elimina una inscripción específica sin afectar al resto del curso', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso para desinscribir' })
    const estudianteA = await request(app).post('/api/estudiantes').send({ nombre: 'Se', apellido: 'Queda' })
    const estudianteB = await request(app).post('/api/estudiantes').send({ nombre: 'Se', apellido: 'Va' })

    await request(app).post(`/api/cursos/${curso.body.id}/inscripciones`).send({ idEstudiante: estudianteA.body.id })
    await request(app).post(`/api/cursos/${curso.body.id}/inscripciones`).send({ idEstudiante: estudianteB.body.id })

    const eliminar = await request(app)
      .delete(`/api/cursos/${curso.body.id}/inscripciones/${estudianteB.body.id}`)
    expect(eliminar.status).toBe(204)

    const listado = await request(app).get(`/api/cursos/${curso.body.id}/estudiantes`)
    const ids = listado.body.map((e) => e.id)
    expect(ids).toContain(estudianteA.body.id)
    expect(ids).not.toContain(estudianteB.body.id)
  })
})
