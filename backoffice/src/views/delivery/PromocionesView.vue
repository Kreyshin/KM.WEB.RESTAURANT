<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import KmBadge from '@/components/ui/KmBadge.vue'
import KmBotonIcono from '@/components/ui/KmBotonIcono.vue'
import KmButton from '@/components/ui/KmButton.vue'
import KmCard from '@/components/ui/KmCard.vue'
import KmCheckbox from '@/components/ui/KmCheckbox.vue'
import KmDrawer from '@/components/ui/KmDrawer.vue'
import KmFecha from '@/components/ui/KmFecha.vue'
import KmField from '@/components/ui/KmField.vue'
import KmHora from '@/components/ui/KmHora.vue'
import KmInput from '@/components/ui/KmInput.vue'
import KmNumero from '@/components/ui/KmNumero.vue'
import KmSelect from '@/components/ui/KmSelect.vue'
import KmSwitch from '@/components/ui/KmSwitch.vue'
import KmTable from '@/components/ui/KmTable.vue'
import KmTabs from '@/components/ui/KmTabs.vue'
import { useCatalogos } from '@/composables/useCatalogos'
import { cartaService } from '@/services/carta.service'
import { canalesService } from '@/services/comercial.service'
import { tienePermiso, valorConfig } from '@/services/parametros.service'
import { vendibles as listarVendibles } from '@/services/precios.service'
import {
  etiquetaBeneficio,
  etiquetaCondicion,
  etiquetaMotivo,
  promocionesService,
  puntosService,
  resumen,
} from '@/services/promociones.service'
import { useAuthStore } from '@/stores/auth.store'
import { useLocalStore } from '@/stores/local.store'
import { useUiStore } from '@/stores/ui.store'
import type {
  ApiError,
  BeneficioPromocion,
  CanalVenta,
  Categoria,
  CondicionPromocion,
  DiaSemana,
  NuevaPromocion,
  Promocion,
  ProductoVendible,
  ReglasPuntos,
  ResultadoPromociones,
  TipoBeneficio,
  TipoCondicionPromocion,
} from '@/types'
import type { ColumnaTabla, OpcionSelect, Pestana } from '@/types/ui'
import { formatearSoles } from '@/utils/formato'

/**
 * Promociones, cupones y reglas de puntos (F6.2, D-011).
 *
 * La promoción tiene una forma sola —a quién alcanza, cuándo rige, cómo se
 * activa, qué exige y qué da— y el simulador contesta lo que contestaría el
 * POS, incluido por qué una promoción no entró.
 */

const ui = useUiStore()
const auth = useAuthStore()
const localStore = useLocalStore()
const { locales } = useCatalogos(['locales'])

const promociones = shallowRef<Promocion[]>([])
const canales = shallowRef<CanalVenta[]>([])
const categorias = shallowRef<Categoria[]>([])
const vendibles = shallowRef<ProductoVendible[]>([])
const cargando = ref(false)
const puedeEditar = computed(() => tienePermiso(auth.usuario?.id, 'promociones.editar'))

async function cargar() {
  cargando.value = true
  try {
    const [ps, cs, cats] = await Promise.all([
      promocionesService.listar(),
      canalesService.todos(),
      cartaService.listarCategorias(),
    ])
    promociones.value = ps
    canales.value = cs
    categorias.value = cats
    vendibles.value = listarVendibles()
    reglas.value = await puntosService.reglas()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron cargar las promociones.')
  } finally {
    cargando.value = false
  }
}
void cargar()

const acumula = computed(() => valorConfig<boolean>('promociones.acumular'))
const topeCuenta = computed(() =>
  localStore.localId
    ? valorConfig<number>('promociones.topeCuentaPorcentaje', localStore.localId)
    : 0,
)

const pestana = ref<'reglas' | 'simulador' | 'puntos'>('reglas')
const pestanas = computed<Pestana[]>(() => [
  { valor: 'reglas', etiqueta: 'Promociones', contador: promociones.value.length },
  { valor: 'simulador', etiqueta: '¿Qué se aplica?' },
  { valor: 'puntos', etiqueta: 'Puntos' },
])

// 0 = lunes … 6 = domingo, como el resto de la vertical.
const nombresDia = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const diasSemana = [0, 1, 2, 3, 4, 5, 6] as DiaSemana[]

const nombreCanal = (id: string) => canales.value.find((c) => c.id === id)?.nombre ?? id
const nombreLocalDe = (id: string) => locales.value.find((l) => l.id === id)?.nombre ?? id

const opcionesCanal = computed<OpcionSelect[]>(() =>
  canales.value.filter((c) => c.activo).map((c) => ({ valor: c.id, etiqueta: c.nombre })),
)
const opcionesVendible = computed<OpcionSelect[]>(() =>
  vendibles.value
    .filter((v) => v.activo)
    .map((v) => ({ valor: v.id, etiqueta: `${v.codigo} · ${v.nombre}` })),
)

