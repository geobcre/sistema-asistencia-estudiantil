import { Fragment, useState } from 'react'
import { nombreGrupo } from '../data/mockData.js'

export default function Cursos({ store }) {
  const { cursos, setCursos, grupos, docentes, estudiantes, inscripciones, setInscripciones } = store
  const [form, setForm] = useState({ nombre: '', codigo: '', horario: '', idDocente: '' })
  const [editId, setEditId] = useState(null)
  const [cursoAbierto, setCursoAbierto] = useState(null)
  const [estudianteAInscribir, setEstudianteAInscribir] = useState('')

  function resetForm() {
    setForm({ nombre: '', codigo: '', horario: '', idDocente: '' })
    setEditId(null)
  }

  function guardar(e) {
    e.preventDefault()
    if (!form.nombre) return
    const payload = { ...form, idDocente: form.idDocente ? Number(form.idDocente) : null }

    if (editId) {
      setCursos(cursos.map((c) => (c.id === editId ? { ...c, ...payload } : c)))
    } else {
      const nuevoId = Math.max(0, ...cursos.map((c) => c.id)) + 1
      setCursos([...cursos, { id: nuevoId, ...payload }])
    }
    resetForm()
  }

  function editar(curso) {
    setEditId(curso.id)
    setForm({
      nombre: curso.nombre,
      codigo: curso.codigo,
      horario: curso.horario,
      idDocente: curso.idDocente ?? '',
    })
  }

  function eliminar(id) {
    setCursos(cursos.filter((c) => c.id !== id))
    setInscripciones(inscripciones.filter((i) => i.idCurso !== id))
    if (editId === id) resetForm()
    if (cursoAbierto === id) setCursoAbierto(null)
  }

  function nombreDocente(idDocente) {
    const d = docentes.find((doc) => doc.id === idDocente)
    return d ? `${d.nombre} ${d.apellido}` : 'Sin asignar'
  }

  function estudiantesDeCurso(idCurso) {
    const ids = inscripciones.filter((i) => i.idCurso === idCurso).map((i) => i.idEstudiante)
    return estudiantes.filter((s) => ids.includes(s.id))
  }

  function inscribir(idCurso) {
    if (!estudianteAInscribir) return
    const yaInscrito = inscripciones.some(
      (i) => i.idCurso === idCurso && i.idEstudiante === Number(estudianteAInscribir)
    )
    if (yaInscrito) return
    const nuevoId = Math.max(0, ...inscripciones.map((i) => i.id)) + 1
    setInscripciones([
      ...inscripciones,
      { id: nuevoId, idCurso, idEstudiante: Number(estudianteAInscribir) },
    ])
    setEstudianteAInscribir('')
  }

  function desinscribir(idCurso, idEstudiante) {
    setInscripciones(
      inscripciones.filter((i) => !(i.idCurso === idCurso && i.idEstudiante === idEstudiante))
    )
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 03</p>
        <h1>Asignaturas</h1>
        <p className="section-sub">Materias, docente asignado y estudiantes inscritos por grupo.</p>
      </header>

      <div className="panel-grid">
        <form className="card form-card" onSubmit={guardar}>
          <h2>{editId ? 'Editar asignatura' : 'Nueva asignatura'}</h2>
          <label>
            Nombre de la asignatura
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Matemática I"
              required
            />
          </label>
          <label>
            Código
            <input
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              placeholder="MAT-101"
            />
          </label>
          <label>
            Horario
            <input
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
              placeholder="Lun/Mié 8:00"
            />
          </label>
          <label>
            Docente asignado
            <select
              value={form.idDocente}
              onChange={(e) => setForm({ ...form, idDocente: e.target.value })}
            >
              <option value="">Sin asignar</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editId ? 'Guardar cambios' : 'Agregar asignatura'}
            </button>
            {editId && (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Asignatura</th>
                <th>Docente</th>
                <th>Inscritos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((c) => (
                <Fragment key={c.id}>
                  <tr key={c.id}>
                    <td>
                      <button className="link-btn as-title" onClick={() => setCursoAbierto(cursoAbierto === c.id ? null : c.id)}>
                        {c.nombre} <span className="muted">· {c.codigo}</span>
                      </button>
                    </td>
                    <td className="muted">{nombreDocente(c.idDocente)}</td>
                    <td className="muted">{estudiantesDeCurso(c.id).length}</td>
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => editar(c)}>Editar</button>
                      <button className="link-btn link-danger" onClick={() => eliminar(c.id)}>Eliminar</button>
                    </td>
                  </tr>
                  {cursoAbierto === c.id && (
                    <tr className="detail-row">
                      <td colSpan={4}>
                        <div className="inline-panel">
                          <p className="detail-label">Estudiantes inscritos</p>
                          <ul className="chip-list">
                            {estudiantesDeCurso(c.id).map((s) => (
                              <li key={s.id} className="chip">
                                {s.nombre} {s.apellido}
                                <span className="muted"> · {nombreGrupo(grupos.find((grupo) => grupo.id === s.idGrupo))}</span>
                                <button className="chip-remove" onClick={() => desinscribir(c.id, s.id)}>×</button>
                              </li>
                            ))}
                            {estudiantesDeCurso(c.id).length === 0 && (
                              <li className="muted">Ningún estudiante inscrito aún.</li>
                            )}
                          </ul>
                          <div className="inline-form">
                            <select
                              value={estudianteAInscribir}
                              onChange={(e) => setEstudianteAInscribir(e.target.value)}
                            >
                              <option value="">Seleccionar estudiante…</option>
                              {estudiantes.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.nombre} {s.apellido} · {nombreGrupo(grupos.find((grupo) => grupo.id === s.idGrupo))}
                                </option>
                              ))}
                            </select>
                            <button className="btn btn-secondary" onClick={() => inscribir(c.id)}>Inscribir</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {cursos.length === 0 && (
                <tr><td colSpan={4} className="empty-row">No hay asignaturas registradas todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
