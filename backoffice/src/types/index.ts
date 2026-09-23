/**
 * Modelo de dominio de KM.Restaurante (back office).
 * Estas interfaces son el contrato entre las vistas y la capa de servicios.
 * Cuando exista el backend real solo cambia la implementación de `services/`,
 * no las vistas.
 */

// ── Autenticación y roles ────────────────────────────────────────────────────

export type Rol = 'admin' | 'cajero' | 'mesero' | 'cocinero'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  avatarUrl?: string
  /** Locales a los que tiene acceso (dato del ERP). Sin valor: todos. */
  localIds?: string[]
  /**
   * Almacenes a los que tiene acceso y con qué nivel. Dato del ERP: se asigna
   * y se bloquea allí, la vertical solo lo respeta. Sin valor: ve y gestiona todos.
   */
  almacenes?: AccesoAlmacen[]
}

/** `ver`: consulta de stock y movimientos. `gestionar`: además, registrar movimientos. */
export type NivelAcceso = 'ver' | 'gestionar'

export interface AccesoAlmacen {
  almacenId: string
  nivel: NivelAcceso
}

/**
 * Restricción de la vertical sobre una zona para un usuario (D-009): el
 * bartender solo gestiona la barra. Sin registro, la zona hereda el nivel
 * que el ERP da sobre su almacén; nunca lo amplía.
 */
export interface AccesoZona {
  usuarioId: string
  zonaId: string
  nivel: NivelAcceso | 'ninguno'
}

export interface Sesion {
  token: string
  usuario: Usuario
}

// ── Salones y mesas ──────────────────────────────────────────────────────────

export type EstadoMesa = 'libre' | 'ocupada' | 'reservada' | 'limpieza' | 'inactiva'

export type FormaMesa = 'cuadrada' | 'redonda' | 'rectangular'

export interface Salon {
  id: string
  nombre: string
  /** Local al que pertenece (dato del ERP). */
  localId: string
  descripcion?: string
  /** Orden de aparición en el selector de salones. */
  orden: number
  activo: boolean
}

export interface Mesa {
  id: string
  salonId: string
  /** Código visible para el mesero, ej. "M-12". Único dentro del salón. */
  codigo: string
  capacidad: number
  forma: FormaMesa
  estado: EstadoMesa
  /** Usuario (mesero) asignado a la mesa, si lo hay. */
  meseroId?: string
  /** Posición en el plano del salón, en porcentaje del contenedor (0–100). */
  posX: number
  posY: number
  /**
   * Mesas unidas para un grupo grande comparten este id. Se atienden como una
   * sola cuenta; al separarlas cada una recupera su independencia.
   */
  grupoId?: string
}

/** Salón con sus mesas resueltas, para la vista de plano. */
export interface SalonConMesas extends Salon {
  mesas: Mesa[]
}

// ── Carta y menú ─────────────────────────────────────────────────────────────

export type Alergeno =
  'gluten' | 'lacteos' | 'huevo' | 'pescado' | 'mariscos' | 'frutosSecos' | 'soya' | 'aji'

export interface Categoria {
  id: string
  nombre: string
  /** Objetivo de food cost de la categoría, en %. Sin valor: el de su sección o la configuración. */
  foodCostObjetivo?: number
  /**
   * Sección que la agrupa (un solo nivel): «Fondos» agrupa criollos y marinos.
   * Una sección no pertenece a otra.
   */
  seccionId?: string
  /** Locales donde se ofrece. Vacío o sin valor: todos. */
  localIds?: string[]
  /** Canales donde se ofrece, incluidas apps externas. Vacío o sin valor: todos. */
  canalIds?: string[]
  descripcion?: string
  /** Orden de aparición en la carta y en la toma de comanda. */
  orden: number
  activa: boolean
  /** Sin valor: disponible todo el horario del local. */
  disponibilidad?: DisponibilidadHoraria
}

/** Franja en la que se ofrece una categoría (desayunos, menú de mediodía…). */
export interface DisponibilidadHoraria {
  dias: DiaSemana[]
  /** `HH:mm`. */
  desde: string
  hasta: string
}

/**
 * Presentación alternativa de un producto (personal, fuente, media...).
 * `precio` es el precio FINAL de esa presentación, no un recargo sobre el base:
 * evita cálculos encadenados al cobrar.
 */
export interface Variante {
  id: string
  /** Código de producto vendible (D-010). */
  codigo?: string
  nombre: string
  precio: number
  activa: boolean
}

/** Opción concreta dentro de un grupo: «sin cebolla», «término medio». */
export interface Modificador {
  id: string
  /** Código de producto vendible cuando tiene recargo (D-010). */
  codigo?: string
  /** Insumos que suma o quita al pedirlo (D-007). Sin efectos ni recargo es una nota. */
  efectos?: EfectoModificador[]
  nombre: string
  /** Recargo sobre el precio. 0 cuando la opción no cuesta. */
  recargo: number
  activo: boolean
}

export interface EfectoModificador {
  insumoId: string
  cantidad: number
  unidad: UnidadMedida
  efecto: 'suma' | 'quita'
}

/**
 * Conjunto de opciones con reglas de selección.
 * `seleccionMinima: 1` lo vuelve obligatorio; `seleccionMaxima > 1` permite
 * marcar varias (extras), y `=== 1` lo convierte en elección única.
 */
export interface GrupoModificador {
  id: string
  nombre: string
  seleccionMinima: number
  seleccionMaxima: number
  modificadores: Modificador[]
}