const columnas: ColumnaTabla[] = [
  { clave: 'nombre', etiqueta: 'Promoción' },
  { clave: 'que', etiqueta: 'Qué da' },
  { clave: 'cuando', etiqueta: 'Cuándo rige' },
  { clave: 'alcance', etiqueta: 'A quién alcanza' },
  { clave: 'prioridad', etiqueta: 'Prioridad', clase: 'w-28 text-right' },
  { clave: 'acciones', etiqueta: '', clase: 'w-32 text-right' },
]

/** Cuándo rige, en una línea: vigencia, días y franja. */
function cuando(p: Promocion) {
  const partes: string[] = []
  if (p.desde || p.hasta) partes.push(`${p.desde ?? '…'} → ${p.hasta ?? '…'}`)
  if (p.dias.length) partes.push(p.dias.map((d) => nombresDia[d]).join(' '))
  if (p.horaDesde && p.horaHasta) partes.push(`${p.horaDesde}–${p.horaHasta}`)
  return partes.length ? partes.join(' · ') : 'Siempre'
}

function alcance(p: Promocion) {
  const l = p.localIds.length ? p.localIds.map(nombreLocalDe).join(', ') : 'Todos los locales'
  const c = p.canalIds.length ? p.canalIds.map(nombreCanal).join(', ') : 'Todos los canales'
  return `${l} · ${c}`
}

// ── Editor ───────────────────────────────────────────────────────────────────

const abierto = ref(false)
const editando = shallowRef<Promocion | null>(null)
const guardando = ref(false)
const errores = ref<Record<string, string>>({})

const codigo = ref('')
const nombre = ref('')
const descripcion = ref('')
const localIds = ref<string[]>([])
const canalIds = ref<string[]>([])
const desde = ref('')
const hasta = ref('')
const dias = ref<DiaSemana[]>([])
const conFranja = ref(false)
const horaDesde = ref('12:00')
const horaHasta = ref('16:00')
const activacion = ref<'automatica' | 'cupon'>('automatica')
const cuponCodigo = ref('')
const cuponUsosMaximos = ref(0)
const cuponUsosPorCliente = ref(1)
const condicionTipo = ref<TipoCondicionPromocion>('montoMinimo')
const condicionMonto = ref(50)
const condicionCantidad = ref(2)
const condicionVendibles = ref<string[]>([])
const condicionCategorias = ref<string[]>([])
const beneficioTipo = ref<TipoBeneficio>('porcentaje')
const beneficioValor = ref(10)
const beneficioLlevan = ref(2)
const beneficioPagan = ref(1)
const beneficioVendible = ref('')
const beneficioCantidad = ref(1)
const beneficioAlcance = ref<'condicion' | 'cuenta'>('cuenta')
const topeMonto = ref(0)
const topePorcentaje = ref(0)
const combinable = ref(true)
const prioridad = ref(50)
const activa = ref(true)

const tiposCondicion: TipoCondicionPromocion[] = ['ninguna', 'montoMinimo', 'unidades']
const tiposBeneficio: TipoBeneficio[] = [
  'porcentaje',
  'monto',
  'precioFijo',
  'nxm',
  'productoGratis',
  'envioGratis',
]
const opcionesCondicion = computed<OpcionSelect[]>(() =>
  tiposCondicion.map((t) => ({ valor: t, etiqueta: etiquetaCondicion[t] })),
)
const opcionesBeneficio = computed<OpcionSelect[]>(() =>
  tiposBeneficio.map((t) => ({ valor: t, etiqueta: etiquetaBeneficio[t] })),
)

/** El N×M y el precio fijo se calculan sobre el conjunto de la condición. */
const exigeConjunto = computed(
  () => beneficioTipo.value === 'nxm' || beneficioTipo.value === 'precioFijo',
)

function abrir(p?: Promocion) {
  editando.value = p ?? null
  errores.value = {}
  codigo.value = p?.codigo ?? ''
  nombre.value = p?.nombre ?? ''
  descripcion.value = p?.descripcion ?? ''
  localIds.value = [...(p?.localIds ?? [])]
  canalIds.value = [...(p?.canalIds ?? [])]
  desde.value = p?.desde ?? ''
  hasta.value = p?.hasta ?? ''
  dias.value = [...(p?.dias ?? [])]
  conFranja.value = Boolean(p?.horaDesde && p?.horaHasta)
  horaDesde.value = p?.horaDesde ?? '12:00'
  horaHasta.value = p?.horaHasta ?? '16:00'
  activacion.value = p?.activacion ?? 'automatica'
  cuponCodigo.value = p?.cupon?.codigo ?? ''
  cuponUsosMaximos.value = p?.cupon?.usosMaximos ?? 0
  cuponUsosPorCliente.value = p?.cupon?.usosPorCliente ?? 1
  condicionTipo.value = p?.condicion.tipo ?? 'montoMinimo'
  condicionMonto.value = p?.condicion.monto ?? 50
  condicionCantidad.value = p?.condicion.cantidad ?? 2
  condicionVendibles.value = [...(p?.condicion.vendibleIds ?? [])]
  condicionCategorias.value = [...(p?.condicion.categoriaIds ?? [])]
  beneficioTipo.value = p?.beneficio.tipo ?? 'porcentaje'
  beneficioValor.value = p?.beneficio.valor ?? 10
  beneficioLlevan.value = p?.beneficio.llevan ?? 2
  beneficioPagan.value = p?.beneficio.pagan ?? 1
  beneficioVendible.value = p?.beneficio.vendibleId ?? ''
  beneficioCantidad.value = p?.beneficio.cantidad ?? 1
  beneficioAlcance.value = p?.beneficio.alcance ?? 'cuenta'
  topeMonto.value = p?.topeMonto ?? 0
  topePorcentaje.value = p?.topePorcentaje ?? 0
  combinable.value = p?.combinable ?? true
  prioridad.value = p?.prioridad ?? 50
  activa.value = p?.activa ?? true
  abierto.value = true
}

