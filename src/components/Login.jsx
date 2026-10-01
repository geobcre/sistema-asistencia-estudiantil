import { useState } from 'react'

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const iniciarSesion = async (e) => {
    e.preventDefault()
    setError('')

    if (!correo.trim() || !password) {
      setError('Ingrese su correo y contraseña.')
      return
    }

    try {
      setCargando(true)

      const respuesta = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: correo.trim(),
          password,
        }),
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        setError(datos.error || 'No fue posible iniciar sesión.')
        return
      }

      localStorage.setItem('token', datos.token)
      localStorage.setItem('usuario', JSON.stringify(datos.usuario))

      onLogin(datos.usuario)
    } catch (error) {
      console.error(error)
      setError('No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">A</div>

          <div>
            <h1>Control de Asistencia</h1>
            <p>Sistema de gestión estudiantil</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>Iniciar sesión</h2>
          <p>Ingrese sus credenciales para acceder al sistema.</p>
        </div>

        <form onSubmit={iniciarSesion} className="login-form">
          <div className="login-field">
            <label htmlFor="correo">Correo electrónico</label>

            <input
              id="correo"
              type="email"
              placeholder="usuario@escuela.edu"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="email"
              disabled={cargando}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>

            <div className="password-wrapper">
              <input
                id="password"
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={cargando}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                disabled={cargando}
              >
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={cargando}
          >
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="login-footer">
          <p>Sistema de Control de Asistencia Estudiantil</p>
        </div>
      </div>
    </div>
  )
}