export interface Producto {
  id: string
  codigo?: string
  categoriaId: string
  nombre: string
  descripcion?: string
  /** Precio base. Si hay variantes activas, manda el precio de la variante. */
  precio: number
  disponible: boolean
  tiempoPreparacionMin?: number
  alergenos: Alergeno[]
  variantes: Variante[]
  gruposModificadores: GrupoModificador[]
  /** Data URL en mock; URL del archivo con backend. */
  imagen?: string
  /** Indicaciones a cocina que no cambian insumos ni precio: «sin sal», «bien cocido». */
  notasRapidas?: string[]
  /** Locales donde no se ofrece aunque su categoría sí. El precio por local va en la lista. */
  noOfrecidoEn?: string[]
}

// ── Lista de precios (D-010) ─────────────────────────────────────────────────

/**
 * Lo que se vende y se cobra con código propio. El producto de carta con
 * presentaciones solo las agrupa; los adicionales con recargo también se venden.
 */
export type TipoVendible = 'producto' | 'presentacion' | 'adicional' | 'combo'

export interface ProductoVendible {
  /** Clave estable: p:<producto>, v:<presentación>, m:<adicional>, c:<combo>. */
  id: string
  codigo: string
  nombre: string
  tipo: TipoVendible
  productoId?: string
  categoriaId?: string
  /** Precio que se define en la carta; lo toma la lista cuando no tiene uno propio. */
  precioReferencia: number
  activo: boolean
}

export type TipoLista = 'base' | 'temporada'

/** Descuento en una línea de la lista, solo dentro de su vigencia (fechas AAAA-MM-DD). */
export interface DescuentoLinea {
  porcentaje: number
  desde: string
  hasta: string
}

export interface PrecioLista {
  vendibleId: string
  precio?: number
  descuento?: DescuentoLinea
}

/**
 * Lista de precios de un local para uno o varios canales. Hay una base por
 * local y canal; las de temporada la reemplazan en su vigencia sin solaparse.
 * Una lista derivada toma los precios de otra con un ajuste en %.
 */
export interface ListaPrecios {
  id: string
  codigo: string
  nombre: string
  tipo: TipoLista
  localId: string
  canalIds: string[]
  derivadaDe?: string
  ajustePorcentaje?: number
  /** Sin valor usa lo configurado para la empresa en Impuestos. */
  igvIncluido?: boolean
  desde?: string
  hasta?: string
  precios: PrecioLista[]
  activa: boolean
}

export type NuevaListaPrecios = Omit<ListaPrecios, 'id'>

export type OrigenPrecio = 'lista' | 'derivada' | 'base' | 'referencia'

export interface PrecioVigente {
  vendibleId: string
  listaId?: string
  listaNombre?: string
  origen: OrigenPrecio
  precioLista: number
  descuentoPorcentaje: number
  /** Lo que se cobra: precio de lista menos descuento. */
  precio: number
  igvIncluido: boolean
  tasaIgv: number
  valorVenta: number
  igv: number
}

export interface RepartoCombo {
  vendibleId: string
  nombre: string
  precioVigente: number
  asignado: number
}

export type TipoCombo = 'combo' | 'menuDia'

/**
 * Parte de un combo o menú. Con una sola opción es fija («Chicha morada»);
 * con varias, el cliente elige una («Entrada: causa o tequeños»).
 */
export interface GrupoCombo {
  id: string
  nombre: string
  opciones: string[]
}

export interface Combo {
  id: string
  codigo?: string
  tipo: TipoCombo
  nombre: string
  descripcion?: string
  /** Precio final del combo completo. */
  precio: number
  imagen?: string
  grupos: GrupoCombo[]
  /** Días en que se ofrece. Vacío = todos. */
  dias: DiaSemana[]
  activo: boolean
}

// ── Inventario ───────────────────────────────────────────────────────────────

export type UnidadMedida = 'kg' | 'g' | 'l' | 'ml' | 'unidad' | 'paquete'

/**
 * Almacén del local (D-009): uno por local y es lo que conoce Inventarios del
 * ERP. Dentro, la vertical organiza la mercadería en zonas.
 */
export interface Almacen {
  id: string
  nombre: string
  localId: string
  activo: boolean
}

/** Espacio del restaurante dentro del almacén: cámara de frío, barra, despensa. */
export interface Zona {
  id: string
  nombre: string
  localId: string
  /** → Almacen del local. */
  almacenId: string
  descripcion?: string
  activo: boolean
}

/**
 * Agrupa locales por concepto de negocio (D-008): cevicherías, hamburgueserías.
 * Opcional; un local pertenece como mucho a una cadena.
 */
export interface Cadena {
  id: string
  nombre: string
  localIds: string[]
  activo: boolean
}

/** Qué usuarios configuran cada cadena (acceso de la vertical). Sin registros: los administradores. */
export interface AccesoCadena {
  usuarioId: string
  cadenaId: string
}

// ── Integración con el ERP (D-009) ───────────────────────────────────────────

export type CapacidadIntegracion =
  'inventario' | 'compras' | 'precios' | 'ventas' | 'contabilidad' | 'asistencia'

/**
 * `autonomo`: la vertical registra y decide. `sincronizado`: registra y
 * homologa con el ERP, que decide en conflicto. `delegado`: opera el ERP.
 */
export type ModoIntegracion = 'autonomo' | 'sincronizado' | 'delegado'

