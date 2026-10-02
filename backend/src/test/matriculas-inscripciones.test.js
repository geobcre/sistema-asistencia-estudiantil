import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../db.js'
import { conToken, tokenAdministrador, tokenDocente } from './auth-helpers.js'

let secuencia = 300

function crearEstudiante(estado = 'Activo') {
  secuencia += 1
  return Number(db.prepare(`
    INSERT INTO estudiantes (carne, nombre, apellido, estado)
    VALUES (?, 'Estudiante', 'Prueba', ?)
  `).run(`TEST-${secuencia}`, estado).lastInsertRowid)
}

function crearMatricula(idGrupo = 1, estado = 'Activa') {
  const idEstudiante = crearEstudiante()
  return Number(db.prepare(`
    INSERT INTO matriculas
      (id_estudiante, id_grupo, fecha_matricula, fecha_retiro, estado)
    VALUES (?, ?, '2026-01-15', ?, ?)
  `).run(idEstudiante, idGrupo, estado === 'Retirada' ? '2026-06-01' : null, estado).lastInsertRowid)
}

describe('Matrículas e inscripciones', () => {
  let admin
  let docente

  beforeAll(async () => {
    admin = await tokenAdministrador()
    docente = await tokenDocente()
  })

  describe('Matrículas', () => {
    it('lista y obtiene matrículas con estudiante, grupo y ciclo', async () => {
      const listado = await conToken(request(app).get('/api/matriculas'), admin)
      expect(listado.status).toBe(200)
      expect(listado.body[0]).toMatchObject({
        carne: expect.any(String), grado: expect.any(Number), ciclo_anio: 2026
      })

      const detalle = await conToken(
        request(app).get(`/api/matriculas/${listado.body[0].id_matricula}`), admin
      )
      expect(detalle.status).toBe(200)
      expect(detalle.body).toHaveProperty('estudiante_nombre')
    })

    it('crea y actualiza una matrícula activa', async () => {
      const idEstudiante = crearEstudiante()
      const creado = await conToken(request(app).post('/api/matriculas'), admin)
        .send({ id_estudiante: idEstudiante, id_grupo: 1, fecha_matricula: '2026-02-01' })
      expect(creado.status).toBe(201)
      expect(creado.body).toMatchObject({ id_estudiante: idEstudiante, estado: 'Activa' })

      const actualizado = await conToken(
        request(app).put(`/api/matriculas/${creado.body.id_matricula}`), admin
      ).send({ id_estudiante: idEstudiante, id_grupo: 2, fecha_matricula: '2026-02-02' })
      expect(actualizado.status).toBe(200)
      expect(actualizado.body).toMatchObject({ id_grupo: 2, fecha_matricula: '2026-02-02' })
    })

    it('rechaza estudiantes y grupos inexistentes', async () => {
      const estudiante = await conToken(request(app).post('/api/matriculas'), admin)
        .send({ id_estudiante: 99999, id_grupo: 1, fecha_matricula: '2026-02-01' })
      const grupo = await conToken(request(app).post('/api/matriculas'), admin)
        .send({ id_estudiante: crearEstudiante(), id_grupo: 99999, fecha_matricula: '2026-02-01' })
      expect(estudiante.status).toBe(400)
      expect(grupo.status).toBe(400)
    })

    it('rechaza estudiantes inactivos', async () => {
      const res = await conToken(request(app).post('/api/matriculas'), admin)
        .send({ id_estudiante: crearEstudiante('Inactivo'), id_grupo: 1, fecha_matricula: '2026-02-01' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('inactivo')
    })

    it('rechaza grupos pertenecientes a ciclos finalizados', async () => {
      const ciclo = Number(db.prepare(`
        INSERT INTO ciclos_escolares (anio, estado) VALUES (2045, 'Finalizado')
      `).run().lastInsertRowid)
      const grupo = Number(db.prepare(`
        INSERT INTO grupos (grado, seccion, id_ciclo) VALUES (1, 'X', ?)
      `).run(ciclo).lastInsertRowid)
      const res = await conToken(request(app).post('/api/matriculas'), admin)
        .send({ id_estudiante: crearEstudiante(), id_grupo: grupo, fecha_matricula: '2045-01-10' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('finalizado')
    })

    it('impide dos matrículas activas del estudiante en el mismo ciclo', async () => {
      const ana = db.prepare("SELECT id_estudiante FROM estudiantes WHERE carne = 'EST-001'").get()
      const res = await conToken(request(app).post('/api/matriculas'), admin)
        .send({ id_estudiante: ana.id_estudiante, id_grupo: 2, fecha_matricula: '2026-02-01' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('matrícula activa')
    })

    it('retira lógicamente la matrícula y sus inscripciones activas', async () => {
      const idMatricula = crearMatricula(1)
      const inscripcion = Number(db.prepare(`
        INSERT INTO inscripciones
          (id_matricula, id_asignacion, fecha_inscripcion, estado)
        VALUES (?, 1, '2026-02-01', 'Activa')
      `).run(idMatricula).lastInsertRowid)

      const res = await conToken(request(app).delete(`/api/matriculas/${idMatricula}`), admin)
        .send({ fecha_retiro: '2026-08-01' })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ estado: 'Retirada', fecha_retiro: '2026-08-01' })
      expect(db.prepare('SELECT estado FROM inscripciones WHERE id_inscripcion = ?').get(inscripcion).estado)
        .toBe('Retirada')
    })

    it('reserva la administración de matrículas al administrador', async () => {
      const listado = await conToken(request(app).get('/api/matriculas'), docente)
      const crear = await conToken(request(app).post('/api/matriculas'), docente)
        .send({ id_estudiante: 1, id_grupo: 1, fecha_matricula: '2026-02-01' })
      expect([listado.status, crear.status]).toEqual([403, 403])
    })
  })

  describe('Inscripciones', () => {
    it('crea y consulta una inscripción válida con todo su contexto', async () => {
      const idMatricula = crearMatricula(1)
      const creado = await conToken(request(app).post('/api/inscripciones'), admin)
        .send({ id_matricula: idMatricula, id_asignacion: 1, fecha_inscripcion: '2026-02-01' })
      expect(creado.status).toBe(201)
      expect(creado.body).toMatchObject({
        estado: 'Activa', asignatura_codigo: 'MAT-101', docente_nombre: 'Marta', ciclo_anio: 2026
      })

      const detalle = await conToken(
        request(app).get(`/api/inscripciones/${creado.body.id_inscripcion}`), admin
      )
      expect(detalle.status).toBe(200)
      expect(detalle.body.id_inscripcion).toBe(creado.body.id_inscripcion)
    })

    it('actualiza una inscripción activa cuando las relaciones son válidas', async () => {
      const idMatricula = crearMatricula(1)
      const id = Number(db.prepare(`
        INSERT INTO inscripciones
          (id_matricula, id_asignacion, fecha_inscripcion, estado)
        VALUES (?, 1, '2026-02-01', 'Activa')
      `).run(idMatricula).lastInsertRowid)
      const res = await conToken(request(app).put(`/api/inscripciones/${id}`), admin)
        .send({ id_matricula: idMatricula, id_asignacion: 1, fecha_inscripcion: '2026-02-05' })
      expect(res.status).toBe(200)
      expect(res.body.fecha_inscripcion).toBe('2026-02-05')
    })

    it('impide inscribir una matrícula en una asignación de otro grupo', async () => {
      const res = await conToken(request(app).post('/api/inscripciones'), admin)
        .send({ id_matricula: crearMatricula(2), id_asignacion: 1, fecha_inscripcion: '2026-02-01' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('mismo grupo')
    })

    it('rechaza una matrícula retirada', async () => {
      const res = await conToken(request(app).post('/api/inscripciones'), admin)
        .send({ id_matricula: crearMatricula(1, 'Retirada'), id_asignacion: 1, fecha_inscripcion: '2026-02-01' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('retirada')
    })

    it('rechaza una asignación inactiva', async () => {
      const asignacion = Number(db.prepare(`
        INSERT INTO asignaciones_academicas
          (id_asignatura, id_docente, id_grupo, fecha_inicio, estado)
        VALUES (1, 1, 1, '2026-01-20', 'Inactiva')
      `).run().lastInsertRowid)
      const res = await conToken(request(app).post('/api/inscripciones'), admin)
        .send({ id_matricula: crearMatricula(1), id_asignacion: asignacion, fecha_inscripcion: '2026-02-01' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('inactiva')
    })

    it('controla una inscripción activa duplicada', async () => {
      const res = await conToken(request(app).post('/api/inscripciones'), admin)
        .send({ id_matricula: 1, id_asignacion: 1, fecha_inscripcion: '2026-02-01' })
      expect(res.status).toBe(409)
    })

    it('retira y reactiva la misma inscripción limpiando la fecha de retiro', async () => {
      const idMatricula = crearMatricula(1)
      const creado = await conToken(request(app).post('/api/inscripciones'), admin)
        .send({ id_matricula: idMatricula, id_asignacion: 1, fecha_inscripcion: '2026-02-01' })
      const retiro = await conToken(
        request(app).delete(`/api/inscripciones/${creado.body.id_inscripcion}`), admin
      ).send({ fecha_retiro: '2026-06-01' })
      expect(retiro.status).toBe(200)
      expect(retiro.body.estado).toBe('Retirada')

      const reactivada = await conToken(request(app).post('/api/inscripciones'), admin)
        .send({ id_matricula: idMatricula, id_asignacion: 1, fecha_inscripcion: '2026-07-01' })
      expect(reactivada.status).toBe(200)
      expect(reactivada.body).toMatchObject({
        id_inscripcion: creado.body.id_inscripcion, estado: 'Activa', fecha_retiro: null
      })
    })

    it('limita al docente a inscripciones de sus asignaciones', async () => {
      const listado = await conToken(request(app).get('/api/inscripciones'), docente)
      expect(listado.status).toBe(200)
      expect(listado.body.length).toBeGreaterThan(0)
      expect(listado.body.every((item) => item.id_docente === 1)).toBe(true)

      const propia = db.prepare(`
        SELECT i.id_inscripcion FROM inscripciones i
        JOIN asignaciones_academicas aa ON aa.id_asignacion = i.id_asignacion
        WHERE aa.id_docente = 1 LIMIT 1
      `).get()
      const ajena = db.prepare(`
        SELECT i.id_inscripcion FROM inscripciones i
        JOIN asignaciones_academicas aa ON aa.id_asignacion = i.id_asignacion
        WHERE aa.id_docente <> 1 LIMIT 1
      `).get()
      const acceso = await conToken(request(app).get(`/api/inscripciones/${propia.id_inscripcion}`), docente)
      const denegado = await conToken(request(app).get(`/api/inscripciones/${ajena.id_inscripcion}`), docente)
      expect([acceso.status, denegado.status]).toEqual([200, 403])
    })

    it('impide al docente crear, actualizar o retirar inscripciones', async () => {
      const crear = await conToken(request(app).post('/api/inscripciones'), docente)
        .send({ id_matricula: 1, id_asignacion: 1, fecha_inscripcion: '2026-02-01' })
      const editar = await conToken(request(app).put('/api/inscripciones/1'), docente)
        .send({ id_matricula: 1, id_asignacion: 1, fecha_inscripcion: '2026-02-01' })
      const retirar = await conToken(request(app).delete('/api/inscripciones/1'), docente)
        .send({ fecha_retiro: '2026-06-01' })
      expect([crear.status, editar.status, retirar.status]).toEqual([403, 403, 403])
    })
  })
})