/** Marca o desmarca un id en una lista de selección múltiple. */
function alternado(lista: string[], id: string) {
  return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]
}
const alternarLocal = (id: string) => (localIds.value = alternado(localIds.value, id))
const alternarCanal = (id: string) => (canalIds.value = alternado(canalIds.value, id))
const alternarCategoria = (id: string) =>
  (condicionCategorias.value = alternado(condicionCategorias.value, id))
const alternarVendible = (id: string) =>
  (condicionVendibles.value = alternado(condicionVendibles.value, id))
const alternarCanalPuntos = (id: string) =>
  (reglas.value.canalIds = alternado(reglas.value.canalIds, id))

function alternarDia(d: DiaSemana) {
  dias.value = dias.value.includes(d) ? dias.value.filter((x) => x !== d) : [...dias.value, d]
}

function armarCondicion(): CondicionPromocion {
  if (condicionTipo.value === 'ninguna') return { tipo: 'ninguna' }
  if (condicionTipo.value === 'montoMinimo')
    return { tipo: 'montoMinimo', monto: condicionMonto.value }
  return {
    tipo: 'unidades',
    cantidad: condicionCantidad.value,
    vendibleIds: condicionVendibles.value.length ? condicionVendibles.value : undefined,
    categoriaIds: condicionCategorias.value.length ? condicionCategorias.value : undefined,
  }
}

function armarBeneficio(): BeneficioPromocion {
  const tipo = beneficioTipo.value
  if (tipo === 'nxm')
    return {
      tipo,
      llevan: beneficioLlevan.value,
      pagan: beneficioPagan.value,
      alcance: 'condicion',
    }
  if (tipo === 'productoGratis')
    return { tipo, vendibleId: beneficioVendible.value, cantidad: beneficioCantidad.value }
  if (tipo === 'envioGratis') return { tipo }
  if (tipo === 'precioFijo') return { tipo, valor: beneficioValor.value, alcance: 'condicion' }
  return { tipo, valor: beneficioValor.value, alcance: beneficioAlcance.value }
}

async function guardar() {
  guardando.value = true
  errores.value = {}
  const datos: NuevaPromocion = {
    codigo: codigo.value,
    nombre: nombre.value,
    descripcion: descripcion.value,
    localIds: localIds.value,
    canalIds: canalIds.value,
    desde: desde.value || undefined,
    hasta: hasta.value || undefined,
    dias: dias.value,
    horaDesde: conFranja.value ? horaDesde.value : undefined,
    horaHasta: conFranja.value ? horaHasta.value : undefined,
    activacion: activacion.value,
    cupon:
      activacion.value === 'cupon'
        ? {
            codigo: cuponCodigo.value,
            usosMaximos: cuponUsosMaximos.value,
            usosPorCliente: cuponUsosPorCliente.value,
            usados: editando.value?.cupon?.usados ?? 0,
          }
        : undefined,
    condicion: armarCondicion(),
    beneficio: armarBeneficio(),
    topeMonto: topeMonto.value,
    topePorcentaje: topePorcentaje.value,
    combinable: combinable.value,
    prioridad: prioridad.value,
    activa: activa.value,
  }
  try {
    if (editando.value)
      await promocionesService.actualizar(editando.value.id, datos, auth.usuario?.id)
    else await promocionesService.crear(datos, auth.usuario?.id)
    ui.exito(`Promoción «${datos.nombre.trim()}» guardada.`)
    abierto.value = false
    await cargar()
  } catch (e) {
    const error = e as ApiError
    errores.value = error.campos ?? {}
    ui.error(error.mensaje ?? 'No se pudo guardar la promoción.')
  } finally {
    guardando.value = false
  }
}

