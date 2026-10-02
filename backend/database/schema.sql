PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ciclos_escolares (
  id_ciclo INTEGER PRIMARY KEY AUTOINCREMENT,
  anio INTEGER NOT NULL UNIQUE,
  estado TEXT NOT NULL CHECK (estado IN ('Planificado', 'Activo', 'Finalizado'))
);

CREATE TABLE IF NOT EXISTS grupos (
  id_grupo INTEGER PRIMARY KEY AUTOINCREMENT,
  grado INTEGER NOT NULL,
  seccion TEXT NOT NULL,
  id_ciclo INTEGER NOT NULL,
  FOREIGN KEY (id_ciclo) REFERENCES ciclos_escolares(id_ciclo) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE (id_ciclo, grado, seccion)
);

CREATE TABLE IF NOT EXISTS estudiantes (
  id_estudiante INTEGER PRIMARY KEY AUTOINCREMENT,
  carne TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'))
);

CREATE TABLE IF NOT EXISTS matriculas (
  id_matricula INTEGER PRIMARY KEY AUTOINCREMENT,
  id_estudiante INTEGER NOT NULL,
  id_grupo INTEGER NOT NULL,
  fecha_matricula TEXT NOT NULL,
  fecha_retiro TEXT,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Retirada')),
  FOREIGN KEY (id_estudiante) REFERENCES estudiantes(id_estudiante) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (fecha_retiro IS NULL OR fecha_retiro >= fecha_matricula)
);

CREATE TABLE IF NOT EXISTS docentes (
  id_docente INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  correo TEXT UNIQUE,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'))
);

CREATE TABLE IF NOT EXISTS asignaturas (
  id_asignatura INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Inactiva'))
);

CREATE TABLE IF NOT EXISTS asignaciones_academicas (
  id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
  id_asignatura INTEGER NOT NULL,
  id_docente INTEGER NOT NULL,
  id_grupo INTEGER NOT NULL,
  horario TEXT,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Inactiva')),
  FOREIGN KEY (id_asignatura) REFERENCES asignaturas(id_asignatura) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_docente) REFERENCES docentes(id_docente) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TABLE IF NOT EXISTS inscripciones (
  id_inscripcion INTEGER PRIMARY KEY AUTOINCREMENT,
  id_matricula INTEGER NOT NULL,
  id_asignacion INTEGER NOT NULL,
  fecha_inscripcion TEXT NOT NULL,
  fecha_retiro TEXT,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Retirada')),
  FOREIGN KEY (id_matricula) REFERENCES matriculas(id_matricula) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_asignacion) REFERENCES asignaciones_academicas(id_asignacion) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE (id_matricula, id_asignacion),
  CHECK (fecha_retiro IS NULL OR fecha_retiro >= fecha_inscripcion)
);

CREATE TABLE IF NOT EXISTS sesiones (
  id_sesion INTEGER PRIMARY KEY AUTOINCREMENT,
  id_asignacion INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Abierta' CHECK (estado IN ('Abierta', 'Cerrada', 'Cancelada')),
  FOREIGN KEY (id_asignacion) REFERENCES asignaciones_academicas(id_asignacion) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE (id_asignacion, fecha)
);

CREATE TABLE IF NOT EXISTS asistencias (
  id_asistencia INTEGER PRIMARY KEY AUTOINCREMENT,
  id_sesion INTEGER NOT NULL,
  id_inscripcion INTEGER NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('Presente', 'Ausente', 'Tarde', 'Justificado')),
  FOREIGN KEY (id_sesion) REFERENCES sesiones(id_sesion) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (id_inscripcion) REFERENCES inscripciones(id_inscripcion) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE (id_sesion, id_inscripcion)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'docente' CHECK (rol IN ('administrador', 'docente')),
  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
  id_docente INTEGER UNIQUE,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_docente) REFERENCES docentes(id_docente) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK ((rol = 'administrador' AND id_docente IS NULL) OR (rol = 'docente' AND id_docente IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_matriculas_grupo ON matriculas(id_grupo);
CREATE INDEX IF NOT EXISTS idx_asignaciones_docente ON asignaciones_academicas(id_docente);
CREATE INDEX IF NOT EXISTS idx_asignaciones_grupo ON asignaciones_academicas(id_grupo);
CREATE INDEX IF NOT EXISTS idx_inscripciones_asignacion ON inscripciones(id_asignacion);
CREATE INDEX IF NOT EXISTS idx_asistencias_inscripcion ON asistencias(id_inscripcion);
