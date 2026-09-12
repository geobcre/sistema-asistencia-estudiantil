import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// En pruebas (NODE_ENV=test) se usa una base de datos en memoria, para no
// tocar ni depender del archivo real asistencia.db.
const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '..', 'asistencia.db')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// --- Esquema: tablas del MER ---
db.exec(`
  CREATE TABLE IF NOT EXISTS docentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    correo TEXT
  );

  CREATE TABLE IF NOT EXISTS estudiantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    carne TEXT
  );

  CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    codigo TEXT,
    horario TEXT,
    id_docente INTEGER REFERENCES docentes(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS inscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_estudiante INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    id_curso INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    UNIQUE(id_estudiante, id_curso)
  );

  CREATE TABLE IF NOT EXISTS sesiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_curso INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    fecha TEXT NOT NULL,
    UNIQUE(id_curso, fecha)
  );

  CREATE TABLE IF NOT EXISTS asistencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sesion INTEGER NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    id_estudiante INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    estado TEXT NOT NULL CHECK(estado IN ('presente','ausente','tarde','justificado')),
    UNIQUE(id_sesion, id_estudiante)
  );
`)

// --- Semilla inicial: solo si la tabla de docentes está vacía ---
const totalDocentes = db.prepare('SELECT COUNT(*) AS n FROM docentes').get().n

if (totalDocentes === 0) {
  const insertar = db.transaction(() => {
    const insDocente = db.prepare('INSERT INTO docentes (nombre, apellido, correo) VALUES (?, ?, ?)')
    const dMarta = insDocente.run('Marta', 'Solís', 'msolis@escuela.edu').lastInsertRowid
    const dHugo = insDocente.run('Hugo', 'Ramírez', 'hramirez@escuela.edu').lastInsertRowid
    const dElena = insDocente.run('Elena', 'Vásquez', 'evasquez@escuela.edu').lastInsertRowid

    const insEstudiante = db.prepare('INSERT INTO estudiantes (nombre, apellido, carne) VALUES (?, ?, ?)')
    const eAna = insEstudiante.run('Ana', 'García', 'EST-001').lastInsertRowid
    const eLuis = insEstudiante.run('Luis', 'Pérez', 'EST-002').lastInsertRowid
    const eSofia = insEstudiante.run('Sofía', 'Morales', 'EST-003').lastInsertRowid
    const eDiego = insEstudiante.run('Diego', 'Castillo', 'EST-004').lastInsertRowid
    const eValeria = insEstudiante.run('Valeria', 'Ortiz', 'EST-005').lastInsertRowid
    const eMateo = insEstudiante.run('Mateo', 'Ríos', 'EST-006').lastInsertRowid

    const insCurso = db.prepare('INSERT INTO cursos (nombre, codigo, horario, id_docente) VALUES (?, ?, ?, ?)')
    const cMate = insCurso.run('Matemática I', 'MAT-101', 'Lun/Mié 8:00', dMarta).lastInsertRowid
    const cLen = insCurso.run('Lenguaje', 'LEN-101', 'Mar/Jue 10:00', dHugo).lastInsertRowid
    const cCien = insCurso.run('Ciencias Naturales', 'CNA-101', 'Vie 9:00', dElena).lastInsertRowid

    const insInscripcion = db.prepare('INSERT INTO inscripciones (id_estudiante, id_curso) VALUES (?, ?)')
    insInscripcion.run(eAna, cMate)
    insInscripcion.run(eLuis, cMate)
    insInscripcion.run(eSofia, cMate)
    insInscripcion.run(eDiego, cLen)
    insInscripcion.run(eValeria, cLen)
    insInscripcion.run(eAna, cLen)
    insInscripcion.run(eMateo, cCien)
    insInscripcion.run(eLuis, cCien)
    insInscripcion.run(eSofia, cCien)

    const insSesion = db.prepare('INSERT INTO sesiones (id_curso, fecha) VALUES (?, ?)')
    const s1 = insSesion.run(cMate, '2026-08-24').lastInsertRowid
    const s2 = insSesion.run(cMate, '2026-08-26').lastInsertRowid
    const s3 = insSesion.run(cLen, '2026-08-25').lastInsertRowid
    const s4 = insSesion.run(cCien, '2026-08-28').lastInsertRowid

    const insAsistencia = db.prepare('INSERT INTO asistencias (id_sesion, id_estudiante, estado) VALUES (?, ?, ?)')
    insAsistencia.run(s1, eAna, 'presente')
    insAsistencia.run(s1, eLuis, 'presente')
    insAsistencia.run(s1, eSofia, 'ausente')
    insAsistencia.run(s2, eAna, 'presente')
    insAsistencia.run(s2, eLuis, 'tarde')
    insAsistencia.run(s2, eSofia, 'presente')
    insAsistencia.run(s3, eDiego, 'presente')
    insAsistencia.run(s3, eValeria, 'justificado')
    insAsistencia.run(s3, eAna, 'presente')
    insAsistencia.run(s4, eMateo, 'presente')
    insAsistencia.run(s4, eLuis, 'presente')
    insAsistencia.run(s4, eSofia, 'ausente')
  })
  insertar()
  console.log('Base de datos inicializada con datos de ejemplo.')
}
