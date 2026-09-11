import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Cursos({ store }) {
  const { cursos, setCursos, docentes, estudiantes } = store
  const [form, setForm] = useState({ nombre: '', codigo: '', horario: '', idDocente: '' })
  const [editId, setEditId] = useState(null)
  const [cursoAbierto, setCursoAbierto] = useState(null)
  const [inscritosPorCurso, setInscritosPorCurso] = useState({})
  const [estudianteAInscribir, setEstudianteAInscribir] = useState('')
  const [error, setError] = useState(null)

  function resetForm() {
    setForm({ nombre: '', codigo: '', horario: '', idDocente: '' })
    setEditId(null)
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre) return
    const payload = { ...form, idDocente: form.idDocente ? Number(form.idDocente) : null }
    try {
      if (editId) {
        const actualizado = await api.editarCurso(editId, payload)
        setCursos(cursos.map((c) => (c.id === editId ? actualizado : c)))
      } else {
        const nuevo = await api.crearCurso(payload)
        setCursos([...cursos, nuevo])
      }
      resetForm()
    } catch (err) {
      setError(err.message)
    }
  }

  function editar(curso) {
    setEditId(curso.id)
    setForm({
      nombre: curso.nombre,
      codigo: curso.codigo ?? '',
      horario: curso.horario ?? '',
      idDocente: curso.id_docente ?? '',
    })
  }

  async function eliminar(id) {
    try {
      await api.eliminarCurso(id)
      setCursos(cursos.filter((c) => c.id !== id))
      if (editId === id) resetForm()
      if (cursoAbierto === id) setCursoAbierto(null)
    } catch (err) {
      setError(err.message)
    }
  }

  function nombreDocente(idDocente) {
    const d = docentes.find((doc) => doc.id === idDocente)
    return d ? `${d.nombre} ${d.apellido}` : 'Sin asignar'
  }

  async function abrirCurso(idCurso) {
    if (cursoAbierto === idCurso) {
      setCursoAbierto(null)
      return
    }
    setCursoAbierto(idCurso)
    try {
      const lista = await api.getEstudiantesDeCurso(idCurso)
      setInscritosPorCurso((prev) => ({ ...prev, [idCurso]: lista }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function inscribir(idCurso) {
    if (!estudianteAInscribir) return
    try {
      const lista = await api.inscribirEstudiante(idCurso, Number(estudianteAInscribir))
      setInscritosPorCurso((prev) => ({ ...prev, [idCurso]: lista }))
      setEstudianteAInscribir('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function desinscribir(idCurso, idEstudiante) {
    try {
      await api.desinscribirEstudiante(idCurso, idEstudiante)
      setInscritosPorCurso((prev) => ({
        ...prev,
        [idCurso]: (prev[idCurso] || []).filter((e) => e.id !== idEstudiante),
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 03</p>
        <h1>Cursos</h1>
        <p className="section-sub">Cursos, docente asignado y estudiantes inscritos.</p>
      </header>

      {error && <p className="muted" style={{ color: 'var(--clay)' }}>{error}</p>}

      <div className="panel-grid">
        <form className="card form-card" onSubmit={guardar}>
          <h2>{editId ? 'Editar curso' : 'Nuevo curso'}</h2>
          <label>
            Nombre del curso
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
              {editId ? 'Guardar cambios' : 'Agregar curso'}
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
                <th>Curso</th>
                <th>Docente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((c) => (
                <>
                  <tr key={c.id}>
                    <td>
                      <button className="link-btn as-title" onClick={() => abrirCurso(c.id)}>
                        {c.nombre} <span className="muted">· {c.codigo}</span>
                      </button>
                    </td>
                    <td className="muted">{nombreDocente(c.id_docente)}</td>
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => editar(c)}>Editar</button>
                      <button className="link-btn link-danger" onClick={() => eliminar(c.id)}>Eliminar</button>
                    </td>
                  </tr>
                  {cursoAbierto === c.id && (
                    <tr className="detail-row">
                      <td colSpan={3}>
                        <div className="inline-panel">
                          <p className="detail-label">Estudiantes inscritos</p>
                          <ul className="chip-list">
                            {(inscritosPorCurso[c.id] || []).map((s) => (
                              <li key={s.id} className="chip">
                                {s.nombre} {s.apellido}
                                <button className="chip-remove" onClick={() => desinscribir(c.id, s.id)}>×</button>
                              </li>
                            ))}
                            {(inscritosPorCurso[c.id] || []).length === 0 && (
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
                                <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>
                              ))}
                            </select>
                            <button className="btn btn-secondary" onClick={() => inscribir(c.id)}>Inscribir</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {cursos.length === 0 && (
                <tr><td colSpan={3} className="empty-row">No hay cursos registrados todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
