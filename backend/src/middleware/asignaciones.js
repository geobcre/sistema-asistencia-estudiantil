import { db } from '../db.js'

export const consultaAsignacion = `
  SELECT
    aa.id_asignacion,
    aa.id_asignatura,
    aa.id_docente,
    aa.id_grupo,
    aa.horario,
    aa.fecha_inicio,
    aa.fecha_fin,
    aa.estado,
    a.nombre AS asignatura_nombre,
    a.codigo AS asignatura_codigo,
    a.estado AS asignatura_estado,
    d.nombre AS docente_nombre,
    d.apellido AS docente_apellido,
    d.correo AS docente_correo,
    d.estado AS docente_estado,
    g.grado,
    g.seccion,
    c.id_ciclo,
    c.anio AS ciclo_anio,
    c.estado AS ciclo_estado
  FROM asignaciones_academicas aa
  JOIN asignaturas a ON a.id_asignatura = aa.id_asignatura
  JOIN docentes d ON d.id_docente = aa.id_docente
  JOIN grupos g ON g.id_grupo = aa.id_grupo
  JOIN ciclos_escolares c ON c.id_ciclo = g.id_ciclo
`

export function obtenerAsignacion(id) {
  return db.prepare(`${consultaAsignacion} WHERE aa.id_asignacion = ?`).get(id)
}

export function usuarioPuedeAccederAsignacion(usuario, asignacion) {
  if (usuario?.rol === 'administrador') return true
  return usuario?.rol === 'docente'
    && Number(usuario.id_docente) === Number(asignacion.id_docente)
}

export function verificarAccesoAsignacion(req, res, next) {
  const asignacion = obtenerAsignacion(req.params.id)
  if (!asignacion) return res.status(404).json({ error: 'Asignación académica no encontrada.' })
  if (!usuarioPuedeAccederAsignacion(req.usuario, asignacion)) {
    return res.status(403).json({ error: 'No tiene acceso a esta asignación académica.' })
  }
  req.asignacion = asignacion
  return next()
}
