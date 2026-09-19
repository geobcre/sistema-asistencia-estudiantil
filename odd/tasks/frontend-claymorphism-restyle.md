# Restyle frontend: claymorphism + vibrant palette

## Objective
Restyle the existing attendance admin panel (not a new landing page — decision confirmed
with the user) into a playful claymorphism look with vibrant colors, adapting the
"educational platform" concepts requested to what this app actually is.

## Why
User asked for a landing-page-style prompt (claymorphism cards, course catalog preview,
progress tracking demo, testimonials, enrollment CTA). Clarified with the user: this is an
internal school attendance tool, not a course marketplace, so the visual language is
adopted but content concepts are mapped onto real features. Testimonials have no backing
data and would be fabricated — dropped rather than invented.

## Scope
- `src/styles.css`: new design tokens (vibrant palette, claymorphism shadow recipe,
  bigger radii), rewritten component styles (sidebar, cards, buttons, stamps, pills, tables).
- `index.html`: swap font imports (Newsreader/IBM Plex Sans → playful pair, e.g.
  Fredoka for display + Nunito for body).
- `src/App.jsx`: sidebar visual only (icons/active state), no logic change.
- `src/components/Cursos.jsx`: add a course-card grid ("catalog preview") above/alongside
  the management table.
- `src/components/Estadisticas.jsx`: percentages rendered as progress bars, color-coded
  using the existing risk threshold (>=85 green / 75-84 yellow / <75 coral) already
  defined server-side as UMBRAL_RIESGO=75.
- `src/components/Asistencia.jsx`: restyle the stamp buttons as puffy clay circles per
  estado (presente/ausente/tarde/justificado) — mostly CSS, minimal/no JSX change.
- `src/components/Docentes.jsx`, `Estudiantes.jsx`, `Reportes.jsx`: CSS-only restyle via
  shared classes, no structural change expected.

## Explicitly out of scope
- No fabricated testimonials or fake enrollment marketing CTA (no backing data/use case
  for an internal admin tool).
- No backend changes.

## Constraints
- Keep all existing functionality (CRUD, inscripciones, stamp upsert, filters) working —
  visual-only pass except the Cursos catalog-card addition, which is additive.
- Keep semantic color mapping so attendance states stay distinguishable (not just "pretty").
- Match existing code conventions (Spanish domain naming/comments, existing component
  structure) — do not introduce English naming inconsistent with the rest of the codebase.

## Checks
- No frontend test suite exists (backend-only, vitest+supertest) — no TDD red/green
  applicable to this CSS/JSX visual change.
- `npm run build` (frontend) must succeed.
- Manual verification: `npm run dev` (frontend) + browser check of all 6 sections,
  confirm no regressions (forms submit, table actions work, stamp upsert works).

## Progress
- [x] Design tokens + global styles rewritten (styles.css)
- [x] Font swap (index.html)
- [x] Sidebar restyle (App.jsx)
- [x] Cursos: catalog card grid added
- [x] Estadisticas: progress bars
- [x] Asistencia: clay stamp buttons
- [x] Docentes/Estudiantes/Reportes: restyled via shared classes
- [x] Build passes
- [x] Manual browser verification across all sections

### Design tokens chosen
- Background: soft lavender `#efe6fb`; cards/surface `#fdfbff`.
- Brand/accent: vibrant violet `#8b5cf6` (sidebar, primary buttons, active nav) with a
  pink `#fb6f9c` secondary accent used only for the "Inscribir" CTA button (`.btn-cta`).
- Semantic attendance colors preserved as distinguishable hues: presente = emerald
  `#22c55e`, ausente = coral `#ff6b6b`, tarde = amber `#fbbf24`, justificado = sky blue
  `#38bdf8`.
- Claymorphism recipe: `--clay-shadow` (dual offset soft shadow: violet-tinted dark side +
  white highlight side), `--clay-shadow-inset` for recessed inputs/tracks, and
  `--clay-shadow-pressed` for button/stamp active state. Radius raised to 24px (cards),
  16px (inputs), full pill for buttons/chips/pills.
- Fonts: Fredoka (display/headings) + Nunito (body), swapped in `index.html` and the
  `--font-display`/`--font-body` CSS variables.
- Sidebar nav numbering (`01`/`02`…) replaced with emoji icons per section
  (`.nav-num` renamed to `.nav-icon`); no logic change.

### Verification performed
- `npm run build`: passed, no errors (see below).
- Browser verification: performed via headless Chrome + puppeteer-core (no
  `chromium-cli`/Claude-in-Chrome available in this session — that skill reported the
  extension isn't connected). Script navigated all 6 sections against the real backend
  (SQLite dev data) and confirmed:
  - All 6 nav sections render with claymorphism styling, screenshots captured for each.
  - Cursos catalog grid renders 3 real cursos (Matemática I, Lenguaje, Ciencias
    Naturales) with nombre/codigo/horario/docente; existing table + forms still present
    and functional (add/edit/delete unaffected).
  - Estadisticas progress bars render (9 found) color-coded per the 3-tier rule
    (>=85 green, 75-84 amber, <75 coral) confirmed visually (100% green, 67%/33% coral).
  - Asistencia: clicked a "P" (presente) stamp — it visually filled in (`is-set`) and
    persisted via the real API upsert (confirmed by re-render); this created one real
    dev-DB attendance record (Ana García / Matemática I / today) as a side effect of
    exercising the real upsert flow.
  - Docentes: submitted the add-teacher form with a test docente, confirmed it appeared
    in the table, then deleted it via the existing "Eliminar" action to leave the dev DB
    clean.
  - `console --errors` equivalent (Puppeteer `console` listener) showed only two
    pre-existing, unrelated items: a 404 for `/favicon.ico` (no favicon in this project,
    pre-existing) and a React "missing key" warning in `Cursos.jsx`'s table-row
    `<>...</>` fragment map — that fragment existed before this change and was not
    touched (only the new, separately-keyed `.catalog-card` grid was added). No page
    errors (`pageerror`) were thrown in any section.

### Out of scope / not done
- No testimonials or fabricated enrollment marketing content, per the brief.
- No backend changes.
- Did not fix the pre-existing missing-`key` warning in `Cursos.jsx`'s existing table
  fragment (out of scope: no logic/structural changes beyond the additive catalog grid).
- Did not add a favicon (pre-existing gap, unrelated to this restyle).

## Next step
None — restyle complete and verified. Optional follow-up (not requested): a project
`run` skill for this app's dev-server + puppeteer-core verification flow, since no such
skill existed and one had to be improvised this session.