async function cambiarEstado(p: Promocion) {
  try {
    await promocionesService.cambiarEstado(p.id, !p.activa, auth.usuario?.id)
    ui.exito(`«${p.nombre}» ${p.activa ? 'desactivada' : 'activada'}.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo cambiar el estado.')
  }
}

async function eliminar(p: Promocion) {
  try {
    await promocionesService.eliminar(p.id, auth.usuario?.id)
    ui.exito(`«${p.nombre}» eliminada.`)
    await cargar()
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo eliminar la promoción.')
  }
}

// ── Simulador ────────────────────────────────────────────────────────────────

const hoy = new Date().toISOString().slice(0, 10)
const simCanal = ref('cv1')
const simFecha = ref(hoy)
const simHora = ref('20:00')
const simCupon = ref('')
const simDistrito = ref('')
const simLineas = ref<{ vendibleId: string; cantidad: number }[]>([
  { vendibleId: 'v:v1', cantidad: 2 },
])
const resultado = shallowRef<ResultadoPromociones | null>(null)
const simulando = ref(false)

const esDelivery = computed(
  () => canales.value.find((c) => c.id === simCanal.value)?.tipo === 'delivery',
)

function agregarLinea() {
  simLineas.value = [...simLineas.value, { vendibleId: '', cantidad: 1 }]
}
const quitarLinea = (i: number) => (simLineas.value = simLineas.value.filter((_, idx) => idx !== i))

async function simular() {
  if (!localStore.localId) return
  simulando.value = true
  try {
    resultado.value = await promocionesService.evaluar({
      localId: localStore.localId,
      canalId: simCanal.value,
      fecha: simFecha.value,
      hora: simHora.value,
      lineas: simLineas.value.filter((l) => l.vendibleId && l.cantidad > 0),
      cupon: simCupon.value.trim() || undefined,
      distrito: simDistrito.value.trim() || undefined,
    })
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudo simular la cuenta.')
  } finally {
    simulando.value = false
  }
}
watch(pestana, (p) => {
  if (p === 'simulador' && !resultado.value) void simular()
})

const puntosDeLaCuenta = computed(() =>
  resultado.value ? puntosService.puntosPor(resultado.value.total, simCanal.value) : 0,
)

// ── Puntos ───────────────────────────────────────────────────────────────────

const reglas = ref<ReglasPuntos>({
  activo: false,
  solesPorPunto: 10,
  valorPunto: 0.5,
  canjeMinimo: 20,
  caducidadMeses: 12,
  canalIds: [],
})
const guardandoPuntos = ref(false)

async function guardarPuntos() {
  guardandoPuntos.value = true
  try {
    reglas.value = await puntosService.guardar(reglas.value, auth.usuario?.id)
    ui.exito('Reglas de puntos guardadas.')
  } catch (e) {
    ui.error((e as ApiError).mensaje ?? 'No se pudieron guardar las reglas.')
  } finally {
    guardandoPuntos.value = false
  }
}
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <KmCard sin-padding>
      <div class="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
        <div>
          <p class="rs-etiqueta text-laton-texto">Reglas que lee el POS</p>
          <h2 class="rs-titulo-seccion mt-1 text-tinta">Promociones y cupones</h2>
          <p class="mt-1 max-w-3xl text-sm text-tenue">
            Cada promoción dice a quién alcanza, cuándo rige, cómo se activa, qué exige y qué da. En
            caja se aplica sola y siempre se puede explicar por qué entró o por qué no.
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <KmBadge :tono="acumula ? 'laton' : 'pizarra'">
              {{ acumula ? 'Se acumulan las combinables' : 'Una promoción por cuenta' }}
            </KmBadge>
            <KmBadge v-if="topeCuenta > 0" tono="vino">
              Tope del local: {{ topeCuenta }} % de la cuenta
            </KmBadge>
          </div>
        </div>
        <KmButton v-if="pestana === 'reglas'" :disabled="!puedeEditar" @click="abrir()">
          Nueva promoción
        </KmButton>
      </div>

      <div class="px-6 pt-4 pb-6">
        <KmTabs v-model="pestana" :pestanas="pestanas" etiqueta="Promociones">
          <!-- ── Promociones ── -->
          <KmTable
            v-if="pestana === 'reglas'"
            :columnas="columnas"
            :filas="promociones"
            :cargando="cargando"
            mensaje-vacio="Todavía no hay promociones: la primera suele ser la del día flojo."
          >
            <template #col-nombre="{ fila }">
              <div class="flex flex-col gap-1">
                <span class="font-semibold text-tinta">{{ fila.nombre }}</span>
                <span class="text-xs text-tenue tabular-nums">{{ fila.codigo }}</span>
                <div class="flex flex-wrap gap-1.5">
                  <KmBadge v-if="!fila.activa" tono="neutro">Desactivada</KmBadge>
                  <KmBadge v-if="fila.activacion === 'cupon'" tono="laton">
                    Cupón {{ fila.cupon?.codigo }}
                  </KmBadge>
                  <KmBadge v-if="!fila.combinable" tono="pizarra">No se acumula</KmBadge>
                </div>
              </div>
            </template>
            <template #col-que="{ fila }">
              <div class="flex flex-col gap-0.5">
                <span class="text-tinta">{{ resumen(fila) }}</span>
                <span v-if="fila.topeMonto || fila.topePorcentaje" class="text-xs text-tenue">
                  Tope:
                  {{
                    [
                      fila.topeMonto ? formatearSoles(fila.topeMonto) : '',
                      fila.topePorcentaje ? `${fila.topePorcentaje} %` : '',
                    ]
                      .filter(Boolean)
                      .join(' o ')
                  }}
                </span>
                <span v-if="fila.cupon" class="text-xs text-tenue tabular-nums">
                  {{ fila.cupon.usados }} uso(s)
                  {{ fila.cupon.usosMaximos ? `de ${fila.cupon.usosMaximos}` : 'registrados' }}
                </span>
              </div>
            </template>
            <template #col-cuando="{ fila }">
              <span class="text-sm text-tenue">{{ cuando(fila) }}</span>
            </template>
            <template #col-alcance="{ fila }">
              <span class="text-sm text-tenue">{{ alcance(fila) }}</span>
            </template>
            <template #col-prioridad="{ fila }">
              <span class="tabular-nums">{{ fila.prioridad }}</span>
            </template>
            <template #col-acciones="{ fila }">
              <div class="flex justify-end gap-1">
                <KmBotonIcono
                  :icono="fila.activa ? 'anular' : 'ver'"
                  :etiqueta="fila.activa ? 'Desactivar' : 'Activar'"
                  :contexto="fila.nombre"
                  :disabled="!puedeEditar"
                  @click="cambiarEstado(fila)"
                />
                <KmBotonIcono
                  icono="editar"
                  etiqueta="Editar"
                  :contexto="fila.nombre"
                  :disabled="!puedeEditar"
                  @click="abrir(fila)"
                />
                <KmBotonIcono
                  icono="eliminar"
                  tono="peligro"
                  etiqueta="Eliminar"
                  :contexto="fila.nombre"
                  :disabled="!puedeEditar"
                  @click="eliminar(fila)"
                />
              </div>
            </template>
          </KmTable>

          <!-- ── Simulador ── -->
          <div v-else-if="pestana === 'simulador'" class="flex flex-col gap-4">
            <p class="max-w-3xl text-sm text-tenue">
              Arma una cuenta y mira qué contestaría la caja: qué promoción entra, cuánto rebaja y
              por qué las demás se quedan fuera.
            </p>

            <div class="flex flex-wrap items-end gap-3">
              <KmField v-slot="{ id }" label="Canal">
                <KmSelect :id="id" v-model="simCanal" :opciones="opcionesCanal" />
              </KmField>
              <KmField v-slot="{ id }" label="Fecha">
                <KmFecha :id="id" v-model="simFecha" />
              </KmField>
              <KmField v-slot="{ id }" label="Hora">
                <KmHora :id="id" v-model="simHora" />
              </KmField>
              <KmField v-slot="{ id }" label="Cupón">
                <KmInput :id="id" v-model="simCupon" placeholder="BIENVENIDA10" />
              </KmField>
              <KmField v-if="esDelivery" v-slot="{ id }" label="Distrito">
                <KmInput :id="id" v-model="simDistrito" placeholder="Miraflores" />
              </KmField>
            </div>

            <div class="flex flex-col gap-2 rounded-card border border-linea p-4">
              <p class="rs-etiqueta text-tenue">Líneas de la cuenta</p>
              <div v-for="(l, i) in simLineas" :key="i" class="flex flex-wrap items-end gap-2">
                <KmField v-slot="{ id }" label="Producto">
                  <KmSelect
                    :id="id"
                    v-model="l.vendibleId"
                    :opciones="opcionesVendible"
                    placeholder="Elige un producto"
                  />
                </KmField>
                <KmField v-slot="{ id }" label="Cantidad">
                  <KmNumero :id="id" v-model="l.cantidad" :min="1" :decimales="0" controles />
                </KmField>
                <KmBotonIcono
                  icono="eliminar"
                  tono="peligro"
                  etiqueta="Quitar línea"
                  @click="quitarLinea(i)"
                />
              </div>
              <div class="flex gap-2">
                <KmButton variante="secundario" @click="agregarLinea">Añadir línea</KmButton>
                <KmButton :cargando="simulando" @click="simular">Calcular</KmButton>
              </div>
            </div>

            <div v-if="resultado" class="grid gap-4 lg:grid-cols-2">
              <div class="flex flex-col gap-3 rounded-card border border-linea p-4">
                <h3 class="rs-etiqueta text-tenue">La cuenta</h3>
                <dl class="flex flex-col gap-1.5 text-sm tabular-nums">
                  <div class="flex justify-between">
                    <dt class="text-tenue">Productos</dt>
                    <dd class="text-tinta">{{ formatearSoles(resultado.subtotal) }}</dd>
                  </div>
                  <div v-if="resultado.costoEnvio" class="flex justify-between">
                    <dt class="text-tenue">Envío</dt>
                    <dd class="text-tinta">{{ formatearSoles(resultado.costoEnvio) }}</dd>
                  </div>
                  <div v-if="resultado.descuento" class="flex justify-between">
                    <dt class="text-tenue">Descuento</dt>
                    <dd class="text-verde">− {{ formatearSoles(resultado.descuento) }}</dd>
                  </div>
                  <div v-if="resultado.descuentoEnvio" class="flex justify-between">
                    <dt class="text-tenue">Envío perdonado</dt>
                    <dd class="text-verde">− {{ formatearSoles(resultado.descuentoEnvio) }}</dd>
                  </div>
                  <div class="mt-1 flex justify-between border-t border-linea pt-2">
                    <dt class="font-semibold text-tinta">Se cobra</dt>
                    <dd class="font-semibold text-tinta">{{ formatearSoles(resultado.total) }}</dd>
                  </div>
                </dl>
                <p v-if="reglas.activo" class="text-xs text-tenue">
                  Esta cuenta daría {{ puntosDeLaCuenta }} punto(s).
                </p>
                <div
                  v-if="resultado.cobertura"
                  class="rounded-card border border-linea p-3 text-xs"
                  :class="resultado.cobertura.bloquea ? 'text-vino-texto' : 'text-tenue'"
                >
                  {{ resultado.cobertura.explicacion }}
                </div>
              </div>

              <div class="flex flex-col gap-3">
                <div
                  class="rounded-card border border-linea p-4"
                  role="region"
                  aria-label="Promociones que entran"
                >
                  <h3 class="rs-etiqueta text-tenue">Entra</h3>
                  <ul v-if="resultado.aplicadas.length" class="mt-2 flex flex-col gap-2">
                    <li v-for="a in resultado.aplicadas" :key="a.promocionId" class="text-sm">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-semibold text-tinta">{{ a.nombre }}</span>
                        <span class="text-verde tabular-nums">
                          − {{ formatearSoles(a.descuento + a.descuentoEnvio) }}
                        </span>
                      </div>
                      <p class="text-xs text-tenue">{{ a.explicacion }}</p>
                      <p v-if="a.regalo" class="text-xs text-verde">
                        Regalo: {{ a.regalo.cantidad }} × {{ a.regalo.nombre }}
                      </p>
                    </li>
                  </ul>
                  <p v-else class="mt-2 text-sm text-tenue">
                    Ninguna promoción entra en esta cuenta.
                  </p>
                </div>

                <div
                  class="rounded-card border border-linea p-4"
                  role="region"
                  aria-label="Promociones que no entran"
                >
                  <h3 class="rs-etiqueta text-tenue">No entra, y por qué</h3>
                  <ul class="mt-2 flex flex-col gap-2">
                    <li v-for="d in resultado.descartadas" :key="d.promocionId" class="text-sm">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-tinta">{{ d.nombre }}</span>
                        <KmBadge tono="neutro">
                          {{ d.motivo ? etiquetaMotivo[d.motivo] : 'Descartada' }}
                        </KmBadge>
                      </div>
                      <p class="text-xs text-tenue">{{ d.explicacion }}</p>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Puntos ── -->
          <div v-else class="flex max-w-2xl flex-col gap-4">
            <p class="text-sm text-tenue">
              Aquí solo viven las reglas, para que el POS sepa qué mostrar al cobrar. El saldo de
              cada cliente es de fidelización, que es otro sistema.
            </p>
            <KmSwitch
              v-model="reglas.activo"
              etiqueta="Acumular puntos"
              descripcion="Apagado, la caja no menciona puntos."
            />
            <div class="grid gap-4 sm:grid-cols-2">
              <KmField v-slot="{ id }" label="Soles por punto">
                <KmNumero
                  :id="id"
                  v-model="reglas.solesPorPunto"
                  prefijo="S/"
                  :decimales="2"
                  :min="0"
                />
              </KmField>
              <KmField v-slot="{ id }" label="Valor del punto al canjear">
                <KmNumero
                  :id="id"
                  v-model="reglas.valorPunto"
                  prefijo="S/"
                  :decimales="2"
                  :min="0"
                />
              </KmField>
              <KmField v-slot="{ id }" label="Canje mínimo" ayuda="Puntos">
                <KmNumero :id="id" v-model="reglas.canjeMinimo" :decimales="0" :min="0" />
              </KmField>
              <KmField v-slot="{ id }" label="Caducidad" ayuda="0: no caducan">
                <KmNumero
                  :id="id"
                  v-model="reglas.caducidadMeses"
                  sufijo="meses"
                  :decimales="0"
                  :min="0"
                />
              </KmField>
            </div>
            <KmField label="Canales que acumulan" ayuda="Sin marcar ninguno: todos acumulan.">
              <div class="flex flex-wrap gap-3">
                <KmCheckbox
                  v-for="c in canales.filter((x) => x.activo)"
                  :key="c.id"
                  :model-value="reglas.canalIds.includes(c.id)"
                  tamano="sm"
                  @update:model-value="alternarCanalPuntos(c.id)"
                >
                  {{ c.nombre }}
                </KmCheckbox>
              </div>
            </KmField>
            <div>
              <KmButton :cargando="guardandoPuntos" :disabled="!puedeEditar" @click="guardarPuntos">
                Guardar reglas
              </KmButton>
            </div>
          </div>
        </KmTabs>
      </div>
    </KmCard>

    <KmDrawer
      v-model="abierto"
      :titulo="editando ? `Editar ${editando.nombre}` : 'Nueva promoción'"
      subtitulo="A quién alcanza, cuándo rige, cómo se activa, qué exige y qué da"
      ancho="xl"
    >
      <div class="grid gap-5 lg:grid-cols-2">
        <section class="flex flex-col gap-4">
          <h3 class="rs-etiqueta text-laton-texto">Identidad</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <KmField v-slot="{ id }" label="Código" requerido :error="errores.codigo">
              <KmInput :id="id" v-model="codigo" placeholder="MARTES-CEBICHE" />
            </KmField>
            <KmField v-slot="{ id }" label="Nombre" requerido :error="errores.nombre">
              <KmInput :id="id" v-model="nombre" placeholder="Martes de cebiche 2×1" />
            </KmField>
          </div>
          <KmField v-slot="{ id }" label="Descripción">
            <KmInput :id="id" v-model="descripcion" placeholder="Cómo se la explica al cliente" />
          </KmField>

          <h3 class="rs-etiqueta text-laton-texto">A quién alcanza</h3>
          <KmField label="Locales" ayuda="Sin marcar ninguno: todos los locales.">
            <div class="flex flex-wrap gap-3">
              <KmCheckbox
                v-for="l in locales"
                :key="l.id"
                :model-value="localIds.includes(l.id)"
                tamano="sm"
                @update:model-value="alternarLocal(l.id)"
              >
                {{ l.nombre }}
              </KmCheckbox>
            </div>
          </KmField>
          <KmField
            label="Canales"
            :error="errores.canalIds"
            ayuda="Sin marcar ninguno: todos los canales."
          >
            <div class="flex flex-wrap gap-3">
              <KmCheckbox
                v-for="c in canales.filter((x) => x.activo)"
                :key="c.id"
                :model-value="canalIds.includes(c.id)"
                tamano="sm"
                @update:model-value="alternarCanal(c.id)"
              >
                {{ c.nombre }}
              </KmCheckbox>
            </div>
          </KmField>

          <h3 class="rs-etiqueta text-laton-texto">Cuándo rige</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <KmField v-slot="{ id }" label="Desde" :error="errores.desde">
              <KmFecha :id="id" v-model="desde" limpiable />
            </KmField>
            <KmField v-slot="{ id }" label="Hasta" :error="errores.hasta">
              <KmFecha :id="id" v-model="hasta" limpiable />
            </KmField>
          </div>
          <KmField label="Días" ayuda="Sin marcar ninguno: todos los días.">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="d in diasSemana"
                :key="d"
                type="button"
                class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                :class="
                  dias.includes(d)
                    ? 'border-verde text-verde'
                    : 'border-linea text-tenue hover:text-tinta'
                "
                @click="alternarDia(d)"
              >
                {{ nombresDia[d] }}
              </button>
            </div>
          </KmField>
          <KmSwitch v-model="conFranja" etiqueta="Solo en una franja del día" />
          <div v-if="conFranja" class="grid gap-4 sm:grid-cols-2">
            <KmField v-slot="{ id }" label="Desde" :error="errores.horaDesde">
              <KmHora :id="id" v-model="horaDesde" />
            </KmField>
            <KmField v-slot="{ id }" label="Hasta" :error="errores.horaHasta">
              <KmHora :id="id" v-model="horaHasta" />
            </KmField>
          </div>
        </section>

        <section class="flex flex-col gap-4">
          <h3 class="rs-etiqueta text-laton-texto">Cómo se activa</h3>
          <KmField v-slot="{ id }" label="Activación">
            <KmSelect
              :id="id"
              v-model="activacion"
              :opciones="[
                { valor: 'automatica', etiqueta: 'Automática en caja' },
                { valor: 'cupon', etiqueta: 'Con cupón' },
              ]"
            />
          </KmField>
          <div v-if="activacion === 'cupon'" class="grid gap-4 sm:grid-cols-3">
            <KmField v-slot="{ id }" label="Cupón" requerido :error="errores.cupon">
              <KmInput :id="id" v-model="cuponCodigo" placeholder="BIENVENIDA10" />
            </KmField>
            <KmField v-slot="{ id }" label="Usos totales" ayuda="0: sin tope">
              <KmNumero :id="id" v-model="cuponUsosMaximos" :decimales="0" :min="0" />
            </KmField>
            <KmField v-slot="{ id }" label="Usos por cliente" ayuda="0: sin tope">
              <KmNumero :id="id" v-model="cuponUsosPorCliente" :decimales="0" :min="0" />
            </KmField>
          </div>

          <h3 class="rs-etiqueta text-laton-texto">Qué exige</h3>
          <KmField v-slot="{ id }" label="Condición" :error="errores.condicion">
            <KmSelect :id="id" v-model="condicionTipo" :opciones="opcionesCondicion" />
          </KmField>
          <KmField
            v-if="condicionTipo === 'montoMinimo'"
            v-slot="{ id }"
            label="Monto mínimo de la cuenta"
          >
            <KmNumero :id="id" v-model="condicionMonto" prefijo="S/" :decimales="2" :min="0" />
          </KmField>
          <template v-if="condicionTipo === 'unidades'">
            <KmField v-slot="{ id }" label="Unidades del conjunto">
              <KmNumero :id="id" v-model="condicionCantidad" :decimales="0" :min="1" controles />
            </KmField>
            <KmField label="Categorías que cuentan">
              <div class="flex flex-wrap gap-3">
                <KmCheckbox
                  v-for="c in categorias.filter((x) => x.activa)"
                  :key="c.id"
                  :model-value="condicionCategorias.includes(c.id)"
                  tamano="sm"
                  @update:model-value="alternarCategoria(c.id)"
                >
                  {{ c.nombre }}
                </KmCheckbox>
              </div>
            </KmField>
            <KmField label="Productos que cuentan" ayuda="Se suman a las categorías elegidas.">
              <div class="max-h-40 overflow-y-auto rounded-card border border-linea p-2">
                <KmCheckbox
                  v-for="v in vendibles.filter((x) => x.activo)"
                  :key="v.id"
                  :model-value="condicionVendibles.includes(v.id)"
                  tamano="sm"
                  class="w-full"
                  @update:model-value="alternarVendible(v.id)"
                >
                  {{ v.nombre }}
                </KmCheckbox>
              </div>
            </KmField>
          </template>

          <h3 class="rs-etiqueta text-laton-texto">Qué da</h3>
          <KmField
            v-slot="{ id }"
            label="Beneficio"
            :error="errores.beneficio"
            ayuda="Lista cerrada: cada beneficio es una línea distinta del comprobante."
          >
            <KmSelect :id="id" v-model="beneficioTipo" :opciones="opcionesBeneficio" />
          </KmField>
          <p v-if="exigeConjunto && condicionTipo !== 'unidades'" class="text-xs text-vino-texto">
            Este beneficio se calcula sobre los productos de la condición: elige la condición por
            unidades.
          </p>
          <KmField
            v-if="beneficioTipo === 'porcentaje'"
            v-slot="{ id }"
            label="Porcentaje de descuento"
          >
            <KmNumero
              :id="id"
              v-model="beneficioValor"
              sufijo="%"
              :decimales="2"
              :min="0"
              :max="100"
            />
          </KmField>
          <KmField
            v-else-if="beneficioTipo === 'monto' || beneficioTipo === 'precioFijo'"
            v-slot="{ id }"
            :label="beneficioTipo === 'monto' ? 'Monto de descuento' : 'Precio fijo por unidad'"
          >
            <KmNumero :id="id" v-model="beneficioValor" prefijo="S/" :decimales="2" :min="0" />
          </KmField>
          <div v-else-if="beneficioTipo === 'nxm'" class="grid gap-4 sm:grid-cols-2">
            <KmField v-slot="{ id }" label="Se lleva">
              <KmNumero :id="id" v-model="beneficioLlevan" :decimales="0" :min="2" controles />
            </KmField>
            <KmField v-slot="{ id }" label="Se paga">
              <KmNumero :id="id" v-model="beneficioPagan" :decimales="0" :min="1" controles />
            </KmField>
          </div>
          <div v-else-if="beneficioTipo === 'productoGratis'" class="grid gap-4 sm:grid-cols-2">
            <KmField v-slot="{ id }" label="Producto de regalo">
              <KmSelect
                :id="id"
                v-model="beneficioVendible"
                :opciones="opcionesVendible"
                placeholder="Elige el producto"
              />
            </KmField>
            <KmField v-slot="{ id }" label="Cantidad">
              <KmNumero :id="id" v-model="beneficioCantidad" :decimales="0" :min="1" controles />
            </KmField>
          </div>
          <p v-else class="text-sm text-tenue">
            Se perdona el envío de la zona. Solo tiene sentido en un canal de reparto propio.
          </p>
          <KmField
            v-if="beneficioTipo === 'porcentaje' || beneficioTipo === 'monto'"
            v-slot="{ id }"
            label="Se calcula sobre"
          >
            <KmSelect
              :id="id"
              v-model="beneficioAlcance"
              :opciones="[
                { valor: 'cuenta', etiqueta: 'Toda la cuenta' },
                { valor: 'condicion', etiqueta: 'Solo los productos de la condición' },
              ]"
            />
          </KmField>

          <h3 class="rs-etiqueta text-laton-texto">Frenos</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <KmField
              v-slot="{ id }"
              label="Tope en soles"
              ayuda="0: sin tope"
              :error="errores.topeMonto"
            >
              <KmNumero :id="id" v-model="topeMonto" prefijo="S/" :decimales="2" :min="0" />
            </KmField>
            <KmField v-slot="{ id }" label="Tope como % de la cuenta" ayuda="0: sin tope">
              <KmNumero
                :id="id"
                v-model="topePorcentaje"
                sufijo="%"
                :decimales="2"
                :min="0"
                :max="100"
              />
            </KmField>
          </div>
          <KmField
            v-slot="{ id }"
            label="Prioridad"
            ayuda="Cuando no se acumulan, manda la de mayor prioridad."
          >
            <KmNumero :id="id" v-model="prioridad" :decimales="0" :min="0" controles />
          </KmField>
          <KmSwitch
            v-model="combinable"
            etiqueta="Se puede acumular con otras"
            descripcion="Solo surte efecto si la configuración permite acumular promociones."
          />
          <KmSwitch v-model="activa" etiqueta="Promoción activa" />
        </section>
      </div>
      <template #footer>
        <KmButton variante="secundario" @click="abierto = false">Cancelar</KmButton>
        <KmButton :cargando="guardando" @click="guardar">Guardar</KmButton>
      </template>
    </KmDrawer>
  </div>
</template>
