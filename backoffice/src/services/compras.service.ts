import type {
  Consulta,
  EstadoOrdenCompra,
  LineaOrdenCompra,
  NuevaOrdenCompra,
  NuevoProveedor,
  OrdenCompra,
  Paginado,
  Proveedor,
} from '@/types'
import { validarEmail, validarRuc } from '@/utils/validaciones'
import { inventarioService } from './inventario.service'
import { aplicarConsulta } from './mock/consulta'
import { db, latencia, nuevoId, persistir } from './mock/db'
import { clonar } from './mock/red'
import { errorCampo, existeOtro } from './mock/reglas'
import { crearRepositorio } from './mock/repositorio'

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// ── Proveedores ──────────────────────────────────────────────────────────────

const repoProveedores = crearRepositorio('proveedores', {
  prefijo: 'pv',
  entidad: 'Proveedor',
  camposBusqueda: ['razonSocial', 'ruc', 'contacto'],
})

function validarProveedor(datos: Partial<NuevoProveedor>, id?: string) {
  if (datos.razonSocial !== undefined && !datos.razonSocial.trim()) {
    throw errorCampo('razonSocial', 'La razón social es obligatoria.')
  }
  if (datos.ruc !== undefined) {
    if (!validarRuc(datos.ruc))
      throw errorCampo('ruc', 'El RUC no es válido.', 'Revisa los 11 dígitos')
    if (existeOtro(db.proveedores, (p) => p.ruc, datos.ruc, id)) {
      throw errorCampo('ruc', 'Ya hay un proveedor con ese RUC.', 'RUC duplicado')
    }
  }
  if (datos.email && !validarEmail(datos.email)) {
    throw errorCampo('email', 'El correo no es válido.', 'Formato incorrecto')
  }
  if (
    datos.diasCredito !== undefined &&
    !(Number.isInteger(datos.diasCredito) && datos.diasCredito >= 0)
  ) {
    throw errorCampo('diasCredito', 'Los días de crédito son un número entero desde 0.')
  }
}

export const proveedoresService = {
  ...repoProveedores,

  async crear(datos: NuevoProveedor): Promise<Proveedor> {
    validarProveedor(datos)
    return repoProveedores.crear({ ...datos, razonSocial: datos.razonSocial.trim() })
  },

  async actualizar(id: string, datos: Partial<NuevoProveedor>): Promise<Proveedor> {
    validarProveedor(datos, id)
    return repoProveedores.actualizar(id, datos)
  },

  async eliminar(id: string): Promise<void> {
    if (db.ordenesCompra.some((o) => o.proveedorId === id)) {
      throw { mensaje: 'No se puede eliminar: el proveedor tiene órdenes de compra. Desactívalo.' }
    }
    for (const i of db.insumos) if (i.proveedorId === id) delete i.proveedorId
    return repoProveedores.eliminar(id)
  },
}

// ── Órdenes de compra ────────────────────────────────────────────────────────

export interface TotalesOrden {
  subtotal: number
  igv: number
  total: number
}

/** Los costos de compra se registran sin IGV; el IGV sale de la configuración. */
export function totalesOrden(lineas: LineaOrdenCompra[], igvPorcentaje: number): TotalesOrden {
  const subtotal = r2(lineas.reduce((t, l) => t + Number(l.cantidad) * Number(l.costoUnitario), 0))
  const igv = r2(subtotal * (igvPorcentaje / 100))
  return { subtotal, igv, total: r2(subtotal + igv) }
}

function ordenOError(id: string) {
  const orden = db.ordenesCompra.find((o) => o.id === id)
  if (!orden) throw { mensaje: 'Orden de compra no encontrada.' }
  return orden
}

function validarOrden(datos: NuevaOrdenCompra) {
  const proveedor = db.proveedores.find((p) => p.id === datos.proveedorId)
  if (!proveedor) throw errorCampo('proveedorId', 'Elige un proveedor.')
  if (!proveedor.activo) throw errorCampo('proveedorId', 'El proveedor está inactivo.')
  const almacen = db.almacenes.find((a) => a.id === datos.almacenId)
  if (!almacen?.activo) throw errorCampo('almacenId', 'Elige un almacén activo de destino.')
  if (datos.fechaEntrega && datos.fechaEntrega < datos.fechaEmision) {
    throw errorCampo('fechaEntrega', 'La entrega no puede ser anterior a la emisión.')
  }
  const lineas = datos.lineas.filter((l) => l.insumoId)
  if (lineas.length === 0) throw errorCampo('lineas', 'Añade al menos un insumo.')
  if (lineas.some((l) => !(Number(l.cantidad) > 0))) {
    throw errorCampo('lineas', 'Cada insumo necesita una cantidad mayor que cero.')
  }
  if (lineas.some((l) => !(Number(l.costoUnitario) >= 0))) {
    throw errorCampo('lineas', 'Revisa los costos: no pueden ser negativos.')
  }
  if (new Set(lineas.map((l) => l.insumoId)).size !== lineas.length) {
    throw errorCampo('lineas', 'Un insumo aparece dos veces: une sus cantidades en una línea.')
  }
  return lineas.map((l) => ({
    insumoId: l.insumoId,
    cantidad: Number(l.cantidad),
    costoUnitario: Number(l.costoUnitario),
    recibido: 0,
  }))
}

function siguienteNumero() {
  const max = Math.max(0, ...db.ordenesCompra.map((o) => Number(o.numero.replace(/\D/g, '')) || 0))
  return `OC-${String(max + 1).padStart(6, '0')}`
}