export interface CambioModoIntegracion {
  capacidad: CapacidadIntegracion
  localId?: string
  anterior: ModoIntegracion
  nuevo: ModoIntegracion
  motivo: string
  autor: string
  fecha: string
}

/** Lo configura Karma desde su consola, no el cliente. */
export interface ConfigIntegracion {
  empresa: Partial<Record<CapacidadIntegracion, ModoIntegracion>>
  locales: Record<string, Partial<Record<CapacidadIntegracion, ModoIntegracion>>>
  historial: CambioModoIntegracion[]
}

/** Enlace entre un registro de la vertical y su par en el ERP. */
export interface VinculoErp {
  id: string
  entidad: 'almacen' | 'local' | 'insumo' | 'producto' | 'listaPrecios'
  idVertical: string
  idExterno: string
  estado: 'sincronizado' | 'pendiente' | 'error'
  version: number
  actualizado: string
}

export interface Existencia {
  zonaId: string
  cantidad: number
}

export type CategoriaInsumo =
  | 'carnes'
  | 'pescados'
  | 'verduras'
  | 'abarrotes'
  | 'lacteos'
  | 'bebidas'
  | 'descartables'
  | 'preparaciones'

/**
 * Cómo llega el insumo desde lo que compra el ERP ([D-004](../../docs/guia/decisiones.md)):
 *
 * - `directa`: un factor fijo convierte la unidad de compra en unidad de uso
 *   (1 caja x12 → 12 u.). Se aplica sola al recepcionar.
 * - `transformacion`: hace falta procesar el artículo antes de usarlo
 *   (10 kg de pescado → 6 kg de filete + 1.5 kg de cabeza + merma).
 * - `ambos`: se compra y también se produce (salsa comprada cuando no da el tiempo).
 */
export type TipoAbastecimiento = 'directa' | 'transformacion' | 'ambos'

/**
 * Artículo del ERP que abastece a un insumo. Varios artículos vinculados al
 * mismo insumo son sus **alternos**: sirven indistintamente para reponerlo.
 */
export interface VinculoArticulo {
  /** → Articulo. */
  articuloId: string
  /**
   * Unidades de uso del insumo que rinde una unidad de compra del artículo.
   * Un saco de 50 kg de papa con el insumo en kg tiene factor 50.
   */
  factor: number
  /** El artículo que se propone al pedir. Exactamente uno por insumo. */
  porDefecto: boolean
  /** Al recepcionarlo queda «por procesar»: hay que transformarlo antes de usarlo. */
  procesar?: boolean
}

export interface Insumo {
  id: string
  nombre: string
  /** Unidad de uso, la de la receta. La de compra la pone el artículo. */
  unidad: UnidadMedida
  categoria: CategoriaInsumo
  /** Stock total: suma de las existencias de todas las zonas. */
  stock: number
  existencias: Existencia[]
  /** Umbral por debajo del cual el insumo se marca como bajo. */
  stockMinimo: number
  /** Costo promedio ponderado, sin IGV. En las salidas de una transformación, calculado. */
  costoUnitario: number
  abastecimiento: TipoAbastecimiento
  /** Artículos del ERP que lo abastecen. Vacío: aún no se compra. */
  articulos: VinculoArticulo[]
  /** Parámetros fijados en el propio insumo; el resto se hereda. */
  parametros?: Partial<ParametrosAbastecimiento>
  /** Alérgenos que aporta: la receta los suma desde sus insumos. */
  alergenos?: Alergeno[]
  /** Rendimiento % al acondicionar (pelar, limpiar). Solo con el parámetro activo. */
  rendimientoPorcentaje?: number
  /** Días que dura lo producido desde que se elabora. Sin valor: se indica en cada parte. */
  vidaUtilDias?: number
  /** Quién validó la vida útil (modo «validada»); vacío en modo simple. */
  vidaUtilAprobadaPor?: string
  activo: boolean
}

// ── Transformación ───────────────────────────────────────────────────────────

/**
 * Lo que sale de una transformación: otro insumo (filete, salsa) o la merma
 * esperada del proceso (cáscara, hueso, evaporación).
 */
export interface SalidaTransformacion {
  id: string
  tipo: 'insumo' | 'merma'
  /** → Insumo. Sin valor cuando la salida es merma. */
  insumoId?: string
  /** Cantidad esperada, en la unidad del insumo de salida. */
  cantidad: number
  /**
   * Porcentaje del costo de las entradas que absorbe esta salida. La merma no
   * absorbe costo: lo reparten las demás, que deben sumar 100.
   */
  reparto: number
  descripcion?: string
}

/**
 * Receta de proceso: qué entra y qué sale. Cubre tanto el **despiece**
 * (1 entrada, varias salidas) como la **preparación** o subreceta
 * (varias entradas, una salida). El registro de lo que salió realmente
 * llega en F4.5; aquí se define lo esperado.
 */
export interface Transformacion {
  id: string
  nombre: string
  /** Insumos que se consumen, en su unidad de uso. */
  entradas: IngredienteReceta[]
  salidas: SalidaTransformacion[]
  activo: boolean
}

// ── Parámetros de abastecimiento ─────────────────────────────────────────────

/**
 * Cómo se controla un insumo al recepcionarlo y al guardarlo. Se fija en
 * cualquier nivel y el más específico gana ([D-004](../../docs/guia/decisiones.md)).
 */
