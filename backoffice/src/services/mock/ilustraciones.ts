/**
 * Iconografía de platos para los datos de ejemplo.
 *
 * Ilustraciones planas propias dibujadas en SVG (sin fotos de terceros). Si
 * existe una foto real en `src/assets/platos/` cuyo nombre sea el del plato
 * en minúsculas y con guiones (p. ej. `aji-de-gallina.jpg`), se usa la foto.
 * Con backend, cada producto tendrá su foto subida desde la carta.
 */

const fotos = import.meta.glob('../../assets/platos/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export function slug(nombre: string) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Foto real del plato si se dejó en `src/assets/platos/`. */
export function fotoPlato(nombre: string): string | undefined {
  const buscado = slug(nombre)
  const clave = Object.keys(fotos).find((ruta) => {
    const archivo = ruta
      .split('/')
      .pop()!
      .replace(/\.[^.]+$/, '')
    return archivo === buscado
  })
  return clave ? fotos[clave] : undefined
}

// ── Piezas de dibujo ─────────────────────────────────────────────────────────

const plato = (borde = '#e9e2d4') =>
  `<ellipse cx="100" cy="128" rx="84" ry="20" fill="#000" opacity=".12"/><circle cx="100" cy="104" r="80" fill="${borde}"/><circle cx="100" cy="104" r="64" fill="#fbf8f2"/>`

const bowl = (color = '#3d6b8c') =>
  `<ellipse cx="100" cy="150" rx="70" ry="12" fill="#000" opacity=".12"/><path d="M26 92h148c0 40-33 64-74 64S26 132 26 92z" fill="${color}"/><ellipse cx="100" cy="92" rx="74" ry="22" fill="#f4efe6"/>`

const vaso = (liquido: string, espuma?: string) =>
  `<ellipse cx="100" cy="170" rx="46" ry="9" fill="#000" opacity=".12"/><path d="M58 40h84l-10 128H68z" fill="#eef3f5" opacity=".9"/><path d="M63 70h74l-7 94H70z" fill="${liquido}"/>${espuma ? `<path d="M61 56h78l-2 16H63z" fill="${espuma}"/>` : ''}<path d="M70 48l6 110" stroke="#fff" stroke-width="6" opacity=".45" stroke-linecap="round"/>`

const hojas = (x: number, y: number) =>
  `<g fill="#4f8a3c"><ellipse cx="${x}" cy="${y}" rx="7" ry="3.5" transform="rotate(-30 ${x} ${y})"/><ellipse cx="${x + 8}" cy="${y + 3}" rx="7" ry="3.5" transform="rotate(25 ${x + 8} ${y + 3})"/></g>`

const cebolla = (x: number, y: number, r = 10) =>
  `<path d="M${x - r} ${y}a${r} ${r * 0.6} 0 0 1 ${r * 2} 0" fill="none" stroke="#b5446e" stroke-width="3.5" stroke-linecap="round"/>`

const arroz = (x: number, y: number, r = 20) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fffdf7" stroke="#ece6d8" stroke-width="2"/><circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 5}" fill="#f1ebdd"/>`

const dibujos: Record<string, { fondo: string; cuerpo: string }> = {
  'causa-limena': {
    fondo: '#f6e7b8',
    cuerpo: `${plato()}<rect x="62" y="70" width="76" height="22" rx="8" fill="#f2c230"/><rect x="62" y="92" width="76" height="14" fill="#f7e6a8"/><rect x="62" y="106" width="76" height="24" rx="8" fill="#f2c230"/><circle cx="84" cy="66" r="7" fill="#7a3b2e"/><ellipse cx="112" cy="66" rx="12" ry="6" fill="#fff" stroke="#f2c230" stroke-width="3"/>${hojas(94, 60)}`,
  },
  'anticuchos-de-corazon': {
    fondo: '#f3d2c1',
    cuerpo: `${plato()}${[80, 104, 128]
      .map(
        (y, i) =>
          `<line x1="36" y1="${y + 8}" x2="164" y2="${y - 8}" stroke="#b08a5a" stroke-width="3"/>${[62, 88, 114, 140].map((x) => `<rect x="${x - 11}" y="${y - 10 + (i % 2)}" width="22" height="18" rx="5" fill="#8a3324" transform="rotate(-7 ${x} ${y})"/>`).join('')}`,
      )
      .join('')}<circle cx="146" cy="146" r="12" fill="#e8b04a"/>`,
  },
  'cebiche-clasico': {
    fondo: '#cfe6ea',
    cuerpo: `${bowl()}${[
      [70, 86],
      [96, 80],
      [122, 88],
      [84, 100],
      [112, 102],
    ]
      .map(
        ([x, y]) =>
          `<rect x="${x - 10}" y="${y - 7}" width="20" height="14" rx="4" fill="#fff" stroke="#e6e0d3"/>`,
      )
      .join(
        '',
      )}${cebolla(80, 90)}${cebolla(118, 94)}<ellipse cx="146" cy="88" rx="14" ry="9" fill="#e9973c"/><circle cx="60" cy="98" r="7" fill="#f2d24a"/>${hojas(100, 88)}`,
  },
  'tiradito-de-lenguado': {
    fondo: '#f7dcc6',
    cuerpo: `${plato()}${[0, 1, 2, 3, 4]
      .map(
        (i) =>
          `<ellipse cx="${62 + i * 19}" cy="104" rx="11" ry="30" fill="#fff4ec" stroke="#f0cdb5" stroke-width="2" transform="rotate(20 ${62 + i * 19} 104)"/>`,
      )
      .join(
        '',
      )}<path d="M52 128c30 10 70 10 98-6" stroke="#f2a93b" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>${hojas(128, 78)}`,
  },
  'cebiche-mixto': {
    fondo: '#d6e5f0',
    cuerpo: `${bowl('#2f5d7c')}<path d="M62 86q10-14 20 0" stroke="#f08a6c" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="100" cy="84" r="9" fill="none" stroke="#f3eee2" stroke-width="5"/><circle cx="100" cy="84" r="9" fill="none" stroke="#cdbfa5" stroke-width="1"/><rect x="112" y="80" width="18" height="12" rx="4" fill="#fff" stroke="#e6e0d3"/><path d="M130 96q10-14 20 0" stroke="#f08a6c" stroke-width="7" fill="none" stroke-linecap="round"/>${cebolla(82, 100)}<circle cx="62" cy="100" r="7" fill="#f2d24a"/>`,
  },
  'lomo-saltado': {
    fondo: '#f1d6b3',
    cuerpo: `${plato()}${arroz(136, 118, 22)}${[
      [66, 86],
      [92, 78],
      [80, 106],
      [106, 98],
    ]
      .map(
        ([x, y]) =>
          `<rect x="${x - 13}" y="${y - 8}" width="26" height="16" rx="5" fill="#6b3a22" transform="rotate(${x % 30} ${x} ${y})"/>`,
      )
      .join(
        '',
      )}<rect x="112" y="66" width="8" height="32" rx="3" fill="#f5c64f" transform="rotate(30 116 82)"/><rect x="128" y="70" width="8" height="30" rx="3" fill="#f5c64f" transform="rotate(-20 132 85)"/><rect x="58" y="118" width="8" height="30" rx="3" fill="#f5c64f" transform="rotate(60 62 133)"/><path d="M70 96l12-6M96 118l12 4" stroke="#d6342c" stroke-width="7" stroke-linecap="round"/>${cebolla(108, 80, 8)}`,
  },
  'aji-de-gallina': {
    fondo: '#f6e3a4',
    cuerpo: `${plato()}${arroz(136, 96, 22)}<path d="M50 104c0-24 22-36 44-34 22 2 34 20 30 40-4 22-26 30-46 28-18-2-28-14-28-34z" fill="#f0bd2c"/>${[
      [64, 96],
      [80, 84],
      [96, 100],
      [72, 114],
      [104, 118],
      [88, 124],
    ]
      .map(
        ([x, y]) =>
          `<path d="M${x - 7} ${y}l14-3" stroke="#f7d876" stroke-width="4" stroke-linecap="round"/>`,
      )
      .join(
        '',
      )}<ellipse cx="84" cy="104" rx="12" ry="8" fill="#fff" stroke="#e8e0cc"/><ellipse cx="84" cy="104" rx="5" ry="4" fill="#f5c42c"/><ellipse cx="100" cy="102" rx="5" ry="6.5" fill="#3a2b24"/><ellipse cx="68" cy="128" rx="11" ry="4" fill="#fbf8f2"/><ellipse cx="136" cy="130" rx="10" ry="8" fill="#e8c48a"/>`,
  },
  'seco-de-res-con-frejoles': {
    fondo: '#d9e4c4',
    cuerpo: `${plato()}<path d="M52 98c4-20 28-30 48-24s22 30 6 42-50 8-54-18z" fill="#6a4a2c"/><path d="M56 92c14-8 30-6 44 0" stroke="#4f8a3c" stroke-width="6" fill="none" stroke-linecap="round"/>${arroz(136, 90, 20)}<ellipse cx="124" cy="128" rx="26" ry="16" fill="#8c5a36"/>${[
      [114, 124],
      [126, 130],
      [136, 122],
    ]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="3" fill="#5e3a22"/>`)
      .join('')}<rect x="62" y="122" width="14" height="14" rx="4" fill="#f0a94a"/>`,
  },
  'arroz-con-mariscos': {
    fondo: '#f6cdb3',
    cuerpo: `${plato()}<circle cx="100" cy="104" r="50" fill="#f2893f"/>${[
      [80, 88],
      [118, 86],
      [100, 120],
    ]
      .map(
        ([x, y]) =>
          `<path d="M${x - 10} ${y}q10-16 20 0" stroke="#f9d7c4" stroke-width="7" fill="none" stroke-linecap="round"/>`,
      )
      .join(
        '',
      )}<ellipse cx="72" cy="116" rx="11" ry="7" fill="#2f2b3a"/><ellipse cx="128" cy="116" rx="11" ry="7" fill="#2f2b3a"/>${[
      [90, 104],
      [110, 104],
      [100, 90],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#5aa04a"/>`)
      .join('')}<circle cx="144" cy="80" r="9" fill="#f2d24a"/>`,
  },
  'chicharron-de-calamar': {
    fondo: '#f4e2b4',
    cuerpo: `${plato()}${[
      [70, 86],
      [100, 78],
      [128, 90],
      [82, 114],
      [114, 116],
      [98, 98],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#dca24a" stroke-width="9"/><circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#eec271" stroke-width="3"/>`,
      )
      .join('')}${cebolla(140, 124, 10)}<ellipse cx="60" cy="130" rx="11" ry="8" fill="#f2d24a"/>`,
  },
  'suspiro-limeno': {
    fondo: '#f1dcd3',
    cuerpo: `<ellipse cx="100" cy="176" rx="42" ry="8" fill="#000" opacity=".12"/><path d="M50 70h100l-12 70H62z" fill="#eaf1f3" opacity=".9"/><path d="M58 104h84l-6 34H64z" fill="#e3b26b"/><path d="M58 104c10-38 74-38 84 0z" fill="#fff6ee"/><path d="M78 76c8-10 34-12 44 0" stroke="#f3e2d8" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="100" cy="62" r="4" fill="#9a6b3a"/><rect x="94" y="140" width="12" height="26" fill="#eaf1f3"/>`,
  },
  picarones: {
    fondo: '#f3d4b0',
    cuerpo: `${plato()}${[
      [74, 90],
      [124, 88],
      [98, 124],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="24" fill="none" stroke="#c3772e" stroke-width="16"/><circle cx="${x}" cy="${y}" r="24" fill="none" stroke="#dd9a4a" stroke-width="5"/>`,
      )
      .join(
        '',
      )}<path d="M60 70c30 20 60 30 90 50" stroke="#5a2a14" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>`,
  },
  'chicha-morada': {
    fondo: '#dccbe8',
    cuerpo: `${vaso('#5b1f73')}<rect x="84" y="100" width="12" height="12" rx="2" fill="#e8dff0" opacity=".6"/><rect x="106" y="122" width="12" height="12" rx="2" fill="#e8dff0" opacity=".6"/><path d="M128 20l-14 70" stroke="#f2c230" stroke-width="5" stroke-linecap="round"/><circle cx="142" cy="46" r="10" fill="#c7d86b"/>`,
  },
  'pisco-sour': {
    fondo: '#e7ecd3',
    cuerpo: `<ellipse cx="100" cy="176" rx="40" ry="8" fill="#000" opacity=".12"/><path d="M56 50h88l-14 64H70z" fill="#eaf1f3" opacity=".9"/><path d="M62 74h76l-9 40H71z" fill="#e9e6b8"/><path d="M59 58h82l-3 16H62z" fill="#fffdf4"/><circle cx="90" cy="66" r="3" fill="#7a4a2c"/><circle cx="104" cy="64" r="3" fill="#7a4a2c"/><rect x="94" y="114" width="12" height="52" fill="#eaf1f3"/><ellipse cx="100" cy="168" rx="30" ry="6" fill="#eaf1f3"/>`,
  },
  'inca-kola-500-ml': {
    fondo: '#cfe0f2',
    cuerpo: `<ellipse cx="100" cy="176" rx="34" ry="7" fill="#000" opacity=".12"/><path d="M88 18h24v22c16 10 22 22 22 38v88c0 6-4 10-10 10H76c-6 0-10-4-10-10V78c0-16 6-28 22-38z" fill="#f5c400"/><rect x="88" y="12" width="24" height="10" rx="2" fill="#1d4f9a"/><rect x="66" y="94" width="68" height="44" fill="#1d4f9a"/><path d="M78 116h44" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M80 60v96" stroke="#fff" stroke-width="5" opacity=".35" stroke-linecap="round"/>`,
  },
}

function aDataUrl(fondo: string, cuerpo: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${fondo}"/>${cuerpo}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Foto real si existe; si no, la ilustración del plato. */
export function imagenPlato(nombre: string): string | undefined {
  const foto = fotoPlato(nombre)
  if (foto) return foto
  const d = dibujos[slug(nombre)]
  return d ? aDataUrl(d.fondo, d.cuerpo) : undefined
}

/** Hasta tres platos del combo, uno junto a otro, en formato apaisado. */
export function ilustracionCombo(nombres: string[]): string {
  const piezas = [...new Set(nombres.map(slug))]
    .map((n) => dibujos[n])
    .filter(Boolean)
    .slice(0, 3)
  if (piezas.length === 0) return aDataUrl('#efe6d2', plato())
  const ancho = 360
  const paso = ancho / piezas.length
  const escala = Math.min(1, (paso + 50) / 200)
  const cuerpo = piezas
    .map((d, k) => {
      const x = paso * k + paso / 2 - 100 * escala
      const y = 100 - 100 * escala
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${escala.toFixed(3)})">${d.cuerpo}</g>`
    })
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} 200"><rect width="${ancho}" height="200" fill="#efe6d2"/>${cuerpo}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
