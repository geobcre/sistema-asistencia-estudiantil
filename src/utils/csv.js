// Utilidades para exportar tablas a CSV compatible con Excel.

// Las celdas que empiezan con estos caracteres podrían interpretarse como fórmulas.
const INICIO_PELIGROSO = /^[=+\-@\t\r]/

export function escaparCelda(valor) {
  if (valor === null || valor === undefined) return ''
  let texto = String(valor)
  if (INICIO_PELIGROSO.test(texto)) texto = `'${texto}`
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

// columnas: [{ encabezado: 'Fecha', valor: (fila) => fila.fecha }, ...]
// El BOM inicial permite que Excel respete tildes y eñes (UTF-8).
export function generarCsv(columnas, filas) {
  const lineas = [
    columnas.map((columna) => escaparCelda(columna.encabezado)).join(','),
    ...filas.map((fila) => columnas.map((columna) => escaparCelda(columna.valor(fila))).join(','))
  ]
  return `\uFEFF${lineas.join('\r\n')}\r\n`
}

export function descargarCsv(nombreArchivo, contenido) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