export interface ParametrosAbastecimiento {
  /** Exige lote al recepcionar y lo arrastra en el stock detallado. */
  controlaLote: boolean
  /** Exige fecha de vencimiento en el lote. */
  controlaVencimiento: boolean
  /** Propone primero el lote que vence antes (First Expired, First Out). */
  fefo: boolean
  /** Días antes del vencimiento en que se avisa. */
  diasAlerta: number
  /** Impide sacar stock de un lote vencido. */
  bloquearVencidos: boolean
  /** Exige ubicación al recepcionar y al mover. */
  controlaUbicacion: boolean
  /** Exige un número de serie por cada unidad recibida (balones de gas, botellas de licor). */
  controlaSerie: boolean
  /**
   * `total`: a ciegas, todo lo pendiente o nada, sin editar cantidades.
   * `detalle`: se cuenta y se puede recibir menos de lo pedido. `ambos`: se elige al recibir.
   */
  tipoRecepcion: 'total' | 'detalle' | 'ambos'
}

/** Del más general al más específico: el último que fije un valor manda. */
export type NivelParametros = 'empresa' | 'cadena' | 'local' | 'zona' | 'categoria' | 'insumo'

/** Valores fijados en un nivel. Lo que no se fija se hereda del nivel anterior. */
export interface AjusteParametros {
  id: string
  nivel: NivelParametros
  /** `cadenaId`, `localId`, `zonaId`, `CategoriaInsumo` o `insumoId`. Sin valor en `empresa`. */
  referencia?: string
  valores: Partial<ParametrosAbastecimiento>
}

/** Cada parámetro con el nivel del que acabó saliendo, para explicarlo en pantalla. */
export type ParametrosResueltos = {
  [K in keyof ParametrosAbastecimiento]: {
    valor: ParametrosAbastecimiento[K]
    nivel: NivelParametros
  }
}

// ── Ubicaciones, lotes y stock detallado ─────────────────────────────────────

/** Dónde se guarda físicamente dentro de una zona. */
export interface Ubicacion {
  id: string
  zonaId: string
  pasillo: string
  estante: string
  fila: string
  columna: string
  /** Ubicación que propone la recepción. Como mucho una por zona. */
  porDefecto: boolean
  activo: boolean
}

/** Lote de un insumo. Si el ERP lo envía se respeta; si no, lo crea el local. */
export interface Lote {
  id: string
  insumoId: string
  /** Código del proveedor o del ERP; único por insumo. */
  codigo: string
  /** `YYYY-MM-DD`. Obligatorio si el insumo controla vencimiento. */
  vencimiento?: string
  /** Fecha de entrada, ISO 8601. */
  recepcion: string
  /** De dónde salió: una compra recepcionada o una parte de producción. */
  origen?: 'compra' | 'produccion'
  /** N.° de recepción o de parte que lo creó. */
  referencia?: string
}

/**
 * Stock detallado: insumo × zona × lote × ubicación. Solo existe para los
 * insumos que controlan lote o ubicación; lote y ubicación son independientes.
 * La suma por insumo y zona debe cuadrar con el stock principal.
 */
export interface StockDetalle {
  id: string
  insumoId: string
  zonaId: string
  loteId?: string
  ubicacionId?: string
  cantidad: number
}

export type TipoMovimiento =
  | 'entrada'
  | 'salida'
  | 'merma'
  | 'ajuste'
  | 'trasladoSalida'
  | 'trasladoEntrada'
  | 'produccion'
  | 'consumoProduccion'

export interface Movimiento {
  id: string
  insumoId: string
  zonaId: string
  tipo: TipoMovimiento
  /** Siempre positiva: el tipo determina el signo aplicado al stock. */
  cantidad: number
  /** Costo unitario de la entrada (compras); en el resto, el costo vigente. */
  costoUnitario?: number
  motivo?: string
  /** Documento que origina el movimiento: OC-000012, TOMA-0003, TR-… */
  referencia?: string
  usuarioId: string
  /** ISO 8601. */
  fecha: string
}

// ── Compras ──────────────────────────────────────────────────────────────────

/** Marca comercial de un artículo (maestro del ERP). */
export interface Marca {
  id: string
  nombre: string
  activo: boolean
}

/** Lo que el ERP compra: con su marca, su unidad de compra y su proveedor habitual. */
export interface Articulo {
  id: string
  /** Código del artículo en el ERP. */
  codigo: string
  nombre: string
  marcaId?: string
  /** Cómo se compra: saco 50 kg, caja x24, kg. */
  unidadCompra: string
  proveedorId?: string
  activo: boolean
}

/** Proveedor (maestro global del ERP). */
export interface Proveedor {
  id: string
  razonSocial: string
  ruc: string
  contacto?: string
  telefono?: string
  email?: string
  /** 0 = pago al contado. */
  diasCredito: number
  activo: boolean
}

// ── Solicitudes y requerimientos de compra (F4.4) ────────────────────────────

export type EstadoSolicitud = 'borrador' | 'enviada' | 'atendida' | 'rechazada'

/** Lo que pide un área, en insumos. La marca es una preferencia, no un artículo. */
export interface LineaSolicitud {
  id: string
  insumoId: string
  /** En la unidad de uso del insumo. */
  cantidad: number
  /** Solo marcas de los artículos vinculados al insumo. */
  marcaId?: string
  nota?: string
}

export interface SolicitudCompra {
  id: string
  /** Correlativo legible: SOL-000123. */
  numero: string
  localId: string
  areaId: string
  estado: EstadoSolicitud
  /** ISO 8601. */
  fecha: string
  usuarioId: string
  nota?: string
  lineas: LineaSolicitud[]
  /** Requerimiento que la consolidó. Mientras esté en borrador, la reserva. */
  requerimientoId?: string
  motivoRechazo?: string
}