export const ordenesCompraService = {
  /** Filtros: `estado`, `proveedorId`, `almacenId`. Busca por número y notas. */
  async consultar(consulta: Consulta = {}): Promise<Paginado<OrdenCompra>> {
    return latencia(
      aplicarConsulta(
        db.ordenesCompra,
        { orden: { campo: 'numero', direccion: 'desc' }, ...consulta },
        ['numero', 'notas'],
      ),
    )
  },

  async obtener(id: string): Promise<OrdenCompra> {
    return latencia(ordenOError(id))
  },

  async crear(datos: NuevaOrdenCompra): Promise<OrdenCompra> {
    const lineas = validarOrden(datos)
    const orden: OrdenCompra = {
      ...clonar(datos),
      lineas,
      id: nuevoId('oc'),
      numero: siguienteNumero(),
      estado: 'borrador',
    }
    db.ordenesCompra.push(orden)
    persistir()
    return latencia(orden)
  },

  async actualizar(id: string, datos: NuevaOrdenCompra): Promise<OrdenCompra> {
    const orden = ordenOError(id)
    if (orden.estado !== 'borrador') {
      throw { mensaje: `La orden ${orden.numero} ya fue emitida: no se puede editar.` }
    }
    const lineas = validarOrden(datos)
    Object.assign(orden, clonar(datos), { lineas })
    persistir()
    return latencia(orden)
  },

  async emitir(id: string): Promise<OrdenCompra> {
    const orden = ordenOError(id)
    if (orden.estado !== 'borrador') throw { mensaje: 'Solo se emite una orden en borrador.' }
    validarOrden(orden)
    orden.estado = 'emitida'
    persistir()
    return latencia(orden)
  },

  async anular(id: string): Promise<OrdenCompra> {
    const orden = ordenOError(id)
    const permitidos: EstadoOrdenCompra[] = ['borrador', 'emitida']
    if (!permitidos.includes(orden.estado)) {
      throw {
        mensaje:
          orden.estado === 'parcial'
            ? 'La orden ya tiene mercadería recibida: no se puede anular.'
            : 'La orden ya no se puede anular.',
      }
    }
    orden.estado = 'anulada'
    persistir()
    return latencia(orden)
  },

  async eliminar(id: string): Promise<void> {
    const orden = ordenOError(id)
    if (orden.estado !== 'borrador') {
      throw { mensaje: 'Solo se elimina un borrador. Una orden emitida se anula.' }
    }
    db.ordenesCompra = db.ordenesCompra.filter((o) => o.id !== id)
    persistir()
    await latencia(null)
  },

  /**
   * Registra la mercadería que llega: genera entradas en el almacén de la orden
   * con el costo real de la factura, actualiza el costo promedio y el estado.
   */
  async recibir(
    id: string,
    recepcion: { insumoId: string; cantidad: number; costoUnitario: number }[],
    usuarioId: string,
  ): Promise<OrdenCompra> {
    const orden = ordenOError(id)
    if (orden.estado !== 'emitida' && orden.estado !== 'parcial') {
      throw { mensaje: 'Solo se recibe mercadería de una orden emitida o parcial.' }
    }
    const lineas = recepcion.filter((r) => Number(r.cantidad) > 0)
    if (lineas.length === 0) throw errorCampo('recepcion', 'Indica al menos una cantidad recibida.')

    for (const r of lineas) {
      const linea = orden.lineas.find((l) => l.insumoId === r.insumoId)
      if (!linea) throw { mensaje: 'La recepción incluye un insumo que no está en la orden.' }
      const pendiente = Math.round((linea.cantidad - linea.recibido) * 1000) / 1000
      if (Number(r.cantidad) > pendiente) {
        const nombre = db.insumos.find((i) => i.id === r.insumoId)?.nombre ?? 'un insumo'
        throw errorCampo('recepcion', `Se recibe más de lo pendiente en ${nombre} (${pendiente}).`)
      }
    }

    inventarioService._aplicarEntradas(
      lineas.map((r) => ({
        insumoId: r.insumoId,
        almacenId: orden.almacenId,
        tipo: 'entrada' as const,
        cantidad: Number(r.cantidad),
        costoUnitario: Number(r.costoUnitario),
        motivo: 'Recepción de compra',
        referencia: orden.numero,
        usuarioId,
      })),
    )

    for (const r of lineas) {
      const linea = orden.lineas.find((l) => l.insumoId === r.insumoId)!
      linea.recibido = Math.round((linea.recibido + Number(r.cantidad)) * 1000) / 1000
    }
    orden.estado = orden.lineas.every((l) => l.recibido >= l.cantidad) ? 'recibida' : 'parcial'
    persistir()
    return latencia(orden)
  },

  /**
   * Sugerencia de compra: insumos activos bajo su mínimo, agrupados por
   * proveedor, con la cantidad para volver al doble del mínimo.
   */
  async sugerencias(): Promise<{ proveedorId?: string; lineas: LineaOrdenCompra[] }[]> {
    const grupos = new Map<string, LineaOrdenCompra[]>()
    for (const i of db.insumos) {
      if (!i.activo || i.preparacion || i.stock >= i.stockMinimo) continue
      const clave = i.proveedorId ?? ''
      if (!grupos.has(clave)) grupos.set(clave, [])
      grupos.get(clave)!.push({
        insumoId: i.id,
        cantidad: Math.ceil(i.stockMinimo * 2 - i.stock),
        costoUnitario: i.costoUnitario,
        recibido: 0,
      })
    }
    return latencia(
      [...grupos.entries()].map(([proveedorId, lineas]) => ({
        proveedorId: proveedorId || undefined,
        lineas,
      })),
    )
  },
}
