import { useState } from 'react'
import { api } from '../api.js'

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function iniciarSesion(evento) {
    evento.preventDefault()
    setError('')
    if (!correo.trim() || !password) {
      setError('Ingrese su correo y contraseña.')
      return
    }
    try {
      setCargando(true)
      const datos = await api.login(correo.trim(), password)
      localStorage.setItem('token', datos.token)
      localStorage.setItem('usuario', JSON.stringify(datos.usuario))
      onLogin(datos.usuario)
    } catch (errorLogin) {
      setError(errorLogin.status ? errorLogin.message : 'No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">A</div>
          <div><h1>Control de Asistencia</h1><p>Sistema de gestión estudiantil</p></div>
        </div>
        <div className="login-heading">
          <h2>Iniciar sesión</h2>
          <p>Ingrese sus credenciales para acceder al sistema.</p>
        </div>
        <form onSubmit={iniciarSesion} className="login-form">
          <div className="login-field">
            <label htmlFor="correo">Correo electrónico</label>
            <input id="correo" type="email" value={correo}
              onChange={(e) => setCorreo(e.target.value)} autoComplete="email"
              disabled={cargando} placeholder="usuario@escuela.edu" />
          </div>
          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrapper">
              <input id="password" type={mostrarPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" disabled={cargando}
                placeholder="Ingrese su contraseña" />
              <button type="button" className="password-toggle"
                onClick={() => setMostrarPassword(!mostrarPassword)} disabled={cargando}>
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-button" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
        <div className="login-footer"><p>Sistema de Control de Asistencia Estudiantil</p></div>
      </div>
    </div>
  )
}
