// Prueba de carga del módulo de Reportes (RNF-04 del PAQ).
// QA.md la listaba como pendiente: "Prueba de carga real sobre el módulo de
// Reportes con 10,000 registros". Los datos se insertan directo en SQLite
// (no vía API una por una) porque el propósito es medir el endpoint de
// consulta, no el costo de 10,000 peticiones HTTP de marcado individuales.
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'

const TOTAL_REGISTROS = 10000

describe('Módulo de Reportes (carga, RNF-04)', () => {
  it('CP-14: /api/reportes responde correctamente y en tiempo razonable con 10,000 registros', async () => {
    const curso = await request(app).post('/api/cursos').send({ nombre: 'Curso carga RNF-04' })
    const estudiante = await request(app).post('/api/estudiantes').send({ nombre: 'Carga', apellido: 'Masiva' })
    await request(app)
      .post(`/api/cursos/${curso.body.id}/inscripciones`)
      .send({ idEstudiante: estudiante.body.id })

    // Inserta 10,000 sesiones (una por día, a partir de 2020-01-01) y su
    // asistencia correspondiente, en una sola transacción para que la
    // prueba mida el endpoint de lectura y no la inserción en sí.
    const insertarSesion = db.prepare('INSERT INTO sesiones (id_curso, fecha) VALUES (?, ?)')
    const insertarAsistencia = db.prepare(
      'INSERT INTO asistencias (id_sesion, id_estudiante, estado) VALUES (?, ?, ?)'
    )
    const estados = ['presente', 'ausente', 'tarde', 'justificado']

    const insertarLote = db.transaction(() => {
      const inicio = new Date('2020-01-01T00:00:00Z')
      for (let i = 0; i < TOTAL_REGISTROS; i++) {
        const fecha = new Date(inicio.getTime() + i * 86400000).toISOString().slice(0, 10)
        const idSesion = insertarSesion.run(curso.body.id, fecha).lastInsertRowid
        insertarAsistencia.run(idSesion, estudiante.body.id, estados[i % estados.length])
      }
    })
    insertarLote()

    const inicioConsulta = Date.now()
    const res = await request(app).get('/api/reportes').query({ curso: curso.body.id })
    const duracionMs = Date.now() - inicioConsulta

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(TOTAL_REGISTROS)
    // No es una prueba de performance estricta (el entorno de CI varía),
    // pero deja una señal clara si el endpoint se degrada gravemente.
    expect(duracionMs).toBeLessThan(5000)
  }, 20000)
})
