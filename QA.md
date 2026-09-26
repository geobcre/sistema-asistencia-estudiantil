# Aseguramiento de la Calidad — Implementación real

Este documento acompaña al Plan de Aseguramiento de la Calidad (PAQ) entregado
para el curso, y describe lo que efectivamente quedó implementado en el
repositorio (no solo propuesto en el documento).

## 1. Pruebas automatizadas (RF-05)

Ubicadas en `backend/src/test/`, usando **Vitest** + **Supertest** contra una
base de datos SQLite en memoria (no se toca la base de datos real).

| Archivo | Casos de prueba cubiertos |
|---|---|
| `cursos.test.js` | CP-01 (no duplicar inscripción), CP-05 (eliminar docente no elimina el curso) |
| `asistencia.test.js` | CP-02 (upsert de asistencia), CP-06/CP-07 (creación idempotente de sesión), validación de estado inválido |
| `estadisticas.test.js` | CP-03 (sin división por cero), CP-08 (estado "tarde" cuenta como asistencia), cálculo de porcentaje |
| `docentes.test.js` | CP-09 (CRUD de docentes, validación de campos requeridos) |
| `estudiantes.test.js` | CP-10 (CRUD de estudiantes, historial de asistencia por estudiante) |
| `reportes.test.js` | CP-11 (filtros por curso, rango de fechas y estudiante) |
| `cursos-crud.test.js` | CP-12 (CRUD de cursos, listado y eliminación de inscripciones) |
| `sesiones.test.js` | CP-13 (listado de sesiones por curso, listado de asistencia por sesión) |
| `reportes-carga.test.js` | CP-14 (carga de 10,000 registros, RNF-04) |

### Cómo correrlas

```bash
cd backend
npm install
npm test
```

Salida esperada: todos los archivos y casos anteriores en verde (correr
`npm test` mostrará el conteo exacto de la versión instalada).

## 2. Integración continua / CI-CD (RF-05)

Archivo: `.github/workflows/ci.yml`

Se ejecuta automáticamente en GitHub cada vez que se hace `push` o se abre un
Pull Request hacia `main`. Tiene dos jobs:

1. **test-backend** — instala dependencias del backend y corre `npm test`.
   Si alguna prueba falla, el workflow se marca en rojo (❌) en GitHub.
2. **build-frontend** — verifica que el frontend compile sin errores
   (`npm run build`).

Para verlo funcionar: después de subir estos cambios a GitHub, ve a la pestaña
**Actions** del repositorio — ahí aparecerá la ejecución con el detalle de
cada paso.

## 3. Registro y control de defectos (RF-04)

Archivo: `.github/ISSUE_TEMPLATE/defecto.yml`

Agrega una plantilla estructurada al crear un nuevo Issue en GitHub, con
campos obligatorios: severidad, módulo afectado, pasos para reproducir,
resultado esperado vs. obtenido.

**Para activarla por completo**, crea estas etiquetas (labels) en tu
repositorio — GitHub → pestaña *Issues* → *Labels* → *New label*:

| Etiqueta | Color sugerido | Uso |
|---|---|---|
| `defecto` | Rojo | Se aplica automáticamente al usar la plantilla |
| `severidad-critica` | Rojo oscuro | Defectos que bloquean funcionalidad core |
| `severidad-alta` | Naranja | Afecta un módulo pero no bloquea el sistema |
| `severidad-media` | Amarillo | Defecto menor o cosmético relevante |
| `severidad-baja` | Gris | Mejora o defecto cosmético menor |
| `en-correccion` | Azul | Alguien ya está trabajando en el defecto |
| `resuelto` | Verde | Corregido, pendiente de verificar |

Flujo de estados propuesto en el PAQ: **Abierto → En revisión → En corrección
→ Resuelto → Cerrado (verificado)**, reflejado en las etiquetas de arriba más
el cierre nativo de Issues de GitHub.

## 4. Qué falta (trabajo futuro, no bloqueante para esta entrega)

- Autenticación por rol (mencionada como pendiente en el PAQ, RNF-03).

### Cerrado desde la última revisión

- ~~Prueba de carga real sobre el módulo de Reportes con 10,000 registros
  (RNF-04)~~ → `reportes-carga.test.js` (CP-14): inserta 10,000 registros
  directo en SQLite y verifica que `/api/reportes` los devuelva completos y
  en menos de 5s.
- ~~Ampliar cobertura de pruebas automatizadas a los módulos de Docentes,
  Estudiantes y Reportes~~ → `docentes.test.js` (CP-09), `estudiantes.test.js`
  (CP-10) y `reportes.test.js` (CP-11). También se agregó cobertura de CRUD
  completo para Cursos (`cursos-crud.test.js`, CP-12) y de las rutas de
  consulta de Sesiones (`sesiones.test.js`, CP-13), que tampoco tenían
  pruebas automatizadas propias.
