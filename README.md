# Sistema de Control de Asistencia Estudiantil (prototipo)

Prototipo funcional en **React + Vite**. Todos los datos viven en memoria
(`src/data/mockData.js`) — no hay base de datos real. Al recargar la página,
los datos vuelven a su estado inicial. Cubre los 6 módulos del proyecto:
Docentes, Estudiantes, Cursos, Asistencia, Estadísticas y Reportes.

## Abrir el proyecto en Cursor

1. Descomprime este `.zip` en una carpeta.
2. Abre **Cursor** → `File > Open Folder…` → selecciona la carpeta `attendance-system`.
3. Abre una terminal dentro de Cursor (`Ctrl/Cmd + ñ` o `Terminal > New Terminal`) y ejecuta:

   ```bash
   npm install
   npm run dev
   ```

4. Abre en el navegador la URL que muestra la terminal (normalmente `http://localhost:5173`).

Con esto ya puedes editar cualquier archivo dentro de `src/` y ver los cambios en vivo.

## Estructura del proyecto

```
attendance-system/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx              ← estado global y navegación entre módulos
    ├── styles.css
    ├── data/
    │   └── mockData.js      ← datos simulados (basados en el MER)
    └── components/
        ├── Docentes.jsx
        ├── Estudiantes.jsx
        ├── Cursos.jsx
        ├── Asistencia.jsx
        ├── Estadisticas.jsx
        └── Reportes.jsx
```

## Desplegar en Vercel

**Opción A — sin GitHub (más rápida, con Vercel CLI):**

```bash
npm install -g vercel
cd attendance-system
vercel
```

Sigue las instrucciones en pantalla (te pedirá iniciar sesión con tu cuenta de
Vercel la primera vez). Al final te dará una URL pública ya desplegada.
Para volver a desplegar tras hacer cambios: `vercel --prod`.

**Opción B — con GitHub (recomendada para el proyecto académico):**

1. Crea un repositorio nuevo en GitHub y sube esta carpeta:

   ```bash
   git init
   git add .
   git commit -m "Prototipo inicial - sistema de asistencia"
   git branch -M main
   git remote add origin <URL-de-tu-repo>
   git push -u origin main
   ```

2. Entra a [vercel.com](https://vercel.com), inicia sesión, y haz clic en
   **"Add New… > Project"**.
3. Selecciona el repositorio que acabas de subir. Vercel detecta automáticamente
   que es un proyecto Vite y configura todo solo (no necesitas tocar nada).
4. Clic en **Deploy**. En un par de minutos tendrás una URL pública para
   compartir o entregar como avance del proyecto.

Cada vez que hagas `git push` a `main`, Vercel vuelve a desplegar automáticamente.

## Notas para el informe técnico

- El almacenamiento es **en memoria** (estado de React), simulando el MER
  definido en el documento técnico: Docente, Estudiante, Curso, Inscripción,
  Sesión de clase y Asistencia.
- No hay backend ni base de datos real todavía — este prototipo sirve para
  validar el flujo funcional (UI y lógica) antes de construir la API REST y
  conectar una base de datos persistente.
- El módulo de Reportes exporta a CSV desde el navegador (sin backend).
