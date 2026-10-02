import { Fragment, useEffect, useState } from 'react'
import { api } from '../api.js'

const FORM_INICIAL = {
  nombre: '',
  codigo: '',
  horario: '',
  idDocente: '',
}

export default function Cursos({ store }) {
  const {
    cursos,
    setCursos,
    docentes,
    setDocentes,
    estudiantes,
    setEstudiantes,
  } = store

  const [form, setForm] = useState(FORM_INICIAL)
  const [editId, setEditId] = useState(null)

  const [cursoAbierto, setCursoAbierto] = useState(null)
  const [inscritosPorCurso, setInscritosPorCurso] = useState({})
  const [estudianteAInscribir, setEstudianteAInscribir] = useState('')

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [procesandoInscripcion, setProcesandoInscripcion] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setCargando(true)
      setError('')

      const [datosCursos, datosDocentes, datosEstudiantes] =
        await Promise.all([
          api.getCursos(),
          api.getDocentes(),
          api.getEstudiantes(),
        ])

      setCursos(datosCursos)
      setDocentes(datosDocentes)
      setEstudiantes(datosEstudiantes)
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
      codigo: form.codigo.trim(),
      horario: form.horario.trim(),
      idDocente: form.idDocente
        ? Number(form.idDocente)
        : null,
    }

    if (!datos.nombre) {
      setError('El nombre de la asignatura es obligatorio.')
      return
    }

    try {
      setGuardando(true)

      if (editId !== null) {
        const cursoActualizado = await api.editarCurso(
          editId,
          datos
        )

        setCursos((actuales) =>
          actuales.map((curso) =>
            curso.id === editId
              ? cursoActualizado
              : curso
          )
        )

        setMensaje('Asignatura actualizada correctamente.')
      } else {
        const nuevoCurso = await api.crearCurso(datos)

        setCursos((actuales) => [
          ...actuales,
          nuevoCurso,
        ])

        setMensaje('Asignatura registrada correctamente.')
      }

      resetForm()
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setGuardando(false)
    }
  }

  function editar(curso) {
    setError('')
    setMensaje('')

    setEditId(curso.id)

    setForm({
      nombre: curso.nombre || '',
      codigo: curso.codigo || '',
      horario: curso.horario || '',
      idDocente:
        curso.id_docente ??
        curso.idDocente ??
        '',
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function eliminar(curso) {
    const confirmado = window.confirm(
      `¿Está seguro de eliminar la asignatura "${curso.nombre}"?`
    )

    if (!confirmado) {
      return
    }

    try {
      setError('')
      setMensaje('')

      await api.eliminarCurso(curso.id)

      setCursos((actuales) =>
        actuales.filter(
          (actual) => actual.id !== curso.id
        )
      )

      setInscritosPorCurso((actuales) => {
        const copia = { ...actuales }
        delete copia[curso.id]
        return copia
      })

      if (editId === curso.id) {
        resetForm()
      }

      if (cursoAbierto === curso.id) {
        setCursoAbierto(null)
      }

      setMensaje('Asignatura eliminada correctamente.')
    } catch (error) {
      console.error(error)
      setError(error.message)
    }
  }

  function obtenerIdDocente(curso) {
    return curso.id_docente ?? curso.idDocente ?? null
  }

  function nombreDocente(curso) {
    const idDocente = obtenerIdDocente(curso)

    if (!idDocente) {
      return 'Sin asignar'
    }

    const docente = docentes.find(
      (actual) => actual.id === Number(idDocente)
    )

    return docente
      ? `${docente.nombre} ${docente.apellido}`
      : 'Sin asignar'
  }

  async function abrirCurso(idCurso) {
    if (cursoAbierto === idCurso) {
      setCursoAbierto(null)
      setEstudianteAInscribir('')
      return
    }

    try {
      setError('')
      setMensaje('')

      const inscritos =
        await api.getEstudiantesDeCurso(idCurso)

      setInscritosPorCurso((actuales) => ({
        ...actuales,
        [idCurso]: inscritos,
      }))

      setCursoAbierto(idCurso)
      setEstudianteAInscribir('')
    } catch (error) {
      console.error(error)
      setError(error.message)
    }
  }

  function estudiantesDeCurso(idCurso) {
    return inscritosPorCurso[idCurso] || []
  }

  function estudianteYaInscrito(idCurso, idEstudiante) {
    return estudiantesDeCurso(idCurso).some(
      (estudiante) =>
        estudiante.id === Number(idEstudiante)
    )
  }

  async function inscribir(idCurso) {
    if (!estudianteAInscribir) {
      setError('Seleccione un estudiante para inscribir.')
      return
    }

    const idEstudiante = Number(estudianteAInscribir)

    if (estudianteYaInscrito(idCurso, idEstudiante)) {
      setError('El estudiante ya está inscrito en esta asignatura.')
      return
    }

    try {
      setProcesandoInscripcion(true)
      setError('')
      setMensaje('')

      await api.inscribirEstudiante(
        idCurso,
        idEstudiante
      )

      const inscritosActualizados =
        await api.getEstudiantesDeCurso(idCurso)

      setInscritosPorCurso((actuales) => ({
        ...actuales,
        [idCurso]: inscritosActualizados,
      }))

      setEstudianteAInscribir('')

      setMensaje('Estudiante inscrito correctamente.')
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setProcesandoInscripcion(false)
    }
  }

  async function desinscribir(idCurso, estudiante) {
    const confirmado = window.confirm(
      `¿Desea retirar a ${estudiante.nombre} ${estudiante.apellido} de esta asignatura?`
    )

    if (!confirmado) {
      return
    }

    try {
      setProcesandoInscripcion(true)
      setError('')
      setMensaje('')

      await api.desinscribirEstudiante(
        idCurso,
        estudiante.id
      )

      setInscritosPorCurso((actuales) => ({
        ...actuales,
        [idCurso]: (actuales[idCurso] || []).filter(
          (actual) => actual.id !== estudiante.id
        ),
      }))

      setMensaje('Estudiante retirado de la asignatura.')
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setProcesandoInscripcion(false)
    }
  }

  return (
    <section>
      <header className="section-header">
        <p className="eyebrow">Módulo 03</p>

        <h1>Asignaturas</h1>

        <p className="section-sub">
          Administración de asignaturas, docentes e inscripciones.
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
              ? 'Editar asignatura'
              : 'Nueva asignatura'}
          </h2>

          <label>
            Nombre de la asignatura

            <input
              name="nombre"
              value={form.nombre}
              onChange={cambiarCampo}
              placeholder="Matemática I"
              disabled={guardando}
              required
            />
          </label>

          <label>
            Código

            <input
              name="codigo"
              value={form.codigo}
              onChange={cambiarCampo}
              placeholder="MAT-101"
              disabled={guardando}
            />
          </label>

          <label>
            Horario

            <input
              name="horario"
              value={form.horario}
              onChange={cambiarCampo}
              placeholder="Lun/Mié 8:00"
              disabled={guardando}
            />
          </label>

          <label>
            Docente asignado

            <select
              name="idDocente"
              value={form.idDocente}
              onChange={cambiarCampo}
              disabled={guardando}
            >
              <option value="">
                Sin asignar
              </option>

              {docentes.map((docente) => (
                <option
                  key={docente.id}
                  value={docente.id}
                >
                  {docente.nombre} {docente.apellido}
                </option>
              ))}
            </select>
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
                  : 'Agregar asignatura'}
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
              Cargando asignaturas...
            </p>
          ) : (
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
                {cursos.map((curso) => {
                  const inscritos =
                    estudiantesDeCurso(curso.id)

                  return (
                    <Fragment key={curso.id}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            className="link-btn as-title"
                            onClick={() =>
                              abrirCurso(curso.id)
                            }
                          >
                            {curso.nombre}

                            {curso.codigo && (
                              <span className="muted">
                                {' '}· {curso.codigo}
                              </span>
                            )}
                          </button>

                          {curso.horario && (
                            <div className="muted">
                              {curso.horario}
                            </div>
                          )}
                        </td>

                        <td className="muted">
                          {nombreDocente(curso)}
                        </td>

                        <td className="muted">
                          {cursoAbierto === curso.id
                            ? inscritos.length
                            : 'Ver'}
                        </td>

                        <td className="row-actions">
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => editar(curso)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="link-btn link-danger"
                            onClick={() => eliminar(curso)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>

                      {cursoAbierto === curso.id && (
                        <tr className="detail-row">
                          <td colSpan={4}>
                            <div className="inline-panel">
                              <p className="detail-label">
                                Estudiantes inscritos
                              </p>

                              <ul className="chip-list">
                                {inscritos.map((estudiante) => (
                                  <li
                                    key={estudiante.id}
                                    className="chip"
                                  >
                                    {estudiante.nombre}{' '}
                                    {estudiante.apellido}

                                    {estudiante.carne && (
                                      <span className="muted">
                                        {' '}· {estudiante.carne}
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      className="chip-remove"
                                      title="Retirar estudiante"
                                      disabled={procesandoInscripcion}
                                      onClick={() =>
                                        desinscribir(
                                          curso.id,
                                          estudiante
                                        )
                                      }
                                    >
                                      ×
                                    </button>
                                  </li>
                                ))}

                                {inscritos.length === 0 && (
                                  <li className="muted">
                                    Ningún estudiante inscrito aún.
                                  </li>
                                )}
                              </ul>

                              <div className="inline-form">
                                <select
                                  value={estudianteAInscribir}
                                  onChange={(e) =>
                                    setEstudianteAInscribir(
                                      e.target.value
                                    )
                                  }
                                  disabled={procesandoInscripcion}
                                >
                                  <option value="">
                                    Seleccionar estudiante…
                                  </option>

                                  {estudiantes
                                    .filter(
                                      (estudiante) =>
                                        !estudianteYaInscrito(
                                          curso.id,
                                          estudiante.id
                                        )
                                    )
                                    .map((estudiante) => (
                                      <option
                                        key={estudiante.id}
                                        value={estudiante.id}
                                      >
                                        {estudiante.nombre}{' '}
                                        {estudiante.apellido}
                                        {estudiante.carne
                                          ? ` · ${estudiante.carne}`
                                          : ''}
                                      </option>
                                    ))}
                                </select>

                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  disabled={
                                    procesandoInscripcion ||
                                    !estudianteAInscribir
                                  }
                                  onClick={() =>
                                    inscribir(curso.id)
                                  }
                                >
                                  {procesandoInscripcion
                                    ? 'Procesando...'
                                    : 'Inscribir'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}

                {cursos.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="empty-row"
                    >
                      No hay asignaturas registradas todavía.
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