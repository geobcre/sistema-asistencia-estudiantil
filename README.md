# Sistema de Control de Asistencia Estudiantil

Sistema web para la gestión y control de asistencia estudiantil.

El proyecto utiliza **React + Vite** para el frontend y **Node.js + Express + SQLite** para el backend. La aplicación cuenta con autenticación mediante JWT, control de acceso por roles y una API REST para la comunicación entre el frontend y el backend.

## Tecnologías utilizadas

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Node.js
- Express
- SQLite
- better-sqlite3
- bcryptjs
- JSON Web Token (JWT)

## Requisitos

Antes de ejecutar el proyecto se debe tener instalado:

- Node.js
- npm
- Git

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/geobcre/sistema-asistencia-estudiantil.git
```

Entrar al proyecto:

```bash
cd sistema-asistencia-estudiantil
```

## Ejecutar el backend

Abrir una terminal y entrar a:

```bash
cd backend
```

Instalar las dependencias:

```bash
npm install
```

Iniciar el servidor:

```bash
npm run dev
```

El backend se ejecuta en:

```text
http://localhost:4000
```

La base de datos SQLite se inicializa automáticamente al ejecutar el backend utilizando la estructura definida en:

```text
backend/database/schema.sql
```

## Ejecutar el frontend

Abrir una segunda terminal desde la raíz del proyecto.

Instalar las dependencias:

```bash
npm install
```

Ejecutar:

```bash
npm run dev
```

Vite mostrará la dirección del frontend, normalmente:

```text
http://localhost:5173
```

## Acceso al sistema

Para desarrollo y pruebas se crea automáticamente un usuario administrador inicial.

### Credenciales de prueba

```text
Correo: admin@escuela.edu
Contraseña: Admin123*
Rol: Administrador
```

Estas credenciales son únicamente para desarrollo y demostración del proyecto.

## Funcionalidades implementadas

Actualmente el sistema cuenta con:

- Inicio y cierre de sesión.
- Autenticación mediante JWT.
- Contraseñas almacenadas mediante hash.
- Control de acceso mediante roles Administrador y Docente.
- Protección de rutas del backend.
- Gestión de usuarios.
- Gestión de docentes.
- Gestión de estudiantes.
- Gestión de ciclos escolares.
- Gestión de grupos.
- Gestión de asignaturas.
- Gestión de asignaciones académicas.
- Matrícula de estudiantes en grupos.
- Inscripción de estudiantes en asignaciones académicas.
- Creación y administración de sesiones de clase.
- Registro y corrección de asistencia.
- Estados de asistencia: Presente, Ausente, Tarde y Justificado.
- Cálculo de estudiantes pendientes de registrar.
- Estadísticas de asistencia por asignación académica, por estudiante y en general, con detección de estudiantes en riesgo (menos de 75 %).
- Reportes de asistencia con filtros (ciclo, grupo, asignación, estudiante, estado y rango de fechas) y exportación a CSV compatible con Excel.
- Consulta del historial de asistencia de estudiantes.
- Persistencia de información mediante SQLite.

## Modelo académico

El sistema utiliza un modelo académico que permite separar las diferentes responsabilidades y conservar el historial de la información.

El flujo principal es:

```text
Ciclo escolar
      ↓
    Grupo
      ↓
  Matrícula ← Estudiante
      ↓
 Inscripción
      ↓
Asignación académica
   ↙           ↘
Docente      Asignatura
      ↓
    Sesión
      ↓
  Asistencia
