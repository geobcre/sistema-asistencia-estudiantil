import { useState } from 'react'

export default function Docentes({ store }) {
  const { docentes, setDocentes } = store
  const [form, setForm] = useState({ nombre: '', apellido: '', correo: '' })
  const [editId, setEditId] = useState(null)

  function resetForm() {
    setForm({ nombre: '', apellido: '', correo: '' })
    setEditId(null)
  }

  function guardar(e) {
    e.preventDefault()
    if (!form.nombre || !form.apellido) return

    if (editId) {
      setDocentes(docentes.map((d) => (d.id === editId ? { ...d, ...form } : d)))
    } else {
      const nuevoId = Math.max(0, ...docentes.map((d) => d.id)) + 1
      setDocentes([...docentes, { id: nuevoId, ...form }])
    }
    resetForm()
  }

  function editar(docente) {
    setEditId(docente.id)
    setForm({ nombre: docente.nombre, apellido: docente.apellido, correo: docente.correo })
  }

  function eliminar(id) {
    setDocentes(docentes.filter((d) => d.id !== id))
    if (editId === id) resetForm()
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 01</p>
        <h1>Docentes</h1>
        <p className="section-sub">Alta, edición y baja del personal docente.</p>
      </header>

      <div className="panel-grid">
        <form className="card form-card" onSubmit={guardar}>
          <h2>{editId ? 'Editar docente' : 'Nuevo docente'}</h2>
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Marta"
              required
            />
          </label>
          <label>
            Apellido
            <input
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="Solís"
              required
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              placeholder="nombre@escuela.edu"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editId ? 'Guardar cambios' : 'Agregar docente'}
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
                <th>Correo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docentes.map((d) => (
                <tr key={d.id}>
                  <td>{d.nombre} {d.apellido}</td>
                  <td className="muted">{d.correo || '—'}</td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => editar(d)}>Editar</button>
                    <button className="link-btn link-danger" onClick={() => eliminar(d.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {docentes.length === 0 && (
                <tr><td colSpan={3} className="empty-row">No hay docentes registrados todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
