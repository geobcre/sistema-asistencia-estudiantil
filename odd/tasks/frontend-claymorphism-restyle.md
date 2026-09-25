# Restyle frontend: visual language iterations

## Objective
Restyle the existing attendance admin panel (not a new landing page — decision confirmed
with the user) with a visual language adapted from marketing-landing-page prompts the user
supplies, mapping their content concepts onto what this app actually is.

## Why
User asked for a landing-page-style prompt (claymorphism cards, course catalog preview,
progress tracking demo, testimonials, enrollment CTA). Clarified with the user: this is an
internal school attendance tool, not a course marketplace, so the visual language is
adopted but content concepts are mapped onto real features. Testimonials have no backing
data and would be fabricated — dropped rather than invented.

## Round 2 (superseding the palette below)
User reviewed the claymorphism/vibrant result on localhost and didn't like the colors.
New source prompt: "caring veterinary clinic landing page, soft UI elements, services
overview, vet team profiles, emergency contact section, appointment booking, calming
pet-friendly colors." Same mapping approach as round 1: keep the 6 real sections, adopt
the *style* (soft UI / neumorphism, calming palette) and the content concepts that have a
real analogue (vet team profiles → Docentes gets profile-style treatment), drop what
doesn't (no fabricated "emergency contact" section, no literal "appointment booking" flow
— sesiones/inscripciones already covers that ground). Reopening the design-token and
per-component checklist items below for this pass; the structural additions from round 1
(Cursos catalog grid, Estadisticas progress bars) are kept and re-skinned, not rebuilt.

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

## Progress — Round 1 (claymorphism, superseded)
- [x] Design tokens + global styles rewritten (styles.css)
- [x] Font swap (index.html)
- [x] Sidebar restyle (App.jsx)
- [x] Cursos: catalog card grid added
- [x] Estadisticas: progress bars
- [x] Asistencia: clay stamp buttons
- [x] Docentes/Estudiantes/Reportes: restyled via shared classes
- [x] Build passes
- [x] Manual browser verification across all sections

## Progress — Round 2 (soft UI, calming palette)
- [x] Design tokens + global styles rewritten for soft-UI/neumorphism (styles.css)
- [x] Font swap if needed (index.html) — evaluate whether Fredoka/Nunito still fit a
      calmer tone or need replacing (e.g. Quicksand/Comfortaa + Nunito)
- [x] Sidebar restyle to soft-UI look
- [x] Cursos: catalog cards re-skinned (structure kept)
- [x] Estadisticas: progress bars re-skinned (structure kept)
- [x] Asistencia: stamp buttons re-skinned as soft rounded controls (less "puffy 3D")
- [x] Docentes: add lightweight profile-card touch (initials avatar) — analogue of "vet
      team profiles"
- [x] Estudiantes/Reportes: restyled via shared classes
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

## Round 2 write-up (soft UI / neumorphism, calming palette)

### Design tokens chosen
- Background: warm cream/sand `#f2ede2`; cards/surface a barely-lighter warm cream
  `#faf8f2` (was lavender `#efe6fb`/`#fdfbff`).
- Ink: calm charcoal-sage `#3d4a44` (was violet-tinted `#392b56`); ink-soft muted sage-gray
  `#8a938b`.
- Brand/accent: replaced vibrant violet/pink entirely. Sidebar/primary brand is now sage
  green `#6b9080` (dark `#4f6f5e`, soft `#e4ede8`). The single warm accent (used only for
  `.btn-cta` "Inscribir") is a dusty terracotta/peach `#d98e73` (dark `#b96f55`, soft
  `#f8e8e0`), blended with the brand in a gradient rather than a saturated pink.
- Semantic attendance colors kept distinguishable but pulled into the same muted register:
  presente = soft sage/mint `#7fae82`, ausente = dusty rose/muted terracotta `#cf8783`
  (was harsh coral `#ff6b6b`), tarde = soft honey/mustard `#d2a656`, justificado = soft
  periwinkle `#93a8d9` (hue kept, desaturated slightly). Estadisticas progress-bar
  thresholds unchanged and re-checked against `backend/src/routes/estadisticas.js`
  (UMBRAL_RIESGO=75, "bueno" at 85): >=85 → presente (calm green), 75-84 → tarde (calm
  amber), <75 → ausente (calm terracotta/rose, at risk). Verified in the browser: 100%/67%
  (green/coral, Matemática I) and 100%/0% (green/coral, Lenguaje) render with the correct
  tier colors.
