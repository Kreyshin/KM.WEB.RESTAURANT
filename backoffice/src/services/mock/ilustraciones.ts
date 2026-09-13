/**
 * Ilustraciones de platos para los datos de ejemplo.
 *
 * Son SVG propios generados en código (sin fotos de terceros ni descargas):
 * un plato visto desde arriba con los colores de sus ingredientes. Con
 * backend, cada producto tendrá su foto real subida desde la carta.
 */

interface Receta {
  /** Colores de los ingredientes principales. */
  colores: string[]
  /** Forma del recipiente. */
  recipiente?: 'plato' | 'bowl' | 'vaso' | 'copa'
  /** Color del líquido en bebidas. */
  liquido?: string
}

const recetas: Record<string, Receta> = {
  p1: { colores: ['#f2c14e', '#f7e28f', '#6a994e', '#e76f51'] }, // Causa limeña
  p2: { colores: ['#7f3b2d', '#a44a3f', '#f4d35e', '#6a994e'] }, // Anticuchos
  p3: { colores: ['#f1f1e6', '#c1121f', '#f4a261', '#90be6d'], recipiente: 'bowl' }, // Cebiche clásico
  p4: { colores: ['#fbe8d3', '#f4a261', '#e9c46a', '#8ab17d'] }, // Tiradito
  p5: { colores: ['#f1f1e6', '#e76f51', '#c1121f', '#90be6d'], recipiente: 'bowl' }, // Cebiche mixto
  p6: { colores: ['#6b3e26', '#f4d35e', '#c1121f', '#f1f1e6'] }, // Lomo saltado
  p7: { colores: ['#f2c14e', '#f7e28f', '#f1f1e6', '#3a5a40'] }, // Ají de gallina
  p8: { colores: ['#5c3d2e', '#386641', '#f1f1e6', '#e9c46a'] }, // Seco de res
  p9: { colores: ['#e76f51', '#f4a261', '#f2c14e', '#90be6d'] }, // Arroz con mariscos
  p10: { colores: ['#e9c46a', '#f4d35e', '#c1121f', '#90be6d'] }, // Chicharrón de calamar
  p11: { colores: ['#f7e1b5', '#ecd5a0', '#b56576'], recipiente: 'copa' }, // Suspiro limeño
  p12: { colores: ['#c67c3b', '#e0a458', '#6b3e26'] }, // Picarones
  p13: { colores: [], recipiente: 'vaso', liquido: '#5a189a' }, // Chicha morada
  p14: { colores: [], recipiente: 'copa', liquido: '#f6f1c7' }, // Pisco sour
  p15: { colores: [], recipiente: 'vaso', liquido: '#f5c400' }, // Inca Kola
}

/** Pseudoaleatorio estable por producto: la ilustración no cambia al recargar. */
function aleatorio(semilla: string) {
  let h = 2166136261
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function comida(id: string, colores: string[], radio: number) {
  const r = aleatorio(id)
  let figuras = ''
  for (let i = 0; i < 18; i++) {
    const angulo = r() * Math.PI * 2
    const distancia = Math.sqrt(r()) * radio
    const x = 100 + Math.cos(angulo) * distancia
    const y = 100 + Math.sin(angulo) * distancia
    const t = 9 + r() * 16
    const color = colores[i % colores.length]
    figuras += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${t.toFixed(1)}" ry="${(t * (0.6 + r() * 0.4)).toFixed(1)}" transform="rotate(${Math.round(r() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${color}"/>`
  }
  return figuras
}

function svg(id: string, receta: Receta) {
  const fondo = '<rect width="200" height="200" fill="#1b2a24"/>'
  let cuerpo: string
  switch (receta.recipiente) {
    case 'vaso':
      cuerpo = `<circle cx="100" cy="100" r="62" fill="#e9ecef" opacity=".35"/><circle cx="100" cy="100" r="54" fill="${receta.liquido}"/><circle cx="84" cy="84" r="12" fill="#fff" opacity=".35"/>`
      break
    case 'copa':
      cuerpo = `<circle cx="100" cy="100" r="66" fill="#f8f9fa" opacity=".9"/><circle cx="100" cy="100" r="56" fill="${receta.liquido ?? receta.colores[0]}"/>${receta.liquido ? '<circle cx="100" cy="100" r="44" fill="#fffdf2" opacity=".7"/>' : comida(id, receta.colores, 30)}`
      break
    case 'bowl':
      cuerpo = `<circle cx="100" cy="100" r="80" fill="#e8e1d5"/><circle cx="100" cy="100" r="66" fill="#f7f3ea"/>${comida(id, receta.colores, 44)}`
      break
    default:
      cuerpo = `<circle cx="100" cy="100" r="86" fill="#f4f1ea"/><circle cx="100" cy="100" r="70" fill="none" stroke="#c9a227" stroke-width="2" opacity=".5"/>${comida(id, receta.colores, 46)}`
  }
  const contenido = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${fondo}${cuerpo}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(contenido)}`
}

export function ilustracionProducto(id: string): string | undefined {
  const receta = recetas[id]
  return receta ? svg(id, receta) : undefined
}

export function ilustracionCombo(id: string, productos: string[]): string {
  const colores = productos.flatMap((p) => recetas[p]?.colores ?? []).slice(0, 5)
  return svg(id, { colores: colores.length ? colores : ['#e9c46a', '#90be6d'] })
}