/**
 * Estados del requerimiento. La vertical lo lleva hasta `enviado`; aprobar,
 * convertir en OC y despachar lo decide el ERP; `recepcionado` llega con F4.5.
 */
export type EstadoRequerimiento =
  'borrador' | 'enviado' | 'aprobado' | 'convertido' | 'despachado' | 'recepcionado' | 'anulado'

/** Una línea por artículo: la traducción de insumos a lo que compra el ERP. */
export interface LineaRequerimiento {
  id: string
  insumoId: string
  articuloId: string
  /** En la unidad de compra del artículo (sacos, cajas). */
  cantidad: number
  /** Lo que se pidió en unidad de uso, antes de redondear a unidades de compra. */
  cantidadInsumo: number
  /** Sugerido desde el proveedor habitual del artículo; se puede cambiar. */
  proveedorId?: string
  /** Líneas de solicitud consolidadas aquí. Vacío: línea creada directamente. */
  origen: { solicitudId: string; lineaId: string }[]
  /** El ERP avisa que el artículo no se puede comprar; se reemplaza por un alterno. */
  noDisponible?: boolean
  /** Artículo original cuando se reemplazó por un alterno. */
  reemplazoDe?: string
  /** Cuánto convirtió el ERP en orden de compra. */
  cantidadConvertida?: number
  /** Precio neto (sin IGV) por unidad de compra que fija la OC del ERP. */
  precioNeto?: number
  /** Unidades de compra ya recepcionadas contra esta línea. */
  cantidadRecibida?: number
}

export interface EventoRequerimiento {
  estado: EstadoRequerimiento
  fecha: string
  /** Usuario de la vertical, o «ERP» cuando el cambio llega de allí. */
  autor: string
  nota?: string
}

export interface RequerimientoCompra {
  id: string
  /** Correlativo legible: REQ-000045. */
  numero: string
  localId: string
  estado: EstadoRequerimiento
  fecha: string
  usuarioId: string
  nota?: string
  lineas: LineaRequerimiento[]
  /** N.° de orden de compra que asigna el ERP al convertir. */
  ordenCompra?: string
  historial: EventoRequerimiento[]
}

// ── Recepción y producción (F4.5) ────────────────────────────────────────────

/**
 * Una parte de lo recibido: con lote, ubicación o series cuando el insumo los
 * controla. Una línea puede repartirse en varias partes (dos lotes, dos racks).
 */
export interface ParteRecepcion {
  /** En la unidad del insumo. Con serie, igual al número de series. */
  cantidad: number
  loteCodigo?: string
  /** `YYYY-MM-DD`. */
  vencimiento?: string
  ubicacionId?: string
  /** Una por unidad del insumo, cuando controla serie. */
  series?: string[]
}

/**
 * `total`: a ciegas, se recibe todo lo pendiente tal cual o no se recibe nada.
 * `detalle`: se cuenta y se puede recibir menos de lo pedido.
 */
export type ModoRecepcion = 'total' | 'detalle'

export interface LineaRecepcion {
  id: string
  insumoId: string
  articuloId?: string
  /** Línea del requerimiento que se recibe. Sin valor: ingreso sin OC. */
  lineaRequerimientoId?: string
  /** Unidades de compra recibidas (sacos, cajas). */
  cantidadCompra?: number
  /** Unidades de compra pendientes al recibir: la diferencia con lo recibido es el faltante. */
  cantidadEsperada?: number
  /** Unidades del insumo que rinde cada unidad de compra. */
  factor: number
  /** Costo neto por unidad del insumo. */
  costoUnitario: number
  modo: ModoRecepcion
  partes: ParteRecepcion[]
  /** Quedó pendiente de transformar. */
  porProcesar: boolean
}

export type TipoComprobanteIngreso = 'factura' | 'boleta' | 'ticket' | 'recibo'

export interface ComprobanteIngreso {
  tipo: TipoComprobanteIngreso
  serie: string
  numero: string
  /** Total del comprobante con impuestos, en soles. */
  monto: number
  /** Proveedor del ERP; sin valor, proveedor ocasional (mercado). */
  proveedorId?: string
  proveedorOcasional?: string
}

export type EstadoRecepcion = 'registrada' | 'rechazada' | 'pendienteRegularizar' | 'regularizada'

export interface Recepcion {
  id: string
  /** REC-000001. */
  numero: string
  localId: string
  zonaId: string
  requerimientoId?: string
  ordenCompra?: string
  /** Solo en un ingreso sin OC. */
  comprobante?: ComprobanteIngreso
  motivo?: string
  estado: EstadoRecepcion
  /** Contra OC: total (todo o nada) o a detalle (contado). */
  modo?: ModoRecepcion
  /** Por qué se rechazó una entrega que se recibía total. */
  motivoRechazo?: string
  fecha: string
  usuarioId: string
  lineas: LineaRecepcion[]
  regularizadaPor?: string
}

/** Lo recepcionado que todavía hay que transformar (pescado entero por despiezar). */
export interface PorProcesar {
  id: string
  recepcionId: string
  insumoId: string
  zonaId: string
  cantidad: number
  pendiente: number
  fecha: string
}

export type EstadoParte = 'enProceso' | 'terminada' | 'rechazada'

export interface EntradaParte {
  insumoId: string
  esperada: number
  real: number
}

