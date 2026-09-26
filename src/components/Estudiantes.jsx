import { useState } from 'react'
import { nombreGrupo } from '../data/mockData.js'

export default function Estudiantes({ store }) {
  const { grupos, estudiantes, setEstudiantes } = store
  const [form, setForm] = useState({ nombre: '', apellido: '', carne: '', idGrupo: grupos[0]?.id ?? '' })
  const [editId, setEditId] = useState(null)

  function resetForm() {
    setForm({ nombre: '', apellido: '', carne: '', idGrupo: grupos[0]?.id ?? '' })
    setEditId(null)
  }

  function guardar(e) {
    e.preventDefault()
    if (!form.nombre || !form.apellido) return
    const payload = { ...form, idGrupo: Number(form.idGrupo) }

    if (editId) {
      setEstudiantes(estudiantes.map((s) => (s.id === editId ? { ...s, ...payload } : s)))
    } else {
      const nuevoId = Math.max(0, ...estudiantes.map((s) => s.id)) + 1
      setEstudiantes([...estudiantes, { id: nuevoId, ...payload }])
    }
    resetForm()
  }

  function editar(estudiante) {
    setEditId(estudiante.id)
    setForm({
      nombre: estudiante.nombre,
      apellido: estudiante.apellido,
      carne: estudiante.carne,
      idGrupo: estudiante.idGrupo ?? grupos[0]?.id ?? '',
    })
  }

  function eliminar(id) {
    setEstudiantes(estudiantes.filter((s) => s.id !== id))
    if (editId === id) resetForm()
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 02</p>
        <h1>Estudiantes</h1>
        <p className="section-sub">Alta, edición y baja de estudiantes.</p>
      </header>

      <div className="panel-grid">
        <form className="card form-card" onSubmit={guardar}>
          <h2>{editId ? 'Editar estudiante' : 'Nuevo estudiante'}</h2>
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ana"
              required
            />
          </label>
          <label>
            Apellido
            <input
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="García"
              required
            />
          </label>
          <label>
            Carné
            <input
              value={form.carne}
              onChange={(e) => setForm({ ...form, carne: e.target.value })}
              placeholder="EST-007"
            />
          </label>
          <label>
            Grado y sección
            <select
              value={form.idGrupo}
              onChange={(e) => setForm({ ...form, idGrupo: e.target.value })}
              required
            >
              {grupos.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>{nombreGrupo(grupo)}</option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editId ? 'Guardar cambios' : 'Agregar estudiante'}
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
                <th>Nombre</th>
                <th>Carné</th>
                <th>Grado / sección</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((s) => (
                <tr key={s.id}>
                  <td>{s.nombre} {s.apellido}</td>
                  <td className="muted">{s.carne || '—'}</td>
                  <td className="muted">{nombreGrupo(grupos.find((grupo) => grupo.id === s.idGrupo))}</td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => editar(s)}>Editar</button>
                    <button className="link-btn link-danger" onClick={() => eliminar(s.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {estudiantes.length === 0 && (
                <tr><td colSpan={4} className="empty-row">No hay estudiantes registrados todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
