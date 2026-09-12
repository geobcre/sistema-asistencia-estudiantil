// Pruebas automatizadas del módulo de Cursos (RF-05 del PAQ).
// Cubre CP-01: inscribir a un estudiante ya inscrito no debe duplicar el registro.
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('Módulo de Cursos', () => {
  it('CP-01: no duplica la inscripcion si el estudiante ya esta inscrito en el curso', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso duplicados' })
    const estudiante = await request(app).post('/api/estudiantes').send({ nombre: 'Duplicado', apellido: 'Test' })

    await request(app)
      .post(`/api/cursos/${curso.body.id}/inscripciones`)
      .send({ idEstudiante: estudiante.body.id })

    const segundaVez = await request(app)
      .post(`/api/cursos/${curso.body.id}/inscripciones`)
      .send({ idEstudiante: estudiante.body.id })

    const listaFinal = segundaVez.body.filter((e) => e.id === estudiante.body.id)
    expect(listaFinal).toHaveLength(1)
  })

  it('CP-05: eliminar un docente asignado no elimina el curso, solo lo deja sin asignar', async () => {
    const docente = await request(app).post('/api/docentes').send({ nombre: 'Temporal', apellido: 'Docente' })
    const curso = await request(app)
      .post('/api/cursos')
      .send({ nombre: 'Curso con docente temporal', idDocente: docente.body.id })

    await request(app).delete(`/api/docentes/${docente.body.id}`)

    const cursoActualizado = await request(app).get('/api/cursos')
    const encontrado = cursoActualizado.body.find((c) => c.id === curso.body.id)

    expect(encontrado).toBeDefined()
    expect(encontrado.id_docente).toBeFalsy()
  })
})