export interface SalidaParte {
  /** → SalidaTransformacion.id */
  salidaId: string
  tipo: 'insumo' | 'merma'
  insumoId?: string
  esperada: number
  real: number
  /** Lote creado para lo producido, si el insumo controla lote. */
  loteId?: string
}

/** Registro real de una transformación: lo que entró, lo que salió y por qué difiere. */
export interface ParteProduccion {
  id: string
  /** PP-000001. */
  numero: string
  localId: string
  zonaId: string
  transformacionId: string
  /** Tandas de la receta: 2 = el doble de lo definido. */
  factor: number
  estado: EstadoParte
  entradas: EntradaParte[]
  salidas: SalidaParte[]
  /** Diferencia entre entrada y salidas enviada a merma, con su motivo. */
  mermaAdicional?: number
  motivoDiferencia?: string
  motivoRechazo?: string
  /** `YYYY-MM-DD` de lo producido. */
  vencimiento?: string
  /** Costo real de las entradas, en soles, al terminar. */
  costoReal?: number
  responsableId: string
  fecha: string
  terminadaEn?: string
}

/** Valores de la configuración de la vertical: base de la cadena y excepciones por local. */
/** Configuración de la vertical: base de la empresa, excepciones por cadena y por local. */
export interface ValoresConfiguracion {
  vertical: Record<string, string | number | boolean>
  cadenas: Record<string, Record<string, string | number | boolean>>
  locales: Record<string, Record<string, string | number | boolean>>
}

export type NuevaSolicitud = Pick<SolicitudCompra, 'localId' | 'areaId' | 'nota' | 'lineas'>
export type NuevoRequerimiento = Pick<RequerimientoCompra, 'localId' | 'nota' | 'lineas'>

export interface IngredienteReceta {
  insumoId: string
  cantidad: number
}

// ── Receta estandarizada (D-007) ─────────────────────────────────────────────

/** Neta: lo que queda en el plato. Bruta: lo que sale del almacén. */
export type TipoCantidad = 'neta' | 'bruta'

/**
 * Línea de receta. Un consumible (táper, bolsa, servilleta) suma al costo
 * variable y puede aplicar solo en ciertos canales.
 */
export interface LineaReceta {
  id: string
  tipo: 'ingrediente' | 'consumible'
  insumoId: string
  cantidad: number
  /** Unidad de uso: convertible con la del insumo solo en la misma dimensión. */
  unidad: UnidadMedida
  /** Solo con «cantidad bruta o neta» activo. Sin valor: bruta. */
  cantidadTipo?: TipoCantidad
  /** Consumible: canales donde aplica. Vacío: todos. */
  canalIds?: string[]
}

export interface PasoFicha {
  id: string
  descripcion: string
  tiempoMin?: number
  temperaturaC?: number
  equipo?: string
}

/** Ficha técnica (opcional por configuración). */
export interface FichaTecnica {
  /** Porciones que rinde la receta tal como está escrita. */
  porciones?: number
  pasos: PasoFicha[]
  conservacion?: string
  /** Data URL en mock. */
  fotoEmplatado?: string
  /** Variación de peso aceptada al emplatar, en %. */
  toleranciaPesoPorcentaje?: number
}

export type EstadoVersion = 'borrador' | 'aprobada'

export interface VersionReceta {
  id: string
  numero: number
  /** Con aprobación activa, un borrador no rige aunque llegue su fecha. Sin valor: aprobada. */
  estado?: EstadoVersion
  aprobadaPor?: string
  aprobada?: string
  ficha?: FichaTecnica
  /** AAAA-MM-DD. Manda la última versión que ya empezó. */
  vigenteDesde: string
  lineas: LineaReceta[]
  nota?: string
  autor: string
  creada: string
  /** Costo unitario de cada insumo al guardar: detecta costos desactualizados. */
  costosAlGuardar: Record<string, number>
}

/** Receta de un producto vendible: producto sin presentaciones o una presentación. */
export interface RecetaEstandar {
  id: string
  /** p:<producto> o v:<presentación>, igual que en la lista de precios. */
  vendibleId: string
  /** Objetivo de food cost propio de la presentación, en %. */
  foodCostObjetivo?: number
  /** Reventa: se vende tal como se compra y su receta es 1 unidad de este insumo. */
  reventaInsumoId?: string
  versiones: VersionReceta[]
}

export type EstadoCosto = 'completo' | 'parcial' | 'desactualizado' | 'sinReceta'
export type ClaseAbc = 'A' | 'B' | 'C'

export interface CostoLinea {
  lineaId: string
  insumoId: string
  nombre: string
  tipo: LineaReceta['tipo']
  /** Cantidad en la unidad del insumo, ajustada por rendimiento. */
  cantidadInsumo: number
  costo: number
  sinCosto: boolean
  desactualizado: boolean
  /** % del costo de ingredientes. Consumibles: 0. */
  participacion: number
  clase?: ClaseAbc
}

export interface CostoReceta {
  vendibleId: string
  estado: EstadoCosto
  version?: number
  lineas: CostoLinea[]
  costoIngredientes: number
  costoConsumibles: number
  /** Precio neto (sin IGV) de la lista vigente. */
  precioNeto: number
  precioConIgv: number
  comision: number
  foodCost: number | null
  /** Precio neto − ingredientes − consumibles − comisión del canal. */
  margenContribucion: number
  objetivo: number
  origenObjetivo: 'presentacion' | 'categoria' | 'configuracion'
}

