import { computed, onMounted, shallowRef } from 'vue'
import { cartaService } from '@/services/carta.service'
import { articulosService, proveedoresService } from '@/services/erp.service'
import { almacenesService, inventarioService } from '@/services/inventario.service'
import { localesService } from '@/services/locales.service'
import type { Almacen, Articulo, Insumo, Local, Producto, Proveedor } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaUnidad } from '@/utils/formato'

type Catalogo = 'almacenes' | 'insumos' | 'proveedores' | 'productos' | 'locales' | 'articulos'

/**
 * Listas de referencia para selects y para mostrar nombres en tablas.
 * Solo se cargan las que se piden.
 */
export function useCatalogos(pedidos: Catalogo[]) {
  const almacenes = shallowRef<Almacen[]>([])
  const insumos = shallowRef<Insumo[]>([])
  const proveedores = shallowRef<Proveedor[]>([])
  const productos = shallowRef<Producto[]>([])
  const locales = shallowRef<Local[]>([])
  const articulos = shallowRef<Articulo[]>([])

  async function recargar() {
    await Promise.all([
      pedidos.includes('almacenes') && almacenesService.todos().then((l) => (almacenes.value = l)),
      pedidos.includes('insumos') &&
        inventarioService.listarInsumos().then((l) => (insumos.value = l)),
      pedidos.includes('proveedores') &&
        proveedoresService.todos().then((l) => (proveedores.value = l)),
      pedidos.includes('productos') &&
        cartaService.listarProductos().then((l) => (productos.value = l)),
      pedidos.includes('locales') && localesService.todos().then((l) => (locales.value = l)),
      pedidos.includes('articulos') && articulosService.todos().then((l) => (articulos.value = l)),
    ])
  }

  onMounted(recargar)

  const nombreLocal = (id?: string) => locales.value.find((l) => l.id === id)?.nombre ?? '—'
  const nombreAlmacen = (id?: string) => almacenes.value.find((a) => a.id === id)?.nombre ?? '—'
  const nombreProveedor = (id?: string) =>
    proveedores.value.find((p) => p.id === id)?.razonSocial ?? '—'
  const insumo = (id?: string) => insumos.value.find((i) => i.id === id)
  const producto = (id?: string) => productos.value.find((p) => p.id === id)
  const articulo = (id?: string) => articulos.value.find((a) => a.id === id)
  const nombreArticulo = (id?: string) => articulo(id)?.nombre ?? '—'

  const opcionesAlmacen = computed<OpcionSelect[]>(() =>
    almacenes.value
      .filter((a) => a.activo)
      .map((a) => ({
        valor: a.id,
        etiqueta: locales.value.length ? `${a.nombre} · ${nombreLocal(a.localId)}` : a.nombre,
      })),
  )
  const opcionesProveedor = computed<OpcionSelect[]>(() =>
    proveedores.value
      .filter((p) => p.activo)
      .map((p) => ({ valor: p.id, etiqueta: p.razonSocial })),
  )
  const opcionesInsumo = computed<OpcionSelect[]>(() =>
    insumos.value
      .filter((i) => i.activo)
      .map((i) => ({ valor: i.id, etiqueta: `${i.nombre} (${etiquetaUnidad[i.unidad]})` })),
  )
  const opcionesLocal = computed<OpcionSelect[]>(() =>
    locales.value.map((l) => ({ valor: l.id, etiqueta: l.nombre })),
  )
  const opcionesArticulo = computed<OpcionSelect[]>(() =>
    articulos.value
      .filter((a) => a.activo)
      .map((a) => ({ valor: a.id, etiqueta: `${a.codigo} · ${a.nombre} (${a.unidadCompra})` })),
  )

  return {
    almacenes,
    insumos,
    proveedores,
    productos,
    locales,
    articulos,
    recargar,
    nombreLocal,
    nombreAlmacen,
    nombreProveedor,
    insumo,
    producto,
    articulo,
    nombreArticulo,
    opcionesArticulo,
    opcionesAlmacen,
    opcionesProveedor,
    opcionesInsumo,
    opcionesLocal,
  }
}
