# Sistema de Control de Asistencia Estudiantil

Sistema web para la gestión y control de asistencia estudiantil.

El proyecto utiliza **React + Vite** para el frontend y **Node.js + Express + SQLite** para el backend. Actualmente cuenta con autenticación de usuarios mediante JWT y almacenamiento persistente de información.

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

La base de datos SQLite se inicializa automáticamente al ejecutar el backend.

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

- Inicio de sesión.
- Autenticación mediante JWT.
- Contraseñas almacenadas mediante hash.
- Protección de rutas del backend.
- Cierre de sesión.
- Gestión de docentes.
- Registro, edición y eliminación de docentes.
- Persistencia de docentes en SQLite.
- Gestión de estudiantes.
- Registro, edición y eliminación de estudiantes.
- Persistencia de estudiantes en SQLite.
- Confirmación antes de eliminar registros.
- Manejo de mensajes de éxito y error.

## Módulos del sistema

El proyecto contempla los siguientes módulos:

1. Docentes
2. Estudiantes
3. Asignaturas / Cursos
4. Asistencia
5. Estadísticas
6. Reportes

Los módulos se están migrando progresivamente desde los datos simulados originales hacia el backend y la base de datos SQLite.

## Estructura general

```text
sistema-asistencia-estudiantil/
│
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── docentes.js
│   │   │   ├── estudiantes.js
│   │   │   ├── cursos.js
│   │   │   ├── sesiones.js
│   │   │   ├── estadisticas.js
│   │   │   └── reportes.js
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
│   ├── data/
│   │   └── mockData.js
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

El backend utiliza SQLite.

Entre las entidades principales se encuentran:

- Usuarios
- Docentes
- Estudiantes
- Cursos
- Inscripciones
- Sesiones
- Asistencias

Los módulos se encuentran relacionados de acuerdo con el modelo de datos del sistema.

## Seguridad

El sistema implementa autenticación mediante JWT.

Las solicitudes realizadas desde el frontend hacia las rutas protegidas incluyen el token mediante:

```text
Authorization: Bearer <token>
```

Las contraseñas de los usuarios no se almacenan directamente, sino mediante hash.

## Trabajo colaborativo

Antes de comenzar a realizar cambios se recomienda actualizar `main`:

```bash
git checkout main
git pull origin main
```

Después de realizar una funcionalidad:

```bash
git add .
git commit -m "descripcion del cambio"
git push origin main
```

Los mensajes de commit deben describir claramente la funcionalidad realizada.

Ejemplos:

```text
feat: agregar login y autenticacion JWT
feat: conectar estudiantes con SQLite
feat: conectar cursos con docentes
fix: corregir registro de asistencia
```

## Estado actual

Los módulos de **Docentes** y **Estudiantes** ya utilizan información persistente almacenada en SQLite.

Los demás módulos continuarán siendo migrados progresivamente al backend.

El archivo `mockData.js` todavía se conserva temporalmente debido a que algunos módulos del frontend siguen dependiendo de datos simulados. No debe eliminarse hasta completar la migración.