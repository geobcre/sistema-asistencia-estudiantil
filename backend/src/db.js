import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schema = fs.readFileSync(
  path.join(__dirname, '..', 'database', 'schema.sql'),
  'utf8'
)

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '..', 'asistencia.db')

export const db = new Database(dbPath)

if (process.env.NODE_ENV !== 'test') {
  db.pragma('journal_mode = WAL')
}

function obtenerOInsertar(database, seleccionar, insertar, paramsSeleccionar, paramsInsertar) {
  const existente = database.prepare(seleccionar).get(...paramsSeleccionar)
  if (existente) return existente

  const resultado = database.prepare(insertar).run(...paramsInsertar)
  return { id: Number(resultado.lastInsertRowid) }
}

function sembrar(database) {
  database.transaction(() => {
    const ciclo = obtenerOInsertar(
      database,
      'SELECT id_ciclo AS id FROM ciclos_escolares WHERE anio = ?',
      'INSERT INTO ciclos_escolares (anio, estado) VALUES (?, ?)',
      [2026], [2026, 'Activo']
    )

    const grupos = {}
    for (const seccion of ['A', 'B']) {
      grupos[seccion] = obtenerOInsertar(
        database,
        `SELECT id_grupo AS id FROM grupos
         WHERE id_ciclo = ? AND grado = ? AND seccion = ?`,
        'INSERT INTO grupos (grado, seccion, id_ciclo) VALUES (?, ?, ?)',
        [ciclo.id, 4, seccion], [4, seccion, ciclo.id]
      )
    }

    const docentes = {}
    for (const [clave, nombre, apellido, correo] of [
      ['marta', 'Marta', 'Solís', 'msolis@escuela.edu'],
      ['hugo', 'Hugo', 'Ramírez', 'hramirez@escuela.edu'],
      ['elena', 'Elena', 'Vásquez', 'evasquez@escuela.edu'],
    ]) {
      docentes[clave] = obtenerOInsertar(
        database,
        'SELECT id_docente AS id FROM docentes WHERE correo = ?',
        `INSERT INTO docentes (nombre, apellido, correo, estado)
         VALUES (?, ?, ?, 'Activo')`,
        [correo], [nombre, apellido, correo]
      )
    }

    const matriculas = {}
    for (const [clave, carne, nombre, apellido, seccion] of [
      ['ana', 'EST-001', 'Ana', 'García', 'A'],
      ['luis', 'EST-002', 'Luis', 'Pérez', 'A'],
      ['sofia', 'EST-003', 'Sofía', 'Morales', 'A'],
      ['diego', 'EST-004', 'Diego', 'Castillo', 'B'],
      ['valeria', 'EST-005', 'Valeria', 'Ortiz', 'B'],
      ['mateo', 'EST-006', 'Mateo', 'Ríos', 'B'],
    ]) {
      const estudiante = obtenerOInsertar(
        database,
        'SELECT id_estudiante AS id FROM estudiantes WHERE carne = ?',
        `INSERT INTO estudiantes (carne, nombre, apellido, estado)
         VALUES (?, ?, ?, 'Activo')`,
        [carne], [carne, nombre, apellido]
      )

      matriculas[clave] = obtenerOInsertar(
        database,
        `SELECT id_matricula AS id FROM matriculas
         WHERE id_estudiante = ? AND id_grupo = ?`,
        `INSERT INTO matriculas
           (id_estudiante, id_grupo, fecha_matricula, estado)
         VALUES (?, ?, ?, 'Activa')`,
        [estudiante.id, grupos[seccion].id],
        [estudiante.id, grupos[seccion].id, '2026-01-15']
      )
    }

    const asignaturas = {}
    for (const [clave, nombre, codigo] of [
      ['mate', 'Matemática', 'MAT-101'],
      ['lenguaje', 'Lenguaje', 'LEN-101'],
      ['ciencias', 'Ciencias Naturales', 'CNA-101'],
    ]) {
      asignaturas[clave] = obtenerOInsertar(
        database,
        'SELECT id_asignatura AS id FROM asignaturas WHERE codigo = ?',
        `INSERT INTO asignaturas (nombre, codigo, estado)
         VALUES (?, ?, 'Activa')`,
        [codigo], [nombre, codigo]
      )
    }

    const asignaciones = {}
    for (const [clave, asignatura, docente, seccion, horario] of [
      ['mate4a', 'mate', 'marta', 'A', 'Lun/Mié 8:00'],
      ['lenguaje4a', 'lenguaje', 'hugo', 'A', 'Mar/Jue 10:00'],
      ['ciencias4b', 'ciencias', 'elena', 'B', 'Vie 9:00'],
    ]) {
      asignaciones[clave] = obtenerOInsertar(
        database,
        `SELECT id_asignacion AS id FROM asignaciones_academicas
         WHERE id_asignatura = ? AND id_docente = ? AND id_grupo = ?
           AND fecha_inicio = ?`,
        `INSERT INTO asignaciones_academicas
           (id_asignatura, id_docente, id_grupo, horario, fecha_inicio, estado)
         VALUES (?, ?, ?, ?, ?, 'Activa')`,
        [asignaturas[asignatura].id, docentes[docente].id, grupos[seccion].id, '2026-01-20'],
        [asignaturas[asignatura].id, docentes[docente].id, grupos[seccion].id, horario, '2026-01-20']
      )
    }

    const inscripciones = {}
    for (const [clave, estudiante, asignacion] of [
      ['anaMate', 'ana', 'mate4a'], ['luisMate', 'luis', 'mate4a'],
      ['sofiaMate', 'sofia', 'mate4a'], ['anaLenguaje', 'ana', 'lenguaje4a'],
      ['luisLenguaje', 'luis', 'lenguaje4a'], ['sofiaLenguaje', 'sofia', 'lenguaje4a'],
      ['diegoCiencias', 'diego', 'ciencias4b'],
      ['valeriaCiencias', 'valeria', 'ciencias4b'],
      ['mateoCiencias', 'mateo', 'ciencias4b'],
    ]) {
      inscripciones[clave] = obtenerOInsertar(
        database,
        `SELECT id_inscripcion AS id FROM inscripciones
         WHERE id_matricula = ? AND id_asignacion = ?`,
        `INSERT INTO inscripciones
           (id_matricula, id_asignacion, fecha_inscripcion, estado)
         VALUES (?, ?, ?, 'Activa')`,
        [matriculas[estudiante].id, asignaciones[asignacion].id],
        [matriculas[estudiante].id, asignaciones[asignacion].id, '2026-01-20']
      )
    }

    const sesiones = {}
    for (const [clave, asignacion, fecha] of [
      ['mate1', 'mate4a', '2026-08-24'],
      ['mate2', 'mate4a', '2026-08-26'],
      ['lenguaje1', 'lenguaje4a', '2026-08-25'],
      ['ciencias1', 'ciencias4b', '2026-08-28'],
    ]) {
      sesiones[clave] = obtenerOInsertar(
        database,
        `SELECT id_sesion AS id FROM sesiones
         WHERE id_asignacion = ? AND fecha = ?`,
        `INSERT INTO sesiones (id_asignacion, fecha, estado)
         VALUES (?, ?, 'Cerrada')`,
        [asignaciones[asignacion].id, fecha],
        [asignaciones[asignacion].id, fecha]
      )
    }

    for (const [sesion, inscripcion, estado] of [
      ['mate1', 'anaMate', 'Presente'], ['mate1', 'luisMate', 'Presente'],
      ['mate1', 'sofiaMate', 'Ausente'], ['mate2', 'anaMate', 'Presente'],
      ['mate2', 'luisMate', 'Tarde'], ['mate2', 'sofiaMate', 'Presente'],
      ['lenguaje1', 'anaLenguaje', 'Presente'],
      ['lenguaje1', 'luisLenguaje', 'Presente'],
      ['lenguaje1', 'sofiaLenguaje', 'Justificado'],
      ['ciencias1', 'diegoCiencias', 'Presente'],
      ['ciencias1', 'valeriaCiencias', 'Presente'],
      ['ciencias1', 'mateoCiencias', 'Ausente'],
    ]) {
      obtenerOInsertar(
        database,
        `SELECT id_asistencia AS id FROM asistencias
         WHERE id_sesion = ? AND id_inscripcion = ?`,
        `INSERT INTO asistencias (id_sesion, id_inscripcion, estado)
         VALUES (?, ?, ?)`,
        [sesiones[sesion].id, inscripciones[inscripcion].id],
        [sesiones[sesion].id, inscripciones[inscripcion].id, estado]
      )
    }

    for (const [nombre, correo, password, rol, idDocente] of [
      ['Administrador', 'admin@escuela.edu', 'Admin123*', 'administrador', null],
      ['Marta Solís', 'msolis@escuela.edu', 'Docente123*', 'docente', docentes.marta.id],
    ]) {
      if (!database.prepare('SELECT 1 FROM usuarios WHERE correo = ?').get(correo)) {
        database.prepare(`
          INSERT INTO usuarios
            (nombre, correo, password_hash, rol, activo, id_docente)
          VALUES (?, ?, ?, ?, 1, ?)
        `).run(nombre, correo, bcrypt.hashSync(password, 10), rol, idDocente)
      }
    }
  })()
}

export function inicializarBaseDeDatos(database) {
  database.pragma('foreign_keys = ON')
  database.exec(schema)
  sembrar(database)
}

inicializarBaseDeDatos(db)
