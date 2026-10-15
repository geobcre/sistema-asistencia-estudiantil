// Validaciones compartidas por las rutas de Estadísticas y Reportes.

export function fechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false
  const valor = new Date(`${fecha}T00:00:00Z`)
  return !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha
}

// Lee parámetros de consulta que deben ser enteros positivos.
// Los vacíos o ausentes se ignoran; un valor mal formado devuelve { error }.
export function leerIds(query, campos) {
  const valores = {}
  for (const campo of campos) {
    const crudo = query[campo]
    if (crudo === undefined || crudo === '') continue
    if (!/^\d+$/.test(String(crudo)) || Number(crudo) < 1) {
      return { error: `El parámetro ${campo} debe ser un número entero positivo.` }
    }
    valores[campo] = Number(crudo)
  }
  return { valores }
}
