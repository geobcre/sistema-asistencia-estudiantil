import { useEffect, useState } from 'react'
import { api } from '../api.js'

const FORM_INICIAL = {
  nombre: '',
  apellido: '',
  correo: '',
}

export default function Docentes({ store }) {
  const { docentes, setDocentes } = store

  const [form, setForm] = useState(FORM_INICIAL)
  const [editId, setEditId] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarDocentes()
  }, [])

  async function cargarDocentes() {
    try {
      setCargando(true)
      setError('')

      const datos = await api.getDocentes()

      setDocentes(datos)
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setCargando(false)
    }
  }

  function resetForm() {
    setForm(FORM_INICIAL)
    setEditId(null)
  }

  function cambiarCampo(e) {
    const { name, value } = e.target

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  async function guardar(e) {
    e.preventDefault()

    setError('')
    setMensaje('')

    const datos = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      correo: form.correo.trim(),
    }

    if (!datos.nombre || !datos.apellido) {
      setError('El nombre y el apellido son obligatorios.')
      return
    }

    try {
      setGuardando(true)

      if (editId !== null) {
        const docenteActualizado = await api.editarDocente(
          editId,
          datos
        )

        setDocentes((actuales) =>
          actuales.map((docente) =>
            docente.id === editId
              ? docenteActualizado
              : docente
          )
        )

        setMensaje('Docente actualizado correctamente.')
      } else {
        const nuevoDocente = await api.crearDocente(datos)

        setDocentes((actuales) => [
          ...actuales,
          nuevoDocente,
        ])

        setMensaje('Docente registrado correctamente.')
      }

      resetForm()
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setGuardando(false)
    }
  }

  function editar(docente) {
    setError('')
    setMensaje('')

    setEditId(docente.id)

    setForm({
      nombre: docente.nombre || '',
      apellido: docente.apellido || '',
      correo: docente.correo || '',
    })
  }

  async function eliminar(docente) {
    const confirmado = window.confirm(
      `¿Está seguro de eliminar al docente ${docente.nombre} ${docente.apellido}?`
    )

    if (!confirmado) {
      return
    }

    try {
      setError('')
      setMensaje('')

      await api.eliminarDocente(docente.id)

      setDocentes((actuales) =>
        actuales.filter((d) => d.id !== docente.id)
      )

      if (editId === docente.id) {
        resetForm()
      }

      setMensaje('Docente eliminado correctamente.')
    } catch (error) {
      console.error(error)
      setError(error.message)
    }
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 01</p>

        <h1>Docentes</h1>

        <p className="section-sub">
          Registro y administración del personal docente.
        </p>
      </header>

      {error && (
        <div className="module-message module-message-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="module-message module-message-success">
          {mensaje}
        </div>
      )}

      <div className="panel-grid">
        <form
          className="card form-card"
          onSubmit={guardar}
        >
          <h2>
            {editId !== null
              ? 'Editar docente'
              : 'Nuevo docente'}
          </h2>

          <label>
            Nombre

            <input
              name="nombre"
              value={form.nombre}
              onChange={cambiarCampo}
              placeholder="Marta"
              disabled={guardando}
              required
            />
          </label>

          <label>
            Apellido

            <input
              name="apellido"
              value={form.apellido}
              onChange={cambiarCampo}
              placeholder="Solís"
              disabled={guardando}
              required
            />
          </label>

          <label>
            Correo

            <input
              name="correo"
              type="email"
              value={form.correo}
              onChange={cambiarCampo}
              placeholder="nombre@escuela.edu"
              disabled={guardando}
            />
          </label>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : editId !== null
                  ? 'Guardar cambios'
                  : 'Agregar docente'}
            </button>

            {editId !== null && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetForm}
                disabled={guardando}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="card table-card">
          {cargando ? (
            <p className="empty-row">
              Cargando docentes...
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {docentes.map((docente) => (
                  <tr key={docente.id}>
                    <td>
                      {docente.nombre} {docente.apellido}
                    </td>

                    <td className="muted">
                      {docente.correo || '—'}
                    </td>

                    <td className="row-actions">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => editar(docente)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="link-btn link-danger"
                        onClick={() => eliminar(docente)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}

                {docentes.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="empty-row"
                    >
                      No hay docentes registrados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}