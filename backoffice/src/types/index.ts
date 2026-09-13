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

/** Precio distinto al base para un canal (apps de delivery suelen ir más caras). */
export interface PrecioCanal {
  canalId: string
  precio: number
}

/**
 * Presentación alternativa de un producto (personal, fuente, media...).
 * `precio` es el precio FINAL de esa presentación, no un recargo sobre el base:
 * evita cálculos encadenados al cobrar.
 */
export interface Variante {
  id: string
  nombre: string
  precio: number
  activa: boolean
}

/** Opción concreta dentro de un grupo: «sin cebolla», «término medio». */
export interface Modificador {
  id: string
  nombre: string
  /** Recargo sobre el precio. 0 cuando la opción no cuesta. */
  recargo: number
  activo: boolean
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
  /** Estación que recibe la comanda del producto. */
  estacionId?: string
  /** Precios por canal. Un canal sin entrada usa el precio base. */
  preciosCanal: PrecioCanal[]
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

export interface Almacen {
  id: string
  nombre: string
  localId: string
  descripcion?: string
  activo: boolean
}

export interface Existencia {
  almacenId: string
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
 * Subreceta: un insumo que se elabora en cocina a partir de otros (salsa
 * huancaína, leche de tigre). Su costo sale de sus ingredientes.
 */
export interface Preparacion {
  /** Cantidad de la preparación que rinde la receta, en su unidad. */
  rendimiento: number
  ingredientes: IngredienteReceta[]
}

export interface Insumo {
  id: string
  nombre: string
  unidad: UnidadMedida
  categoria: CategoriaInsumo
  /** Stock total: suma de las existencias de todos los almacenes. */
  stock: number
  existencias: Existencia[]
  /** Umbral por debajo del cual el insumo se marca como bajo. */
  stockMinimo: number
  /** Costo promedio ponderado, sin IGV. */
  costoUnitario: number
  proveedorId?: string
  preparacion?: Preparacion
  activo: boolean
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
  almacenId: string
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

export interface LineaToma {
  insumoId: string
  /** Stock del sistema al abrir la toma. */
  teorico: number
  /** `null` mientras no se ha contado. */
  contado: number | null
}

export type EstadoToma = 'abierta' | 'aplicada' | 'anulada'

export interface TomaInventario {
  id: string
  numero: string
  almacenId: string
  estado: EstadoToma
  lineas: LineaToma[]
  notas?: string
  usuarioId: string
  /** ISO 8601. */
  fecha: string
  aplicadaEn?: string
}

// ── Compras ──────────────────────────────────────────────────────────────────

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

export type EstadoOrdenCompra = 'borrador' | 'emitida' | 'parcial' | 'recibida' | 'anulada'

export interface LineaOrdenCompra {
  insumoId: string
  cantidad: number
  /** Sin IGV. */
  costoUnitario: number
  recibido: number
}

export interface OrdenCompra {
  id: string
  numero: string
  proveedorId: string
  almacenId: string
  estado: EstadoOrdenCompra
  /** `YYYY-MM-DD`. */
  fechaEmision: string
  fechaEntrega?: string
  lineas: LineaOrdenCompra[]
  notas?: string
}

export interface IngredienteReceta {
  insumoId: string
  cantidad: number
}

/** Escandallo de un producto: qué insumos consume y en qué cantidad. */
export interface Receta {
  productoId: string
  ingredientes: IngredienteReceta[]
}

// ── Utilidades de API ────────────────────────────────────────────────────────

/** Payload de creación: sin id (lo asigna el backend). */
export type NuevoSalon = Omit<Salon, 'id'>
export type NuevaMesa = Omit<Mesa, 'id'>
export type NuevoCombo = Omit<Combo, 'id'>
export type NuevoAlmacen = Omit<Almacen, 'id'>
export type NuevoProveedor = Omit<Proveedor, 'id'>
export type NuevaOrdenCompra = Omit<OrdenCompra, 'id' | 'numero' | 'estado'>
export type NuevaCategoria = Omit<Categoria, 'id'>
export type NuevoProducto = Omit<Producto, 'id'>
/** Stock y existencias no se editan desde la ficha: cambian con movimientos. */
export type NuevoInsumo = Omit<Insumo, 'id' | 'stock' | 'existencias'> & { stockInicial?: number }
export type NuevoUsuario = Omit<Usuario, 'id'>
/** Sin `almacenId` se usa el almacén donde el insumo tiene más stock. */
export type NuevoMovimiento = Omit<Movimiento, 'id' | 'fecha' | 'almacenId'> & {
  almacenId?: string
}
export type NuevoLocal = Omit<Local, 'id'>
export type NuevoMedioPago = Omit<MedioPago, 'id'>
export type NuevoCanalVenta = Omit<CanalVenta, 'id'>
export type NuevaEstacion = Omit<EstacionProduccion, 'id'>
export type NuevaImpresora = Omit<Impresora, 'id'>
export type NuevoMotivo = Omit<Motivo, 'id'>
export type NuevaSerie = Omit<SerieComprobante, 'id'>

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

export interface EstacionProduccion {
  id: string
  nombre: string
  localId: string
  /** Impresora donde salen las comandas de esta estación. */
  impresoraId?: string
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