// ── Utilidades de API ────────────────────────────────────────────────────────

/** Payload de creación: sin id (lo asigna el backend). */
export type NuevoSalon = Omit<Salon, 'id'>
export type NuevaMesa = Omit<Mesa, 'id'>
export type NuevoCombo = Omit<Combo, 'id'>
export type NuevaZona = Omit<Zona, 'id'>
export type NuevaCadena = Omit<Cadena, 'id'>

export type NuevaCategoria = Omit<Categoria, 'id'>
export type NuevoProducto = Omit<Producto, 'id'>
/** Stock y existencias no se editan desde la ficha: cambian con movimientos. */
export type NuevoInsumo = Omit<Insumo, 'id' | 'stock' | 'existencias'> & { stockInicial?: number }
export type NuevoUsuario = Omit<Usuario, 'id'>
/** Sin `zonaId` se usa la zona donde el insumo tiene más stock. */
export type NuevoMovimiento = Omit<Movimiento, 'id' | 'fecha' | 'zonaId'> & {
  zonaId?: string
}
export type NuevoLocal = Omit<Local, 'id'>
export type NuevoMedioPago = Omit<MedioPago, 'id'>
export type NuevoCanalVenta = Omit<CanalVenta, 'id'>
export type NuevaArea = Omit<Area, 'id'>
export type NuevaImpresora = Omit<Impresora, 'id'>
export type NuevoMotivo = Omit<Motivo, 'id'>
export type NuevaSerie = Omit<SerieComprobante, 'id'>
export type NuevaUbicacion = Omit<Ubicacion, 'id'>
export type NuevaTransformacion = Omit<Transformacion, 'id'>
export type NuevoLote = Omit<Lote, 'id' | 'recepcion'> & { recepcion?: string }

export interface Paginado<T> {
  items: T[]
  total: number
  pagina: number
  porPagina: number
}

export type DireccionOrden = 'asc' | 'desc'

export interface Orden {
  campo: string
  direccion: DireccionOrden
}

/**
 * Parámetros de listado que entiende cualquier servicio paginado.
 * Se traducen 1:1 a query string cuando el servicio pase a HTTP:
 * `?buscar=&orden=nombre:asc&pagina=1&porPagina=20&estado=activo`.
 */
export interface Consulta {
  buscar?: string
  orden?: Orden
  pagina?: number
  porPagina?: number
  /** Igualdad exacta por campo; `undefined` o `''` no filtra. */
  filtros?: Record<string, string | number | boolean | undefined>
}

// ── Empresa y locales ────────────────────────────────────────────────────────

export interface Empresa {
  /** 11 dígitos con dígito verificador válido. */
  ruc: string
  razonSocial: string
  nombreComercial: string
  direccionFiscal: string
  telefono?: string
  email?: string
  /** Data URL en mock; URL del archivo con backend. */
  logo?: string
  moneda: 'PEN'
  zonaHoraria: string
}

/** 0 = lunes … 6 = domingo. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface HorarioDia {
  dia: DiaSemana
  abierto: boolean
  /** `HH:mm`. Si `cierre` es menor que `apertura`, el turno cruza la medianoche. */
  apertura: string
  cierre: string
}

export interface Local {
  id: string
  nombre: string
  direccion: string
  distrito: string
  telefono?: string
  /** Código de establecimiento anexo ante SUNAT: `0000` es el domicilio fiscal. */
  codigoEstablecimiento: string
  horario: HorarioDia[]
  activo: boolean
}

// ── Configuración comercial ──────────────────────────────────────────────────

export interface ConfigImpuestos {
  /** Porcentaje de IGV (18 general; 10 para restaurantes MYPE acogidos). */
  igvPorcentaje: number
  /** `true`: los precios de la carta ya incluyen IGV. */
  preciosIncluyenIgv: boolean
  recargoConsumoActivo: boolean
  /** Máximo legal: 13 %. */
  recargoConsumoPorcentaje: number
  /** Impuesto a las bolsas de plástico, en soles por unidad. */
  icbperMonto: number
}

export type TipoMedioPago = 'efectivo' | 'tarjeta' | 'billetera' | 'transferencia' | 'credito'

export interface MedioPago {
  id: string
  nombre: string
  tipo: TipoMedioPago
  /** Pide número de operación o voucher al cobrar. */
  requiereReferencia: boolean
  comisionPorcentaje: number
  orden: number
  activo: boolean
}

/**
 * Modalidad de atención: cómo se atiende un pedido del canal. Es una lista
 * cerrada porque cada modalidad corresponde a un flujo de operación
 * programado (mesa, mostrador, reparto, pedido de app). Ver docs/guia/decisiones.md.
 */
export type TipoCanal = 'salon' | 'llevar' | 'delivery' | 'plataforma'

export interface CanalVenta {
  id: string
  nombre: string
  tipo: TipoCanal
  /** Se suma el recargo al consumo configurado en Impuestos. */
  aplicaRecargoConsumo: boolean
  /** Comisión que cobra el canal (apps de delivery), en %. */
  comisionPorcentaje: number
  activo: boolean
}

/** Qué productos recibe un área: todos, o los de ciertas categorías y productos. */
export type ModoComanda = 'todos' | 'seleccionados'

export interface ComandaArea {
  modo: ModoComanda
  categoriaIds: string[]
  /** Productos sueltos además de los de sus categorías. */
  productoIds: string[]
}

/**
 * Área del local (D-004): cocina caliente, barra, recepción… Maestro
 * configurable; puede haber varias del mismo tipo, por piso o sala.
 */