```

Una **asignación académica** representa la relación entre una asignatura, un docente y un grupo durante un período determinado.

Las matrículas permiten relacionar a los estudiantes con sus grupos y ciclos escolares, mientras que las inscripciones determinan en qué asignaciones académicas participa cada estudiante.

## Módulos del sistema

El proyecto contempla los siguientes módulos:

1. Docentes
2. Estudiantes
3. Asignaturas y asignaciones académicas
4. Matrículas e inscripciones
5. Asistencia
6. Estadísticas
7. Reportes

Todos los módulos se encuentran conectados con la API REST y la base de datos.

### Reglas de cálculo de las estadísticas

- Presente y Tarde cuentan como asistencia.
- Una ausencia Justificada no baja el porcentaje: se muestra aparte y queda fuera de la base de cálculo (se puede cambiar con `JUSTIFICADO_PENALIZA` en `backend/src/services/estadisticas.js`).
- Solo cuentan las sesiones no canceladas en las que la matrícula y la inscripción estaban vigentes.
- Un estudiante sin registros no genera división por cero: su porcentaje es `null` y la pantalla muestra «—».
- Un estudiante está en riesgo si su inscripción está activa y su asistencia es menor a 75 %.
- El administrador consulta todo; el docente solo sus asignaciones académicas.

## Estructura general

```text
sistema-asistencia-estudiantil/
│
├── backend/
│   ├── database/
│   │   └── schema.sql
│   │
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── asignaciones.js
│   │   │
│   │   ├── services/
│   │   │   └── estadisticas.js
│   │   │
│   │   ├── utils/
│   │   │   └── validaciones.js
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── usuarios.js
│   │   │   ├── docentes.js
│   │   │   ├── estudiantes.js
│   │   │   ├── ciclos.js
│   │   │   ├── grupos.js
│   │   │   ├── asignaturas.js
│   │   │   ├── asignaciones-academicas.js
│   │   │   ├── matriculas.js
│   │   │   ├── inscripciones.js
│   │   │   ├── sesiones.js
│   │   │   ├── estadisticas.js
│   │   │   └── reportes.js
│   │   │
│   │   ├── test/
│   │   ├── app.js
│   │   ├── db.js
│   │   └── server.js
│   │
│   └── package.json
│
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Docentes.jsx
│   │   ├── Estudiantes.jsx
│   │   ├── Cursos.jsx
│   │   ├── Asistencia.jsx
│   │   ├── Estadisticas.jsx
│   │   └── Reportes.jsx
│   │
│   ├── utils/
│   │   └── csv.js
│   │
│   ├── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
│
├── .gitignore
├── index.html
├── package.json
├── README.md
└── vite.config.js
```

## Base de datos

El backend utiliza **SQLite** y su estructura principal se encuentra definida en:

```text
backend/database/schema.sql
```

El modelo está compuesto por 11 tablas principales:

- `usuarios`
- `docentes`
- `estudiantes`
- `ciclos_escolares`
- `grupos`
- `matriculas`
- `asignaturas`
- `asignaciones_academicas`
- `inscripciones`
- `sesiones`
- `asistencias`

El sistema utiliza estados y retiros lógicos para conservar el historial académico y evitar la eliminación innecesaria de información.

## API REST

El frontend consume la API REST proporcionada por Express.

Entre los principales recursos disponibles se encuentran:

```text
/api/auth
/api/usuarios
/api/docentes
/api/estudiantes
/api/ciclos
/api/grupos
/api/asignaturas
/api/asignaciones-academicas
/api/matriculas
/api/inscripciones
/api/sesiones
/api/estadisticas   (resumen, asignacion/:id, estudiante/:id, riesgo)
/api/reportes       (filtros por query string)
```

La toma de asistencia se realiza mediante las sesiones y sus inscripciones asociadas.

## Seguridad

El sistema implementa autenticación mediante JWT y control de acceso basado en roles.

Las solicitudes realizadas desde el frontend hacia las rutas protegidas incluyen el token mediante:

```text
Authorization: Bearer <token>
```

Las contraseñas no se almacenan directamente en la base de datos, sino mediante hash.

Los usuarios con rol **Administrador** pueden administrar los diferentes recursos académicos, mientras que los usuarios con rol **Docente** tienen acceso restringido a las asignaciones académicas que les corresponden.

## Pruebas

El backend cuenta con pruebas automatizadas para verificar funcionalidades como:

- autenticación;
- usuarios;
- docentes;
- estudiantes;
- estructura académica;
- matrículas;
- inscripciones;
- sesiones;
- asistencia;
- estadísticas (porcentajes, riesgo, permisos por rol);
- reportes (filtros, validaciones, permisos por rol y carga de 10,000 registros).

Las pruebas pueden ejecutarse desde la carpeta `backend` mediante:

```bash
npm test
```

Ejecute `npm test` para ver el conteo actual de pruebas.

## Trabajo colaborativo

Antes de comenzar a realizar cambios se recomienda actualizar `main`:

```bash
git switch main
git pull origin main
```

Para funcionalidades o cambios importantes se recomienda trabajar en una rama independiente:

```bash
git switch -c nombre-de-la-rama
```

Después de realizar los cambios:

```bash
git add .
git commit -m "descripcion del cambio"
git push
```

Los mensajes de commit deben describir claramente la funcionalidad realizada.

Ejemplos:

```text
feat: implementar matriculas e inscripciones
feat: adaptar sesiones y asistencia
fix: corregir validacion de inscripciones
refactor: actualizar modelo academico
```

## Estado actual

El sistema ya utiliza el nuevo modelo académico para gestionar estudiantes, docentes, ciclos escolares, grupos, asignaturas, asignaciones académicas, matrículas, inscripciones, sesiones y asistencias.

El frontend consume la API REST del backend para los módulos principales y la información se almacena persistentemente en SQLite.

Los módulos de **Estadísticas** y **Reportes** ya fueron adaptados a la nueva estructura académica.