- Radius: reduced from claymorphism's 24px/16px to 18px (cards) / 14px (inputs) — smaller,
  gentler. Pills stay fully round.
- Shadow recipe renamed `--clay-shadow*` → `--soft-shadow*` and rewritten: single warm
  neutral tone (`rgba(148,132,108,…)` shadow + soft white highlight) at much lower opacity
  (0.14-0.18 vs 0.14-0.25 dual-saturated-violet before) and shorter offsets (4-7px vs
  5-12px), so surfaces read as gently embossed/pressed rather than "puffy 3D." Confirmed
  by grep that no JSX references the old `--clay-*` variable names directly (they're only
  consumed inside styles.css), so the rename was safe.
- Fonts: swapped display font Fredoka → **Quicksand** (calmer, still rounded/warm but not
  bold/playful); body font Nunito unchanged. Updated the Google Fonts `<link>` in
  `index.html` and `--font-display` in `styles.css`.
- Sidebar nav emoji icons (`.nav-icon`, from round 1) kept as-is — no logic change.

### Docentes avatar treatment
Added `iniciales(docente)` helper in `src/components/Docentes.jsx` that derives two-letter
initials from `nombre`/`apellido` (first letter of each, uppercased, no image upload).
Rendered as a new `.avatar-initials` circular badge (soft-UI shadow, brand-soft
background/brand-dark text) next to the name in the Docentes table row, wrapped in a new
`.docente-nombre` flex container. No structural/logic change beyond this — CRUD behavior
untouched. Verified in-browser: avatars "MS", "HR", "EV" rendered correctly for the three
seeded docentes.

### Verification performed
- `npm run build`: passed, no errors.
- Browser verification: performed via headless Chrome + puppeteer-core, installed
  temporarily with `npm install --no-save puppeteer-core` and removed afterward
  (`npm uninstall puppeteer-core`); confirmed `package.json`/`package-lock.json` unchanged
  by the temporary install (claude-in-chrome extension was not connected in this session,
  same fallback as round 1). Script navigated all 6 nav sections against the real backend
  (SQLite dev data) and confirmed:
  - All 6 sections render with the new soft-UI palette/shadows, screenshots captured for
    each (Docentes, Estudiantes, Cursos, Asistencia, Estadísticas, Reportes).
  - Cursos catalog grid re-skinned, still renders the 3 real cursos (Matemática I,
    Lenguaje, Ciencias Naturales) with nombre/código/horario/docente; table + forms intact.
  - Estadisticas progress bars re-skinned and color-coded correctly per the 3-tier rule
    (verified computed `background-color` of `.progress-fill` matched `--presente`/
    `--tarde`/`--ausente` for the corresponding percentages, e.g. 100% → sage green,
    67%/33%/0% → dusty rose).
  - Asistencia: inspected the stamp buttons' classes/colors without re-submitting new
    marks — the "P" stamp already marked in round 1 (Ana García / Matemática I) still
    shows `is-set` with the new re-skinned filled color, confirming the toggle CSS still
    works without creating additional dev-DB rows this round.
  - Docentes: avatar-initials badges confirmed rendering real seeded data (see above); no
    new docente created/deleted this round.
  - No new persistent test data created: `git status` shows no change to
    `backend/asistencia.db` (only WAL/SHM churn from ordinary read queries during the dev
    session, not a data mutation).
  - Console messages showed only the same two pre-existing, unrelated items noted in round
    1: a 404 for `/favicon.ico` and the React "missing key" warning in `Cursos.jsx`'s
    existing table-row fragment (untouched by this or the round 1 change). No `pageerror`
    events in any section.

### Out of scope / not done (round 2)
- No emergency-contact section or fabricated appointment-booking flow, per the brief.
- No backend changes.
- Did not fix the pre-existing missing-`key` warning in `Cursos.jsx` (unrelated, out of
  scope for a visual-only pass).
- Did not add a favicon (pre-existing gap).
- Did not add an avatar treatment to the Cursos catalog card's docente line (`nombreDocente`
  returns a plain string there, not the docente object) — kept to the JSX/logic-preserving
  constraint; the table-row avatar in Docentes is the primary "vet team profile" analogue.
