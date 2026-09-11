# Sistema de Control de Asistencia Estudiantil

Proyecto completo: **frontend en React + Vite** conectado a un **backend real en
Node.js + Express**, con persistencia en **SQLite** (base de datos en un solo
archivo, sin necesidad de instalar un servidor de base de datos aparte).

Cubre los 6 módulos: Docentes, Estudiantes, Cursos, Asistencia, Estadísticas
y Reportes.

## Estructura del proyecto

```
attendance-system/
├── src/                     ← Frontend (React + Vite)
│   ├── App.jsx
│   ├── api.js                ← cliente que llama a la API
│   └── components/
│       ├── Docentes.jsx
│       ├── Estudiantes.jsx
│       ├── Cursos.jsx
│       ├── Asistencia.jsx
│       ├── Estadisticas.jsx
│       └── Reportes.jsx
│
└── backend/                 ← Backend (Node.js + Express + SQLite)
    ├── asistencia.db          ← se crea automáticamente al primer arranque
    └── src/
        ├── server.js
        ├── db.js              ← esquema de tablas + datos de ejemplo
        └── routes/
            ├── docentes.js
            ├── estudiantes.js
            ├── cursos.js
            ├── sesiones.js
            ├── estadisticas.js
            └── reportes.js
```

## Cómo correrlo (necesitas DOS terminales abiertas a la vez)

**Terminal 1 — Backend:**

```bash
cd backend
npm install
npm run dev
```

Debe mostrar: `API escuchando en http://localhost:4000`
La primera vez que corre, crea el archivo `asistencia.db` con datos de ejemplo
(3 docentes, 6 estudiantes, 3 cursos, inscripciones y algunas asistencias ya
registradas).

**Terminal 2 — Frontend:**

```bash
npm install
npm run dev
```

Abre en el navegador la URL que te muestra (normalmente `http://localhost:5173`).

Si el backend no está corriendo, el frontend te mostrará un aviso de "No se
pudo conectar con la API" en vez de fallar en silencio.

## Cómo funciona la persistencia

- Cada acción en la interfaz (crear un docente, inscribir un estudiante,
  marcar una asistencia) hace una petición HTTP real al backend
  (`src/api.js`), que guarda el cambio en `backend/asistencia.db`.
- Si cierras el servidor y lo vuelves a abrir, **los datos siguen ahí** — a
  diferencia del prototipo anterior, que vivía solo en memoria del navegador.
- Si en algún momento quieres reiniciar la base de datos a los datos de
  ejemplo originales, simplemente borra el archivo `backend/asistencia.db` y
  vuelve a correr `npm run dev` en el backend — se recreará automáticamente.

## Especificación de la API

Los endpoints implementados siguen la especificación REST del documento
técnico (ver sección "Docentes", "Estudiantes", "Cursos", "Asistencia",
"Estadísticas" y "Reportes"). Por simplicidad, este prototipo aún no incluye
autenticación por rol (`/api/auth/login`) — los endpoints están abiertos.
Eso queda documentado como siguiente paso hacia la arquitectura objetivo.

## Desplegar en producción (opcional)

- **Frontend:** se puede desplegar en Vercel igual que antes (`vercel` desde
  la raíz del proyecto, o conectando el repo de GitHub).
- **Backend + base de datos:** Vercel no es ideal para un backend con SQLite
  persistente (su sistema de archivos es temporal). Para desplegar el backend
  real, conviene usar un servicio como **Render**, **Railway** o un servidor
  propio, y actualizar `BASE_URL` en `src/api.js` para que apunte a esa URL
  en vez de `http://localhost:4000`.

## Trabajo en equipo (Git)

Recuerda hacer commit de **ambas** carpetas (`src/` y `backend/`) — cada una
tiene su propio `.gitignore` para no subir `node_modules` ni el archivo de
base de datos (`asistencia.db`), que debe generarse localmente en la máquina
de cada integrante del equipo.