export interface Area {
  id: string
  nombre: string
  localId: string
  /** Salón donde está el área. Sin valor: fuera de los salones (recepción, zona). */
  salonId?: string
  /** Impresora donde salen sus comandas. */
  impresoraId?: string
  /** Recepción o zona no reciben comandas: solo solicitan. */
  recibeComandas: boolean
  comanda: ComandaArea
  activo: boolean
}

export type UsoImpresora = 'comandas' | 'precuentas' | 'comprobantes'

export interface Impresora {
  id: string
  nombre: string
  localId: string
  uso: UsoImpresora
  ancho: '58mm' | '80mm'
  conexion: 'red' | 'usb'
  /** Obligatoria si la conexión es de red. */
  direccionIp?: string
  activo: boolean
}

export type TipoMotivo = 'anulacion' | 'descuento' | 'cortesia'

export interface Motivo {
  id: string
  tipo: TipoMotivo
  descripcion: string
  /** Exige la aprobación de un administrador al usarlo. */
  requiereAutorizacion: boolean
  activo: boolean
}

export type TipoComprobante = 'boleta' | 'factura' | 'notaCredito' | 'notaVenta'

export interface SerieComprobante {
  id: string
  localId: string
  tipo: TipoComprobante
  /** Cuatro caracteres: B001, F001, BC01, NV01. */
  serie: string
  /** Último número emitido; el siguiente será `correlativo + 1`. */
  correlativo: number
  activo: boolean
}

export interface ApiError {
  mensaje: string
  campos?: Record<string, string>
}

// ── Configuración de la vertical ─────────────────────────────────────────────

/** A quién afecta un parámetro: a toda la cadena o a un local. */
export type AlcanceParametro = 'vertical' | 'local'

/** Parámetro que la vertical permite configurar. Cada fase añade los suyos. */
export interface DefinicionParametro {
  clave: string
  etiqueta: string
  descripcion?: string
  alcance: AlcanceParametro
  grupo: string
  tipo: 'booleano' | 'numero' | 'texto' | 'opcion'
  opciones?: { valor: string; etiqueta: string }[]
  porDefecto: string | number | boolean
}

/** Acción de la vertical que se concede a un rol del ERP o a un usuario. */
// ── Clientes y reservas (F6.1) ───────────────────────────────────────────────

export type TipoDocumento = 'dni' | 'ruc' | 'ce' | 'pasaporte'

/** Cliente del ERP: la vertical lo consulta y le agrega su ficha de sala. */
export interface Cliente {
  id: string
  tipoDocumento: TipoDocumento
  documento: string
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  distrito?: string
  activo: boolean
}

/** Lo que la sala sabe del cliente y el ERP no necesita saber. */
export interface FichaCliente {
  clienteId: string
  alergenos: Alergeno[]
  /** «Frecuente», «Celebra aniversario», «Prensa»… */
  etiquetas: string[]
  notas?: string
  salonPreferidoId?: string
}

export type EstadoReserva = 'pendiente' | 'confirmada' | 'sentada' | 'noShow' | 'cancelada'
export type CanalReserva = 'telefono' | 'web' | 'mostrador' | 'app'

export interface Reserva {
  id: string
  localId: string
  /** → Cliente del ERP. Sin valor: reserva a nombre de quien llamó. */
  clienteId?: string
  nombreContacto: string
  telefono?: string
  personas: number
  /** AAAA-MM-DD y HH:mm. */
  fecha: string
  hora: string
  duracionMin: number
  /** Mesas reservadas; su capacidad sumada debe alcanzar para las personas. */
  mesaIds: string[]
  canal: CanalReserva
  estado: EstadoReserva
  nota?: string
  creada: string
  usuarioId?: string
  /** Por qué se canceló o no vino. */
  motivo?: string
}

export type NuevaReserva = Omit<Reserva, 'id' | 'creada' | 'estado' | 'usuarioId' | 'motivo'>

export interface PermisoVertical {
  clave: string
  etiqueta: string
  modulo: string
  descripcion?: string
}

/**
 * Ajuste al permiso de una persona sobre lo que da su rol del ERP (F5):
 * `concedido` lo suma, y `false` lo quita aunque el rol lo tenga.
 */
export interface ExcepcionPermiso {
  usuarioId: string
  clave: string
  concedido: boolean
}

/**
 * Turno de trabajo de un local (F5). La vertical lo usa para saber quién
 * debería estar; las marcaciones son de la capacidad «asistencia».
 */
export interface Turno {
  id: string
  nombre: string
  localId: string
  /** `HH:mm`. Un turno que cruza medianoche tiene `hasta` menor que `desde`. */
  desde: string
  hasta: string
  dias: DiaSemana[]
  usuarioIds: string[]
  activo: boolean
}

export type NuevoTurno = Omit<Turno, 'id'>

export type ModuloAuditoria =
  | 'Permisos'
  | 'Turnos'
  | 'Integración'
  | 'Recetas'
  | 'Precios'
  | 'Compras'
  | 'Inventario'
  | 'Reservas'

/** Anotación de una acción sensible: quién, cuándo, qué y sobre qué (F5). */
export interface RegistroAuditoria {
  id: string
  /** ISO 8601. */
  fecha: string
  usuarioId?: string
  autor: string
  modulo: ModuloAuditoria
  accion: string
  detalle: string
  /** Local al que afecta, cuando aplica. */
  localId?: string
}
