import { computed, onMounted, shallowRef } from 'vue'
import { cartaService } from '@/services/carta.service'
import { proveedoresService } from '@/services/erp.service'
import { almacenesService, inventarioService } from '@/services/inventario.service'
import { localesService } from '@/services/locales.service'
import type { Almacen, Insumo, Local, Producto, Proveedor } from '@/types'
import type { OpcionSelect } from '@/types/ui'
import { etiquetaUnidad } from '@/utils/formato'

type Catalogo = 'almacenes' | 'insumos' | 'proveedores' | 'productos' | 'locales'

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
    ])
  }

  onMounted(recargar)

  const nombreLocal = (id?: string) => locales.value.find((l) => l.id === id)?.nombre ?? '—'
  const nombreAlmacen = (id?: string) => almacenes.value.find((a) => a.id === id)?.nombre ?? '—'
  const nombreProveedor = (id?: string) =>
    proveedores.value.find((p) => p.id === id)?.razonSocial ?? '—'
  const insumo = (id?: string) => insumos.value.find((i) => i.id === id)
  const producto = (id?: string) => productos.value.find((p) => p.id === id)

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

  return {
    almacenes,
    insumos,
    proveedores,
    productos,
    locales,
    recargar,
    nombreLocal,
    nombreAlmacen,
    nombreProveedor,
    insumo,
    producto,
    opcionesAlmacen,
    opcionesProveedor,
    opcionesInsumo,
    opcionesLocal,
  }
}
