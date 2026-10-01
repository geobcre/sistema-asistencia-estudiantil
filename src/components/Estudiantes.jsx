import { useEffect, useState } from 'react'
import { api } from '../api.js'

const FORM_INICIAL = {
  nombre: '',
  apellido: '',
  carne: '',
}

export default function Estudiantes({ store }) {
  const { estudiantes, setEstudiantes } = store

  const [form, setForm] = useState(FORM_INICIAL)
  const [editId, setEditId] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarEstudiantes()
  }, [])

  async function cargarEstudiantes() {
    try {
      setCargando(true)
      setError('')

      const datos = await api.getEstudiantes()

      setEstudiantes(datos)
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
      carne: form.carne.trim(),
    }

    if (!datos.nombre || !datos.apellido) {
      setError('El nombre y el apellido son obligatorios.')
      return
    }

    try {
      setGuardando(true)

      if (editId !== null) {
        const estudianteActualizado =
          await api.editarEstudiante(editId, datos)

        setEstudiantes((actuales) =>
          actuales.map((estudiante) =>
            estudiante.id === editId
              ? estudianteActualizado
              : estudiante
          )
        )

        setMensaje('Estudiante actualizado correctamente.')
      } else {
        const nuevoEstudiante =
          await api.crearEstudiante(datos)

        setEstudiantes((actuales) => [
          ...actuales,
          nuevoEstudiante,
        ])

        setMensaje('Estudiante registrado correctamente.')
      }

      resetForm()
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setGuardando(false)
    }
  }

  function editar(estudiante) {
    setError('')
    setMensaje('')

    setEditId(estudiante.id)

    setForm({
      nombre: estudiante.nombre || '',
      apellido: estudiante.apellido || '',
      carne: estudiante.carne || '',
    })
  }

  async function eliminar(estudiante) {
    const confirmado = window.confirm(
      `¿Está seguro de eliminar al estudiante ${estudiante.nombre} ${estudiante.apellido}?`
    )

    if (!confirmado) {
      return
    }

    try {
      setError('')
      setMensaje('')

      await api.eliminarEstudiante(estudiante.id)

      setEstudiantes((actuales) =>
        actuales.filter(
          (actual) => actual.id !== estudiante.id
        )
      )

      if (editId === estudiante.id) {
        resetForm()
      }

      setMensaje('Estudiante eliminado correctamente.')
    } catch (error) {
      console.error(error)
      setError(error.message)
    }
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 02</p>

        <h1>Estudiantes</h1>

        <p className="section-sub">
          Registro y administración de estudiantes.
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
              ? 'Editar estudiante'
              : 'Nuevo estudiante'}
          </h2>

          <label>
            Nombre

            <input
              name="nombre"
              value={form.nombre}
              onChange={cambiarCampo}
              placeholder="Ana"
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
              placeholder="García"
              disabled={guardando}
              required
            />
          </label>

          <label>
            Carné

            <input
              name="carne"
              value={form.carne}
              onChange={cambiarCampo}
              placeholder="EST-007"
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
                  : 'Agregar estudiante'}
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
              Cargando estudiantes...
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Carné</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {estudiantes.map((estudiante) => (
                  <tr key={estudiante.id}>
                    <td>
                      {estudiante.nombre}{' '}
                      {estudiante.apellido}
                    </td>

                    <td className="muted">
                      {estudiante.carne || '—'}
                    </td>

                    <td className="row-actions">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() =>
                          editar(estudiante)
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="link-btn link-danger"
                        onClick={() =>
                          eliminar(estudiante)
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}

                {estudiantes.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="empty-row"
                    >
                      No hay estudiantes registrados todavía.
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