/**
 * "Base de datos" en memoria + localStorage para el modo mock.
 *
 * Sustituible por completo: cuando llegue el backend real, los servicios dejan
 * de importar este módulo y esta carpeta se borra.
 */

import type {
  Zona,
  CanalVenta,
  CategoriaInsumo,
  Combo,
  Proveedor,
  Categoria,
  ConfigImpuestos,
  ListaPrecios,
  Empresa,
  Area,
  HorarioDia,
  Impresora,
  Insumo,
  Local,
  MedioPago,
  Motivo,
  SerieComprobante,
  Mesa,
  Movimiento,
  Producto,
  Cliente,
  ExcepcionPermiso,
  FichaCliente,
  Reserva,
  RecetaEstandar,
  RegistroAuditoria,
  Rol,
  Turno,
  Salon,
  Usuario,
  Articulo,
  Marca,
  Ubicacion,
  Lote,
  StockDetalle,
  Transformacion,
  AjusteParametros,
  VinculoArticulo,
  SolicitudCompra,
  RequerimientoCompra,
  Recepcion,
  PorProcesar,
  ParteProduccion,
  ValoresConfiguracion,
  Almacen,
  Cadena,
  AccesoZona,
  AccesoCadena,
  ConfigIntegracion,
  VinculoErp,
} from '@/types'
import { ilustracionCombo, imagenPlato } from './ilustraciones'
import { simularRed } from './red'

/**
 * La clave lleva versión: al cambiar la forma de los datos se sube el número y
 * los navegadores con la semilla anterior parten de cero en vez de romperse.
 */
const CLAVE = 'km.restaurante.mock.v29'

export interface Esquema {
  combos: Combo[]
  listasPrecios: ListaPrecios[]
  almacenes: Almacen[]
  zonas: Zona[]
  cadenas: Cadena[]
  accesosZona: AccesoZona[]
  accesosCadena: AccesoCadena[]
  integracion: ConfigIntegracion
  vinculosErp: VinculoErp[]
  proveedores: Proveedor[]
  marcas: Marca[]
  articulos: Articulo[]
  empresa: Empresa
  impuestos: ConfigImpuestos
  locales: Local[]
  mediosPago: MedioPago[]
  canales: CanalVenta[]
  areas: Area[]
  impresoras: Impresora[]
  motivos: Motivo[]
  series: SerieComprobante[]
  salones: Salon[]
  mesas: Mesa[]
  usuarios: Usuario[]
  categorias: Categoria[]
  productos: Producto[]
  insumos: Insumo[]
  movimientos: Movimiento[]
  recetasEstandar: RecetaEstandar[]
  permisosPorRol: Record<Rol, string[]>
  excepcionesPermiso: ExcepcionPermiso[]
  turnos: Turno[]
  clientes: Cliente[]
  fichasCliente: FichaCliente[]
  reservas: Reserva[]
  bitacora: RegistroAuditoria[]
  ubicaciones: Ubicacion[]
  lotes: Lote[]
  stockDetalle: StockDetalle[]
  transformaciones: Transformacion[]
  ajustesParametros: AjusteParametros[]
  solicitudes: SolicitudCompra[]
  requerimientos: RequerimientoCompra[]
  recepciones: Recepcion[]
  porProcesar: PorProcesar[]
  partesProduccion: ParteProduccion[]
  configuracion: ValoresConfiguracion
}

/** Horario semanal con el mismo turno todos los días, salvo los cerrados. */
function horarioSemanal(apertura: string, cierre: string, cerrados: number[] = []): HorarioDia[] {
  return ([0, 1, 2, 3, 4, 5, 6] as const).map((dia) => ({
    dia,
    abierto: !cerrados.includes(dia),
    apertura,
    cierre,
  }))
}

function semilla(): Esquema {
  const empresa: Empresa = {
    ruc: '20100070970',
    razonSocial: 'Karma Corp Restaurantes S.A.C.',
    nombreComercial: 'Mesa · Cocina Limeña',
    direccionFiscal: 'Av. José Larco 812, Miraflores, Lima',
    telefono: '01 445 2210',
    email: 'facturacion@kmrestaurante.pe',
    moneda: 'PEN',
    zonaHoraria: 'America/Lima',
  }

  const impuestos: ConfigImpuestos = {
    igvPorcentaje: 18,
    preciosIncluyenIgv: true,
    recargoConsumoActivo: true,
    recargoConsumoPorcentaje: 10,
    icbperMonto: 0.5,
  }

  const locales: Local[] = [
    {
      id: 'l1',
      nombre: 'Miraflores',
      direccion: 'Av. José Larco 812',
      distrito: 'Miraflores',
      telefono: '01 445 2210',
      codigoEstablecimiento: '0000',
      horario: horarioSemanal('12:00', '23:00'),
      activo: true,
    },
    {
      id: 'l2',
      nombre: 'San Isidro',
      direccion: 'Calle Las Begonias 475',
      distrito: 'San Isidro',
      telefono: '01 422 8930',
      codigoEstablecimiento: '0001',
      horario: horarioSemanal('12:00', '17:00', [6]),
      activo: true,
    },
    {
      id: 'l3',
      nombre: 'Barranco',
      direccion: 'Jr. Pedro de Osma 135',
      distrito: 'Barranco',
      codigoEstablecimiento: '0002',
      horario: horarioSemanal('19:00', '02:00', [0, 1]),
      activo: false,
    },
  ]

  const mediosPago: MedioPago[] = [
    {
      id: 'mp1',
      nombre: 'Efectivo',
      tipo: 'efectivo',
      requiereReferencia: false,
      comisionPorcentaje: 0,
      orden: 1,
      activo: true,
    },
    {
      id: 'mp2',
      nombre: 'Tarjeta Visa',
      tipo: 'tarjeta',
      requiereReferencia: true,
      comisionPorcentaje: 3.5,
      orden: 2,
      activo: true,
    },
    {
      id: 'mp3',
      nombre: 'Tarjeta Mastercard',
      tipo: 'tarjeta',
      requiereReferencia: true,
      comisionPorcentaje: 3.5,
      orden: 3,
      activo: true,
    },
    {
      id: 'mp4',
      nombre: 'Yape',
      tipo: 'billetera',
      requiereReferencia: true,
      comisionPorcentaje: 0,
      orden: 4,
      activo: true,
    },
    {
      id: 'mp5',
      nombre: 'Plin',
      tipo: 'billetera',
      requiereReferencia: true,
      comisionPorcentaje: 0,
      orden: 5,
      activo: true,
    },
    {
      id: 'mp6',
      nombre: 'Transferencia BCP',
      tipo: 'transferencia',
      requiereReferencia: true,
      comisionPorcentaje: 0,
      orden: 6,
      activo: false,
    },
    {
      id: 'mp7',
      nombre: 'Crédito empresas',
      tipo: 'credito',
      requiereReferencia: false,
      comisionPorcentaje: 0,
      orden: 7,
      activo: true,
    },
  ]

  const canales: CanalVenta[] = [
    {
      id: 'cv1',
      nombre: 'Salón',
      tipo: 'salon',
      comisionPorcentaje: 0,
      aplicaRecargoConsumo: true,
      activo: true,
    },
    {
      id: 'cv2',
      nombre: 'Para llevar',
      tipo: 'llevar',
      comisionPorcentaje: 0,
      aplicaRecargoConsumo: false,
      activo: true,
    },
    {
      id: 'cv3',
      nombre: 'Delivery propio',
      tipo: 'delivery',
      comisionPorcentaje: 0,
      aplicaRecargoConsumo: false,
      activo: true,
    },
    {
      id: 'cv4',
      nombre: 'Rappi',
      tipo: 'plataforma',
      comisionPorcentaje: 25,
      aplicaRecargoConsumo: false,
      activo: true,
    },
    {
      id: 'cv5',
      nombre: 'PedidosYa',
      tipo: 'plataforma',
      comisionPorcentaje: 22,
      aplicaRecargoConsumo: false,
      activo: false,
    },
  ]

  const impresoras: Impresora[] = [
    {
      id: 'im1',
      nombre: 'Cocina caliente',
      localId: 'l1',
      uso: 'comandas',
      ancho: '80mm',
      conexion: 'red',
      direccionIp: '192.168.1.50',
      activo: true,
    },
    {
      id: 'im2',
      nombre: 'Barra',
      localId: 'l1',
      uso: 'comandas',
      ancho: '58mm',
      conexion: 'red',
      direccionIp: '192.168.1.51',
      activo: true,
    },
    {
      id: 'im3',
      nombre: 'Caja principal',
      localId: 'l1',
      uso: 'comprobantes',
      ancho: '80mm',
      conexion: 'usb',
      activo: true,
    },
    {
      id: 'im4',
      nombre: 'Cocina San Isidro',
      localId: 'l2',
      uso: 'comandas',
      ancho: '80mm',
      conexion: 'red',
      direccionIp: '192.168.10.20',
      activo: true,
    },
  ]

  const areas: Area[] = [
    {
      id: 'ae1',
      nombre: 'Cocina caliente',
      localId: 'l1',
      salonId: 's1',
      impresoraId: 'im1',
      recibeComandas: true,
      comanda: {
        modo: 'seleccionados',
        categoriaIds: ['c1', 'c3', 'c4', 'c5', 'c7'],
        productoIds: [],
      },
      activo: true,
    },
    {
      id: 'ae2',
      nombre: 'Cocina fría (cebichería)',
      localId: 'l1',
      salonId: 's1',
      impresoraId: 'im1',
      recibeComandas: true,
      comanda: { modo: 'seleccionados', categoriaIds: ['c2'], productoIds: [] },
      activo: true,
    },
    {
      id: 'ae3',
      nombre: 'Barra',
      localId: 'l1',
      salonId: 's1',
      impresoraId: 'im2',
      recibeComandas: true,
      comanda: { modo: 'seleccionados', categoriaIds: ['c6'], productoIds: [] },
      activo: true,
    },
    {
      id: 'ae4',
      nombre: 'Recepción de mercadería',
      localId: 'l1',
      recibeComandas: false,
      comanda: { modo: 'seleccionados', categoriaIds: [], productoIds: [] },
      activo: true,
    },
    {
      id: 'ae5',
      nombre: 'Cocina',
      localId: 'l2',
      impresoraId: 'im4',
      recibeComandas: true,
      comanda: { modo: 'todos', categoriaIds: [], productoIds: [] },
      activo: true,
    },
  ]

  const motivos: Motivo[] = [
    {
      id: 'mo1',
      tipo: 'anulacion',
      descripcion: 'Error al tomar el pedido',
      requiereAutorizacion: false,
      activo: true,
    },
    {
      id: 'mo2',
      tipo: 'anulacion',
      descripcion: 'Cliente se retiró',
      requiereAutorizacion: true,
      activo: true,
    },
    {
      id: 'mo3',
      tipo: 'anulacion',
      descripcion: 'Producto agotado',
      requiereAutorizacion: false,
      activo: true,
    },
    {
      id: 'mo4',
      tipo: 'descuento',
      descripcion: 'Cliente frecuente',
      requiereAutorizacion: false,
      activo: true,
    },
    {
      id: 'mo5',
      tipo: 'descuento',
      descripcion: 'Demora en el servicio',
      requiereAutorizacion: true,
      activo: true,
    },
    {
      id: 'mo6',
      tipo: 'cortesia',
      descripcion: 'Cumpleaños',
      requiereAutorizacion: true,
      activo: true,
    },
    {
      id: 'mo7',
      tipo: 'cortesia',
      descripcion: 'Degustación de la casa',
      requiereAutorizacion: false,
      activo: false,
    },
  ]

  const series: SerieComprobante[] = [
    { id: 'sr1', localId: 'l1', tipo: 'boleta', serie: 'B001', correlativo: 18342, activo: true },
    { id: 'sr2', localId: 'l1', tipo: 'factura', serie: 'F001', correlativo: 2431, activo: true },
    { id: 'sr3', localId: 'l1', tipo: 'notaCredito', serie: 'BC01', correlativo: 57, activo: true },
    { id: 'sr4', localId: 'l1', tipo: 'notaVenta', serie: 'NV01', correlativo: 904, activo: true },
    { id: 'sr5', localId: 'l2', tipo: 'boleta', serie: 'B002', correlativo: 6120, activo: true },
    { id: 'sr6', localId: 'l2', tipo: 'factura', serie: 'F002', correlativo: 1188, activo: true },
  ]

  const usuarios: Usuario[] = [
    {
      id: 'u1',
      nombre: 'Brandon Ríos',
      email: 'admin@kmrestaurante.pe',
      rol: 'admin',
      activo: true,
      localIds: ['l1', 'l2', 'l3'],
      // Sin acceso a la Barra y solo consulta en San Isidro: muestra el filtro por permisos.
      almacenes: [
        { almacenId: 'am1', nivel: 'gestionar' },
        { almacenId: 'am2', nivel: 'ver' },
      ],
    },
    {
      id: 'u2',
      nombre: 'Lucía Paredes',
      email: 'lucia@kmrestaurante.pe',
      rol: 'mesero',
      activo: true,
      localIds: ['l1'],
    },
    {
      id: 'u3',
      nombre: 'Diego Salas',
      email: 'diego@kmrestaurante.pe',
      rol: 'mesero',
      activo: true,
      localIds: ['l1'],
    },
    {
      id: 'u4',
      nombre: 'Ana Quispe',
      email: 'ana@kmrestaurante.pe',
      rol: 'cajero',
      activo: true,
      localIds: ['l1', 'l2'],
    },
    {
      id: 'u5',
      nombre: 'Marco Tello',
      email: 'marco@kmrestaurante.pe',
      rol: 'cocinero',
      activo: false,
      localIds: ['l2'],
    },
    {
      id: 'u6',
      nombre: 'Rosa Huamán',
      email: 'rosa@kmrestaurante.pe',
      rol: 'cocinero',
      activo: true,
      localIds: ['l1'],
    },
  ]

  const salones: Salon[] = [
    {
      id: 's1',
      nombre: 'Salón principal',
      localId: 'l1',
      descripcion: 'Planta baja, junto a la barra',
      orden: 1,
      activo: true,
    },
    {
      id: 's2',
      nombre: 'Terraza',
      localId: 'l1',
      descripcion: 'Al aire libre, techada',
      orden: 2,
      activo: true,
    },
    {
      id: 's3',
      nombre: 'Segundo piso',
      localId: 'l1',
      descripcion: 'Eventos y grupos grandes',
      orden: 3,
      activo: true,
    },
    {
      id: 's4',
      nombre: 'Barra',
      localId: 'l1',
      descripcion: 'Atención rápida',
      orden: 4,
      activo: false,
    },
  ]

  const mesas: Mesa[] = [
    {
      id: 'm1',
      salonId: 's1',
      codigo: 'M-01',
      capacidad: 4,
      forma: 'cuadrada',
      estado: 'ocupada',
      meseroId: 'u2',
      posX: 12,
      posY: 15,
    },
    {
      id: 'm2',
      salonId: 's1',
      codigo: 'M-02',
      capacidad: 4,
      forma: 'cuadrada',
      estado: 'libre',
      posX: 38,
      posY: 15,
    },
    {
      id: 'm3',
      salonId: 's1',
      codigo: 'M-03',
      capacidad: 2,
      forma: 'redonda',
      estado: 'reservada',
      meseroId: 'u3',
      posX: 64,
      posY: 15,
    },
    {
      id: 'm4',
      salonId: 's1',
      codigo: 'M-04',
      capacidad: 6,
      forma: 'rectangular',
      estado: 'libre',
      posX: 12,
      posY: 48,
    },
    {
      id: 'm5',
      salonId: 's1',
      codigo: 'M-05',
      capacidad: 4,
      forma: 'cuadrada',
      estado: 'limpieza',
      posX: 38,
      posY: 48,
    },
    {
      id: 'm6',
      salonId: 's1',
      codigo: 'M-06',
      capacidad: 8,
      forma: 'rectangular',
      estado: 'ocupada',
      meseroId: 'u2',
      posX: 64,
      posY: 48,
    },
    {
      id: 'm7',
      salonId: 's2',
      codigo: 'T-01',
      capacidad: 2,
      forma: 'redonda',
      estado: 'libre',
      posX: 15,
      posY: 20,
    },
    {
      id: 'm8',
      salonId: 's2',
      codigo: 'T-02',
      capacidad: 2,
      forma: 'redonda',
      estado: 'ocupada',
      meseroId: 'u3',
      posX: 45,
      posY: 20,
    },
    {
      id: 'm9',
      salonId: 's2',
      codigo: 'T-03',
      capacidad: 4,
      forma: 'cuadrada',
      estado: 'libre',
      posX: 75,
      posY: 20,
    },
    {
      id: 'm10',
      salonId: 's2',
      codigo: 'T-04',
      capacidad: 4,
      forma: 'cuadrada',
      estado: 'reservada',
      posX: 45,
      posY: 60,
    },
    {
      id: 'm11',
      salonId: 's3',
      codigo: 'P-01',
      capacidad: 10,
      forma: 'rectangular',
      estado: 'libre',
      posX: 25,
      posY: 30,
    },
    {
      id: 'm12',
      salonId: 's3',
      codigo: 'P-02',
      capacidad: 10,
      forma: 'rectangular',
      estado: 'inactiva',
      posX: 65,
      posY: 30,
    },
  ]

  const categorias: Categoria[] = [
    { id: 'c1', nombre: 'Entradas', descripcion: 'Para empezar', orden: 1, activa: true },
    {
      id: 'c2',
      nombre: 'Cebiches y tiraditos',
      descripcion: 'Pescado del día',
      orden: 2,
      activa: true,
    },
    // «Fondos» es una sección: agrupa criollos y marinos en la carta.
    { id: 'c8', nombre: 'Fondos', orden: 3, activa: true, foodCostObjetivo: 33 },
    { id: 'c3', nombre: 'Fondos criollos', orden: 3, activa: true, seccionId: 'c8' },
    { id: 'c4', nombre: 'Fondos marinos', orden: 4, activa: true, seccionId: 'c8' },
    // Los postres no viajan bien: no se publican en apps de delivery.
    { id: 'c5', nombre: 'Postres', orden: 5, activa: true, canalIds: ['cv1', 'cv2', 'cv3'] },
    { id: 'c6', nombre: 'Bebidas', orden: 6, activa: true },
    {
      id: 'c7',
      nombre: 'Menú del día',
      descripcion: 'Solo de lunes a viernes al mediodía',
      orden: 7,
      activa: false,
      localIds: ['l1'],
      canalIds: ['cv1'],
    },
  ]

  /** Grupo reutilizado en varios fondos: el punto de la carne. */
  const puntoCarne = () => ({
    id: 'g-punto',
    nombre: 'Término',
    seleccionMinima: 1,
    seleccionMaxima: 1,
    modificadores: [
      { id: 'mo-jugoso', nombre: 'Jugoso', recargo: 0, activo: true },
      { id: 'mo-medio', nombre: 'Término medio', recargo: 0, activo: true },
      { id: 'mo-bien', nombre: 'Bien cocido', recargo: 0, activo: true },
    ],
  })

  const productosBase: Producto[] = [
    {
      id: 'p1',
      categoriaId: 'c1',
      nombre: 'Causa limeña',
      descripcion: 'Papa amarilla prensada con ají amarillo y relleno de pollo',
      precio: 24,
      disponible: true,
      tiempoPreparacionMin: 10,
      alergenos: ['huevo', 'aji'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p2',
      categoriaId: 'c1',
      nombre: 'Anticuchos de corazón',
      descripcion: 'Dos palos con papa dorada y choclo',
      precio: 28,
      disponible: true,
      tiempoPreparacionMin: 15,
      alergenos: ['aji'],
      variantes: [],
      gruposModificadores: [
        {
          id: 'g1',
          nombre: 'Acompañamiento',
          seleccionMinima: 1,
          seleccionMaxima: 2,
          modificadores: [
            { id: 'mo1', nombre: 'Papa dorada', recargo: 0, activo: true },
            { id: 'mo2', nombre: 'Choclo', recargo: 0, activo: true },
            { id: 'mo3', nombre: 'Yuca frita', recargo: 4, activo: true },
          ],
        },
      ],
    },
    {
      id: 'p3',
      categoriaId: 'c2',
      nombre: 'Cebiche clásico',
      descripcion: 'Pescado del día, leche de tigre, camote y choclo',
      precio: 42,
      disponible: true,
      tiempoPreparacionMin: 12,
      alergenos: ['pescado', 'aji'],
      variantes: [
        { id: 'v1', nombre: 'Personal', precio: 42, activa: true },
        { id: 'v2', nombre: 'Fuente', precio: 76, activa: true },
      ],
      gruposModificadores: [
        {
          id: 'g2',
          nombre: 'Nivel de ají',
          seleccionMinima: 1,
          seleccionMaxima: 1,
          modificadores: [
            { id: 'mo4', nombre: 'Sin ají', recargo: 0, activo: true },
            { id: 'mo5', nombre: 'Normal', recargo: 0, activo: true },
            { id: 'mo6', nombre: 'Bien picante', recargo: 0, activo: true },
          ],
        },
      ],
    },
    {
      id: 'p4',
      categoriaId: 'c2',
      nombre: 'Tiradito de lenguado',
      descripcion: 'Láminas finas en crema de ají amarillo',
      precio: 46,
      disponible: true,
      tiempoPreparacionMin: 12,
      alergenos: ['pescado', 'aji'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p5',
      categoriaId: 'c2',
      nombre: 'Cebiche mixto',
      descripcion: 'Pescado y mariscos',
      precio: 52,
      disponible: false,
      tiempoPreparacionMin: 14,
      alergenos: ['pescado', 'mariscos', 'aji'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p6',
      categoriaId: 'c3',
      nombre: 'Lomo saltado',
      descripcion: 'Lomo fino salteado al wok con papas fritas y arroz',
      precio: 48,
      disponible: true,
      tiempoPreparacionMin: 18,
      alergenos: ['soya', 'gluten'],
      variantes: [],
      gruposModificadores: [
        puntoCarne(),
        {
          id: 'g3',
          nombre: 'Extras',
          seleccionMinima: 0,
          seleccionMaxima: 3,
          modificadores: [
            { id: 'mo7', nombre: 'Huevo frito', recargo: 5, activo: true },
            { id: 'mo8', nombre: 'Porción extra de papas', recargo: 9, activo: true },
            { id: 'mo9', nombre: 'Sin cebolla', recargo: 0, activo: true },
          ],
        },
      ],
    },
    {
      id: 'p7',
      categoriaId: 'c3',
      nombre: 'Ají de gallina',
      descripcion: 'Con arroz blanco, papa y aceituna',
      precio: 38,
      disponible: true,
      tiempoPreparacionMin: 15,
      alergenos: ['lacteos', 'frutosSecos', 'aji', 'gluten'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p8',
      categoriaId: 'c3',
      nombre: 'Seco de res con frejoles',
      precio: 44,
      disponible: true,
      tiempoPreparacionMin: 20,
      alergenos: ['aji'],
      variantes: [],
      gruposModificadores: [puntoCarne()],
    },
    {
      id: 'p9',
      categoriaId: 'c4',
      nombre: 'Arroz con mariscos',
      precio: 54,
      disponible: true,
      tiempoPreparacionMin: 22,
      alergenos: ['mariscos', 'aji'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p10',
      categoriaId: 'c4',
      nombre: 'Chicharrón de calamar',
      descripcion: 'Con salsa criolla y limón',
      precio: 46,
      disponible: true,
      tiempoPreparacionMin: 16,
      alergenos: ['mariscos', 'gluten'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p11',
      categoriaId: 'c5',
      nombre: 'Suspiro limeño',
      precio: 18,
      disponible: true,
      tiempoPreparacionMin: 5,
      alergenos: ['lacteos', 'huevo'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p12',
      categoriaId: 'c5',
      nombre: 'Picarones',
      descripcion: 'Seis unidades con miel de chancaca',
      precio: 16,
      disponible: true,
      tiempoPreparacionMin: 12,
      alergenos: ['gluten'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p13',
      categoriaId: 'c6',
      nombre: 'Chicha morada',
      precio: 12,
      disponible: true,
      tiempoPreparacionMin: 2,
      alergenos: [],
      variantes: [
        { id: 'v3', nombre: 'Vaso', precio: 12, activa: true },
        { id: 'v4', nombre: 'Jarra 1 L', precio: 28, activa: true },
      ],
      gruposModificadores: [],
    },
    {
      id: 'p14',
      categoriaId: 'c6',
      nombre: 'Pisco sour',
      precio: 26,
      disponible: true,
      tiempoPreparacionMin: 5,
      alergenos: ['huevo'],
      variantes: [],
      gruposModificadores: [],
    },
    {
      id: 'p15',
      categoriaId: 'c6',
      nombre: 'Inca Kola 500 ml',
      precio: 8,
      disponible: true,
      tiempoPreparacionMin: 1,
      alergenos: [],
      variantes: [],
      gruposModificadores: [],
    },
  ]

  const insumosBase: Omit<Insumo, 'existencias' | 'categoria' | 'abastecimiento' | 'articulos'>[] =
    [
      {
        id: 'i1',
        nombre: 'Lomo fino de res',
        unidad: 'kg',
        stock: 8.4,
        stockMinimo: 10,
        costoUnitario: 52,
        activo: true,
      },
      {
        id: 'i2',
        nombre: 'Pescado del día (lenguado)',
        unidad: 'kg',
        stock: 14,
        stockMinimo: 8,
        costoUnitario: 45,
        activo: true,
      },
      {
        id: 'i3',
        nombre: 'Papa amarilla',
        unidad: 'kg',
        stock: 32,
        stockMinimo: 20,
        costoUnitario: 4.5,
        activo: true,
      },
      {
        id: 'i4',
        nombre: 'Papa blanca',
        unidad: 'kg',
        stock: 45,
        stockMinimo: 25,
        costoUnitario: 3.2,
        activo: true,
      },
      {
        id: 'i5',
        nombre: 'Cebolla roja',
        unidad: 'kg',
        stock: 18,
        stockMinimo: 15,
        costoUnitario: 3.8,
        activo: true,
      },
      {
        id: 'i6',
        nombre: 'Limón',
        unidad: 'kg',
        stock: 6,
        stockMinimo: 12,
        costoUnitario: 7.5,
        activo: true,
      },
      {
        id: 'i7',
        nombre: 'Ají amarillo',
        unidad: 'kg',
        stock: 4.2,
        stockMinimo: 3,
        costoUnitario: 9,
        activo: true,
      },
      {
        id: 'i8',
        nombre: 'Arroz extra',
        unidad: 'kg',
        stock: 60,
        stockMinimo: 30,
        costoUnitario: 4.1,
        activo: true,
      },
      {
        id: 'i9',
        nombre: 'Aceite vegetal',
        unidad: 'l',
        stock: 22,
        stockMinimo: 15,
        costoUnitario: 8.9,
        activo: true,
      },
      {
        id: 'i10',
        nombre: 'Leche evaporada',
        unidad: 'unidad',
        stock: 40,
        stockMinimo: 24,
        costoUnitario: 4.3,
        activo: true,
      },
      {
        id: 'i11',
        nombre: 'Huevo',
        unidad: 'unidad',
        stock: 120,
        stockMinimo: 60,
        costoUnitario: 0.6,
        activo: true,
      },
      {
        id: 'i12',
        nombre: 'Calamar',
        unidad: 'kg',
        stock: 5.5,
        stockMinimo: 6,
        costoUnitario: 38,
        activo: true,
      },
      {
        id: 'i13',
        nombre: 'Maíz morado',
        unidad: 'kg',
        stock: 9,
        stockMinimo: 5,
        costoUnitario: 11,
        activo: true,
      },
      {
        id: 'i14',
        nombre: 'Pisco quebranta',
        unidad: 'l',
        stock: 7,
        stockMinimo: 4,
        costoUnitario: 42,
        activo: true,
      },
      {
        id: 'i15',
        nombre: 'Servilletas (paquete)',
        unidad: 'paquete',
        stock: 12,
        stockMinimo: 10,
        costoUnitario: 6.5,
        activo: false,
      },
      {
        id: 'i40',
        nombre: 'Inca Kola 500 ml',
        unidad: 'unidad',
        stock: 48,
        stockMinimo: 24,
        costoUnitario: 2.4,
        activo: true,
      },
    ]

  const ahora = Date.now()
  const hace = (horas: number) => new Date(ahora - horas * 3600_000).toISOString()

  const movimientosBase: Omit<Movimiento, 'zonaId'>[] = [
    {
      id: 'mv1',
      insumoId: 'i2',
      tipo: 'entrada',
      cantidad: 20,
      motivo: 'Compra semanal',
      usuarioId: 'u1',
      fecha: hace(30),
    },
    {
      id: 'mv2',
      insumoId: 'i1',
      tipo: 'entrada',
      cantidad: 15,
      motivo: 'Compra semanal',
      usuarioId: 'u1',
      fecha: hace(30),
    },
    {
      id: 'mv3',
      insumoId: 'i2',
      tipo: 'salida',
      cantidad: 6,
      motivo: 'Servicio del almuerzo',
      usuarioId: 'u6',
      fecha: hace(26),
    },
    {
      id: 'mv4',
      insumoId: 'i1',
      tipo: 'salida',
      cantidad: 6.2,
      motivo: 'Servicio del almuerzo',
      usuarioId: 'u6',
      fecha: hace(26),
    },
    {
      id: 'mv5',
      insumoId: 'i6',
      tipo: 'merma',
      cantidad: 2,
      motivo: 'Lote en mal estado',
      usuarioId: 'u6',
      fecha: hace(20),
    },
    {
      id: 'mv6',
      insumoId: 'i12',
      tipo: 'salida',
      cantidad: 3.5,
      motivo: 'Servicio de la cena',
      usuarioId: 'u6',
      fecha: hace(8),
    },
    {
      id: 'mv7',
      insumoId: 'i3',
      tipo: 'ajuste',
      cantidad: 2,
      motivo: 'Corrección tras inventario físico',
      usuarioId: 'u1',
      fecha: hace(4),
    },
    {
      id: 'mv8',
      insumoId: 'i1',
      tipo: 'salida',
      cantidad: 0.4,
      motivo: 'Servicio de la cena',
      usuarioId: 'u6',
      fecha: hace(2),
    },
  ]

  // ── Fase 3: carta ──
  const productos: Producto[] = productosBase.map((p) => ({
    ...p,
    codigo: `PR${p.id.slice(1).padStart(3, '0')}`,
    imagen: imagenPlato(p.nombre),
  }))
  for (const p of productos) {
    for (const v of p.variantes) v.codigo = `${p.codigo}-${v.id.toUpperCase()}`
    for (const g of p.gruposModificadores)
      for (const m of g.modificadores)
        if (m.recargo > 0) m.codigo = `AD${m.id.slice(2).padStart(3, '0')}`
  }

  const c7 = categorias.find((c) => c.id === 'c7')
  if (c7) c7.disponibilidad = { dias: [0, 1, 2, 3, 4], desde: '12:00', hasta: '16:00' }

  const combos: Combo[] = [
    {
      id: 'cb1',
      tipo: 'menuDia',
      nombre: 'Menú ejecutivo',
      descripcion: 'Entrada, fondo y refresco. De lunes a viernes al mediodía.',
      precio: 32,
      grupos: [
        { id: 'cb1-g1', nombre: 'Entrada', opciones: ['p1', 'p2'] },
        { id: 'cb1-g2', nombre: 'Fondo', opciones: ['p6', 'p7', 'p8'] },
        { id: 'cb1-g3', nombre: 'Bebida', opciones: ['p13'] },
      ],
      dias: [0, 1, 2, 3, 4],
      activo: true,
    },
    {
      id: 'cb2',
      tipo: 'combo',
      nombre: 'Combo marino',
      descripcion: 'Cebiche clásico, chicharrón de calamar y dos pisco sour.',
      precio: 125,
      grupos: [
        { id: 'cb2-g1', nombre: 'Cebiche', opciones: ['p3'] },
        { id: 'cb2-g2', nombre: 'Chicharrón', opciones: ['p10'] },
        { id: 'cb2-g3', nombre: 'Pisco sour', opciones: ['p14'] },
        { id: 'cb2-g4', nombre: 'Segundo pisco sour', opciones: ['p14'] },
      ],
      dias: [],
      activo: true,
    },
  ]

  for (const c of combos) c.codigo = `CB${c.id.slice(2).padStart(3, '0')}`
  for (const c of combos)
    c.imagen = ilustracionCombo(
      c.grupos.map((g) => productos.find((p) => p.id === g.opciones[0])?.nombre ?? ''),
    )

  // ── Fase 4: inventario y compras ──
  /** Uno por local: es lo que ve Inventarios del ERP (D-009). */
  const almacenes: Almacen[] = [
    { id: 'am1', nombre: 'Almacén Miraflores', localId: 'l1', activo: true },
    { id: 'am2', nombre: 'Almacén San Isidro', localId: 'l2', activo: true },
    { id: 'am3', nombre: 'Almacén Barranco', localId: 'l3', activo: true },
  ]

  const zonas: Zona[] = [
    {
      id: 'zn1',
      nombre: 'Despensa',
      localId: 'l1',
      almacenId: 'am1',
      descripcion: 'Secos y abarrotes',
      activo: true,
    },
    {
      id: 'zn2',
      nombre: 'Cámara de frío',
      localId: 'l1',
      almacenId: 'am1',
      descripcion: 'Carnes, pescados y lácteos',
      activo: true,
    },
    {
      id: 'zn3',
      nombre: 'Barra',
      localId: 'l1',
      almacenId: 'am1',
      descripcion: 'Bebidas y licores',
      activo: true,
    },
    { id: 'zn4', nombre: 'Despensa San Isidro', localId: 'l2', almacenId: 'am2', activo: true },
  ]

  const proveedores: Proveedor[] = [
    {
      id: 'pv1',
      razonSocial: 'Carnes del Sur S.A.C.',
      ruc: '20512345671',
      contacto: 'Julio Mendoza',
      telefono: '987 654 321',
      email: 'ventas@carnesdelsur.pe',
      diasCredito: 15,
      activo: true,
    },
    {
      id: 'pv2',
      razonSocial: 'Pesquera Villa E.I.R.L.',
      ruc: '20600123450',
      contacto: 'Rosa Villa',
      telefono: '945 112 233',
      diasCredito: 7,
      activo: true,
    },
    {
      id: 'pv3',
      razonSocial: 'Mercado Mayorista N.° 2 · Puesto 118',
      ruc: '10458796322',
      contacto: 'Don Teodoro',
      telefono: '999 000 118',
      diasCredito: 0,
      activo: true,
    },
    {
      id: 'pv4',
      razonSocial: 'Distribuidora Central S.A.',
      ruc: '20100047218',
      email: 'pedidos@dcentral.com.pe',
      diasCredito: 30,
      activo: true,
    },
    {
      id: 'pv5',
      razonSocial: 'Granja San Pedro S.A.C.',
      ruc: '20487654320',
      diasCredito: 7,
      activo: true,
    },
    {
      id: 'pv6',
      razonSocial: 'Bodega Ica S.R.L.',
      ruc: '20234567897',
      contacto: 'Carmen Soto',
      diasCredito: 30,
      activo: false,
    },
  ]
  const categoriaPorInsumo: Record<string, CategoriaInsumo> = {
    i1: 'carnes',
    i2: 'pescados',
    i3: 'verduras',
    i4: 'verduras',
    i5: 'verduras',
    i6: 'verduras',
    i7: 'verduras',
    i8: 'abarrotes',
    i9: 'abarrotes',
    i10: 'lacteos',
    i11: 'lacteos',
    i12: 'pescados',
    i13: 'abarrotes',
    i14: 'bebidas',
    i15: 'descartables',
    i40: 'bebidas',
  }
  /** Zona donde se guarda cada categoría en Miraflores. */
  const zonaPorCategoria: Record<CategoriaInsumo, string> = {
    carnes: 'zn2',
    pescados: 'zn2',
    lacteos: 'zn2',
    verduras: 'zn1',
    abarrotes: 'zn1',
    descartables: 'zn1',
    preparaciones: 'zn2',
    bebidas: 'zn3',
  }

  /**
   * Artículos del ERP que abastecen a cada insumo (D-004). El `factor` convierte
   * la unidad de compra en unidad de uso: un saco de 50 kg de papa rinde 50 kg.
   * Varios artículos en un insumo son sus alternos.
   */
  const articulosPorInsumo: Record<string, VinculoArticulo[]> = {
    i1: [{ articuloId: 'ar1', factor: 1, porDefecto: true }],
    // Llega entero: queda por procesar hasta despiezarlo.
    i2: [
      { articuloId: 'ar2', factor: 1, porDefecto: true, procesar: true },
      { articuloId: 'ar3', factor: 1, porDefecto: false, procesar: true },
    ],
    i3: [{ articuloId: 'ar5', factor: 50, porDefecto: true }],
    i4: [{ articuloId: 'ar6', factor: 50, porDefecto: true }],
    i5: [{ articuloId: 'ar7', factor: 20, porDefecto: true }],
    i6: [{ articuloId: 'ar8', factor: 20, porDefecto: true }],
    i7: [{ articuloId: 'ar9', factor: 1, porDefecto: true }],
    i8: [{ articuloId: 'ar10', factor: 50, porDefecto: true }],
    // Mismo aceite en dos presentaciones: la marca no cambia lo que se cocina.
    i9: [
      { articuloId: 'ar11', factor: 5, porDefecto: true },
      { articuloId: 'ar12', factor: 12, porDefecto: false },
    ],
    i10: [{ articuloId: 'ar13', factor: 24, porDefecto: true }],
    i11: [{ articuloId: 'ar14', factor: 30, porDefecto: true }],
    i12: [{ articuloId: 'ar4', factor: 1, porDefecto: true }],
    i13: [{ articuloId: 'ar16', factor: 1, porDefecto: true }],
    i40: [{ articuloId: 'ar15', factor: 12, porDefecto: true }],
  }

  const insumos: Insumo[] = insumosBase.map((i) => {
    const categoria = categoriaPorInsumo[i.id] ?? 'abarrotes'
    const zonaId = zonaPorCategoria[categoria]
    // Una quinta parte del stock está en San Isidro para que el traslado tenga sentido.
    const enSanIsidro = Math.round(i.stock * 0.2 * 10) / 10
    return {
      ...i,
      categoria,
      abastecimiento: 'directa' as const,
      articulos: articulosPorInsumo[i.id] ?? [],
      existencias: [
        { zonaId, cantidad: Math.round((i.stock - enSanIsidro) * 1000) / 1000 },
        { zonaId: 'zn4', cantidad: enSanIsidro },
      ],
    }
  })

  // Stock repartido entre zonas del mismo local, para que el total del local sume de verdad.
  const repartos: [insumoId: string, zonaId: string, cantidad: number][] = [
    ['i11', 'zn1', 60],
    ['i10', 'zn1', 24],
    ['i4', 'zn1', 3.5],
    ['i9', 'zn3', 6],
  ]
  for (const [insumoId, zonaId, cantidad] of repartos) {
    const insumo = insumos.find((x) => x.id === insumoId)
    if (!insumo) continue
    insumo.existencias.push({ zonaId, cantidad })
    insumo.stock = Math.round(insumo.existencias.reduce((t, e) => t + e.cantidad, 0) * 1000) / 1000
  }

  // Salen de una transformación, no se compran: su costo lo calcula la receta.
  insumos.push(
    {
      id: 'i16',
      nombre: 'Leche de tigre (base)',
      unidad: 'l',
      categoria: 'preparaciones',
      stock: 1.5,
      existencias: [{ zonaId: 'zn2', cantidad: 1.5 }],
      stockMinimo: 1,
      costoUnitario: 0,
      abastecimiento: 'transformacion',
      vidaUtilDias: 1,
      articulos: [],
      activo: true,
    },
    {
      id: 'i17',
      nombre: 'Filete de lenguado',
      unidad: 'kg',
      categoria: 'pescados',
      stock: 4.2,
      existencias: [{ zonaId: 'zn2', cantidad: 4.2 }],
      stockMinimo: 4,
      costoUnitario: 0,
      abastecimiento: 'transformacion',
      vidaUtilDias: 2,
      articulos: [],
      activo: true,
    },
    {
      id: 'i18',
      nombre: 'Cabeza y espinazo de pescado',
      unidad: 'kg',
      categoria: 'pescados',
      stock: 1.1,
      existencias: [{ zonaId: 'zn2', cantidad: 1.1 }],
      stockMinimo: 0,
      costoUnitario: 0,
      abastecimiento: 'transformacion',
      articulos: [],
      activo: true,
    },
  )

  /**
   * Transformaciones (D-004). Cubren los dos casos: el despiece, que de una
   * entrada saca varias salidas y merma, y la preparación, que junta varios
   * insumos en uno. `reparto` es el % del costo de las entradas que absorbe
   * cada salida; la merma no absorbe nada, así que encarece el resto.
   */
  const transformaciones: Transformacion[] = [
    {
      id: 'tf1',
      nombre: 'Despiece de lenguado',
      entradas: [{ insumoId: 'i2', cantidad: 10 }],
      salidas: [
        { id: 'tf1-s1', tipo: 'insumo', insumoId: 'i17', cantidad: 6, reparto: 88 },
        { id: 'tf1-s2', tipo: 'insumo', insumoId: 'i18', cantidad: 1.5, reparto: 12 },
        {
          id: 'tf1-s3',
          tipo: 'merma',
          cantidad: 2.5,
          reparto: 0,
          descripcion: 'Vísceras, piel y escamas',
        },
      ],
      activo: true,
    },
    {
      id: 'tf2',
      nombre: 'Leche de tigre',
      entradas: [
        { insumoId: 'i6', cantidad: 0.6 },
        { insumoId: 'i2', cantidad: 0.15 },
        { insumoId: 'i5', cantidad: 0.1 },
        { insumoId: 'i7', cantidad: 0.05 },
      ],
      salidas: [{ id: 'tf2-s1', tipo: 'insumo', insumoId: 'i16', cantidad: 1, reparto: 100 }],
      activo: true,
    },
  ]

  // El costo de lo transformado sale de sus entradas, igual que en el servicio.
  for (const t of transformaciones) {
    const costo = t.entradas.reduce(
      (total, e) =>
        total + (insumos.find((x) => x.id === e.insumoId)?.costoUnitario ?? 0) * e.cantidad,
      0,
    )
    for (const salida of t.salidas) {
      if (salida.tipo !== 'insumo' || !salida.insumoId) continue
      const insumo = insumos.find((x) => x.id === salida.insumoId)
      if (insumo) {
        insumo.costoUnitario =
          Math.round(((costo * salida.reparto) / 100 / salida.cantidad) * 100) / 100
      }
    }
  }

  /**
   * Parámetros de abastecimiento heredados: Cadena → Local → Zona →
   * Categoría → Insumo, y gana el más específico (D-004). La semilla muestra
   * los cuatro niveles en uso sobre el pescado de la cámara de frío.
   */
  const ajustesParametros: AjusteParametros[] = [
    {
      id: 'pa1',
      nivel: 'empresa',
      valores: {
        controlaLote: false,
        controlaVencimiento: false,
        fefo: false,
        diasAlerta: 7,
        bloquearVencidos: true,
        controlaUbicacion: false,
        tipoRecepcion: 'total',
      },
    },
    // La cámara de frío sí lleva lote y ubicación: dentro no se distingue a ojo.
    {
      id: 'pa2',
      nivel: 'zona',
      referencia: 'zn2',
      valores: { controlaLote: true, controlaUbicacion: true, tipoRecepcion: 'detalle' },
    },
    // El pescado caduca en días: vencimiento, FEFO y aviso más corto.
    {
      id: 'pa3',
      nivel: 'categoria',
      referencia: 'pescados',
      valores: { controlaVencimiento: true, fefo: true, diasAlerta: 2 },
    },
  ]

  const ubicaciones: Ubicacion[] = [
    {
      id: 'ub1',
      zonaId: 'zn1',
      pasillo: 'P1',
      estante: 'A',
      fila: '1',
      columna: '1',
      porDefecto: true,
      activo: true,
    },
    {
      id: 'ub2',
      zonaId: 'zn1',
      pasillo: 'P1',
      estante: 'A',
      fila: '2',
      columna: '1',
      porDefecto: false,
      activo: true,
    },
    {
      id: 'ub3',
      zonaId: 'zn1',
      pasillo: 'P2',
      estante: 'B',
      fila: '1',
      columna: '1',
      porDefecto: false,
      activo: true,
    },
    {
      id: 'ub4',
      zonaId: 'zn2',
      pasillo: 'Cámara',
      estante: 'Rack 1',
      fila: '1',
      columna: '1',
      porDefecto: true,
      activo: true,
    },
    {
      id: 'ub5',
      zonaId: 'zn2',
      pasillo: 'Cámara',
      estante: 'Rack 2',
      fila: '1',
      columna: '1',
      porDefecto: false,
      activo: true,
    },
    {
      id: 'ub6',
      zonaId: 'zn3',
      pasillo: 'Barra',
      estante: 'Bajo mostrador',
      fila: '1',
      columna: '1',
      porDefecto: true,
      activo: true,
    },
  ]

  const dia = (dias: number) => new Date(ahora + dias * 86_400_000).toLocaleDateString('sv-SE')

  const lotes: Lote[] = [
    { id: 'lt1', insumoId: 'i2', codigo: 'LEN-2409A', vencimiento: dia(1), recepcion: hace(48) },
    { id: 'lt2', insumoId: 'i2', codigo: 'LEN-2409B', vencimiento: dia(4), recepcion: hace(12) },
    { id: 'lt3', insumoId: 'i1', codigo: 'RES-0912', vencimiento: dia(9), recepcion: hace(30) },
    { id: 'lt4', insumoId: 'i12', codigo: 'CAL-0913', vencimiento: dia(-1), recepcion: hace(72) },
    { id: 'lt5', insumoId: 'i17', codigo: 'FIL-0914', vencimiento: dia(2), recepcion: hace(6) },
    { id: 'lt6', insumoId: 'i10', codigo: 'GLO-2611', vencimiento: dia(240), recepcion: hace(60) },
    { id: 'lt7', insumoId: 'i11', codigo: 'HUE-0910', vencimiento: dia(18), recepcion: hace(36) },
  ]

  /**
   * Stock detallado de la cámara de frío: cuadra con el principal de al2.
   * El resto de zonas no controla lote ni ubicación, así que no lleva detalle.
   */
  const stockDetalle: StockDetalle[] = [
    { id: 'sd1', insumoId: 'i2', zonaId: 'zn2', loteId: 'lt1', ubicacionId: 'ub4', cantidad: 4 },
    // El mismo lote repartido en dos racks.
    {
      id: 'sd2',
      insumoId: 'i2',
      zonaId: 'zn2',
      loteId: 'lt2',
      ubicacionId: 'ub5',
      cantidad: 4.2,
    },
    {
      id: 'sd10',
      insumoId: 'i2',
      zonaId: 'zn2',
      loteId: 'lt2',
      ubicacionId: 'ub4',
      cantidad: 3,
    },
    {
      id: 'sd3',
      insumoId: 'i1',
      zonaId: 'zn2',
      loteId: 'lt3',
      ubicacionId: 'ub4',
      cantidad: 6.7,
    },
    {
      id: 'sd4',
      insumoId: 'i12',
      zonaId: 'zn2',
      loteId: 'lt4',
      ubicacionId: 'ub5',
      cantidad: 4.4,
    },
    {
      id: 'sd5',
      insumoId: 'i17',
      zonaId: 'zn2',
      loteId: 'lt5',
      ubicacionId: 'ub4',
      cantidad: 4.2,
    },
    { id: 'sd6', insumoId: 'i16', zonaId: 'zn2', ubicacionId: 'ub4', cantidad: 1.5 },
    { id: 'sd7', insumoId: 'i18', zonaId: 'zn2', ubicacionId: 'ub5', cantidad: 1.1 },
    {
      id: 'sd8',
      insumoId: 'i10',
      zonaId: 'zn2',
      loteId: 'lt6',
      ubicacionId: 'ub5',
      cantidad: 32,
    },
    {
      id: 'sd9',
      insumoId: 'i11',
      zonaId: 'zn2',
      loteId: 'lt7',
      ubicacionId: 'ub4',
      cantidad: 96,
    },
  ]

  const movimientos: Movimiento[] = movimientosBase.map((m) => ({
    ...m,
    zonaId: zonaPorCategoria[categoriaPorInsumo[m.insumoId] ?? 'abarrotes'],
  }))

  const marcas: Marca[] = [
    { id: 'mc1', nombre: 'Sin marca', activo: true },
    { id: 'mc2', nombre: 'Costeño', activo: true },
    { id: 'mc3', nombre: 'Primor', activo: true },
    { id: 'mc4', nombre: 'Gloria', activo: true },
    { id: 'mc5', nombre: 'La Calera', activo: true },
    { id: 'mc6', nombre: 'Inca Kola', activo: true },
  ]

  const articulos: Articulo[] = [
    {
      id: 'ar1',
      codigo: 'ART-01024',
      nombre: 'Lomo fino de res',
      marcaId: 'mc1',
      unidadCompra: 'kg',
      proveedorId: 'pv1',
      activo: true,
    },
    {
      id: 'ar2',
      codigo: 'ART-01101',
      nombre: 'Pescado entero lenguado',
      marcaId: 'mc1',
      unidadCompra: 'kg',
      proveedorId: 'pv2',
      activo: true,
    },
    {
      id: 'ar3',
      codigo: 'ART-01102',
      nombre: 'Pescado entero corvina',
      marcaId: 'mc1',
      unidadCompra: 'kg',
      proveedorId: 'pv2',
      activo: true,
    },
    {
      id: 'ar4',
      codigo: 'ART-01110',
      nombre: 'Calamar entero',
      marcaId: 'mc1',
      unidadCompra: 'kg',
      proveedorId: 'pv2',
      activo: true,
    },
    {
      id: 'ar5',
      codigo: 'ART-02001',
      nombre: 'Papa amarilla',
      marcaId: 'mc1',
      unidadCompra: 'Saco 50 kg',
      proveedorId: 'pv3',
      activo: true,
    },
    {
      id: 'ar6',
      codigo: 'ART-02002',
      nombre: 'Papa blanca',
      marcaId: 'mc1',
      unidadCompra: 'Saco 50 kg',
      proveedorId: 'pv3',
      activo: true,
    },
    {
      id: 'ar7',
      codigo: 'ART-02010',
      nombre: 'Cebolla roja',
      marcaId: 'mc1',
      unidadCompra: 'Malla 20 kg',
      proveedorId: 'pv3',
      activo: true,
    },
    {
      id: 'ar8',
      codigo: 'ART-02020',
      nombre: 'Limón sutil',
      marcaId: 'mc1',
      unidadCompra: 'Caja 20 kg',
      proveedorId: 'pv3',
      activo: true,
    },
    {
      id: 'ar9',
      codigo: 'ART-02030',
      nombre: 'Ají amarillo',
      marcaId: 'mc1',
      unidadCompra: 'kg',
      proveedorId: 'pv3',
      activo: true,
    },
    {
      id: 'ar10',
      codigo: 'ART-03001',
      nombre: 'Arroz extra',
      marcaId: 'mc2',
      unidadCompra: 'Saco 50 kg',
      proveedorId: 'pv4',
      activo: true,
    },
    {
      id: 'ar11',
      codigo: 'ART-03010',
      nombre: 'Aceite vegetal 5 L',
      marcaId: 'mc3',
      unidadCompra: 'Bidón 5 L',
      proveedorId: 'pv4',
      activo: true,
    },
    {
      id: 'ar12',
      codigo: 'ART-03011',
      nombre: 'Aceite vegetal 1 L',
      marcaId: 'mc3',
      unidadCompra: 'Caja x12',
      proveedorId: 'pv4',
      activo: false,
    },
    {
      id: 'ar13',
      codigo: 'ART-03020',
      nombre: 'Leche evaporada 400 g',
      marcaId: 'mc4',
      unidadCompra: 'Caja x24',
      proveedorId: 'pv4',
      activo: true,
    },
    {
      id: 'ar14',
      codigo: 'ART-04001',
      nombre: 'Huevo de gallina',
      marcaId: 'mc5',
      unidadCompra: 'Jaba x30',
      proveedorId: 'pv5',
      activo: true,
    },
    {
      id: 'ar15',
      codigo: 'ART-05001',
      nombre: 'Inca Kola 500 ml',
      marcaId: 'mc6',
      unidadCompra: 'Paquete x12',
      proveedorId: 'pv4',
      activo: true,
    },
    {
      id: 'ar16',
      codigo: 'ART-02040',
      nombre: 'Maíz morado',
      marcaId: 'mc1',
      unidadCompra: 'kg',
      proveedorId: 'pv3',
      activo: true,
    },
  ]

  /**
   * Solicitudes y requerimientos de compra (F4.4). Cubren el circuito completo:
   * solicitudes enviadas esperando consolidarse, un requerimiento en cada
   * etapa que decide el ERP y una línea no disponible para reemplazar.
   */
  const solicitudes: SolicitudCompra[] = [
    {
      id: 'so1',
      numero: 'SOL-000001',
      localId: 'l1',
      areaId: 'ae2',
      estado: 'enviada',
      fecha: hace(20),
      usuarioId: 'u6',
      nota: 'Para el fin de semana',
      lineas: [
        { id: 'so1-1', insumoId: 'i2', cantidad: 12 },
        { id: 'so1-2', insumoId: 'i6', cantidad: 10 },
        { id: 'so1-3', insumoId: 'i5', cantidad: 8 },
      ],
    },
    {
      id: 'so2',
      numero: 'SOL-000002',
      localId: 'l1',
      areaId: 'ae1',
      estado: 'enviada',
      fecha: hace(8),
      usuarioId: 'u6',
      lineas: [
        { id: 'so2-1', insumoId: 'i1', cantidad: 6 },
        { id: 'so2-2', insumoId: 'i3', cantidad: 30 },
        { id: 'so2-3', insumoId: 'i9', cantidad: 10, marcaId: 'mc3' },
        { id: 'so2-4', insumoId: 'i5', cantidad: 5 },
      ],
    },
    {
      id: 'so3',
      numero: 'SOL-000003',
      localId: 'l1',
      areaId: 'ae3',
      estado: 'borrador',
      fecha: hace(2),
      usuarioId: 'u1',
      lineas: [{ id: 'so3-1', insumoId: 'i13', cantidad: 4 }],
    },
    {
      id: 'so4',
      numero: 'SOL-000004',
      localId: 'l1',
      areaId: 'ae1',
      estado: 'atendida',
      fecha: hace(96),
      usuarioId: 'u6',
      requerimientoId: 'rq1',
      lineas: [
        { id: 'so4-1', insumoId: 'i8', cantidad: 80 },
        { id: 'so4-2', insumoId: 'i11', cantidad: 120 },
      ],
    },
    {
      id: 'so5',
      numero: 'SOL-000005',
      localId: 'l1',
      areaId: 'ae3',
      estado: 'rechazada',
      fecha: hace(70),
      usuarioId: 'u1',
      motivoRechazo: 'Hay stock suficiente en la zona principal.',
      lineas: [{ id: 'so5-1', insumoId: 'i10', cantidad: 48 }],
    },
    {
      id: 'so6',
      numero: 'SOL-000006',
      localId: 'l1',
      areaId: 'ae2',
      estado: 'atendida',
      fecha: hace(50),
      usuarioId: 'u6',
      requerimientoId: 'rq2',
      lineas: [
        { id: 'so6-1', insumoId: 'i2', cantidad: 15 },
        { id: 'so6-2', insumoId: 'i12', cantidad: 6 },
      ],
    },
  ]

  const requerimientos: RequerimientoCompra[] = [
    {
      id: 'rq1',
      numero: 'REQ-000001',
      localId: 'l1',
      estado: 'convertido',
      fecha: hace(90),
      usuarioId: 'u1',
      ordenCompra: 'OC-2026-00871',
      lineas: [
        {
          id: 'rq1-1',
          insumoId: 'i8',
          articuloId: 'ar10',
          cantidad: 2,
          cantidadInsumo: 80,
          proveedorId: 'pv4',
          origen: [{ solicitudId: 'so4', lineaId: 'so4-1' }],
          cantidadConvertida: 2,
          precioNeto: 162.5,
        },
        {
          id: 'rq1-2',
          insumoId: 'i11',
          articuloId: 'ar14',
          cantidad: 4,
          cantidadInsumo: 120,
          proveedorId: 'pv5',
          origen: [{ solicitudId: 'so4', lineaId: 'so4-2' }],
          cantidadConvertida: 3,
          precioNeto: 14.8,
        },
      ],
      historial: [
        { estado: 'borrador', fecha: hace(90), autor: 'Brandon Ríos' },
        { estado: 'enviado', fecha: hace(89), autor: 'Brandon Ríos' },
        { estado: 'aprobado', fecha: hace(80), autor: 'ERP' },
        {
          estado: 'convertido',
          fecha: hace(72),
          autor: 'ERP',
          nota: 'OC-2026-00871 · huevo parcial: el proveedor solo tiene 3 jabas',
        },
      ],
    },
    {
      id: 'rq2',
      numero: 'REQ-000002',
      localId: 'l1',
      estado: 'aprobado',
      fecha: hace(48),
      usuarioId: 'u1',
      lineas: [
        {
          id: 'rq2-1',
          insumoId: 'i2',
          articuloId: 'ar2',
          cantidad: 15,
          cantidadInsumo: 15,
          proveedorId: 'pv2',
          origen: [{ solicitudId: 'so6', lineaId: 'so6-1' }],
          noDisponible: true,
        },
        {
          id: 'rq2-2',
          insumoId: 'i12',
          articuloId: 'ar4',
          cantidad: 6,
          cantidadInsumo: 6,
          proveedorId: 'pv2',
          origen: [{ solicitudId: 'so6', lineaId: 'so6-2' }],
        },
      ],
      historial: [
        { estado: 'borrador', fecha: hace(48), autor: 'Brandon Ríos' },
        { estado: 'enviado', fecha: hace(47), autor: 'Brandon Ríos' },
        {
          estado: 'aprobado',
          fecha: hace(30),
          autor: 'ERP',
          nota: 'Lenguado no disponible esta semana',
        },
      ],
    },
  ]

  // Despachado por el proveedor: listo para recepcionar en la cámara y la zona.
  requerimientos.push({
    id: 'rq3',
    numero: 'REQ-000003',
    localId: 'l1',
    estado: 'despachado',
    fecha: hace(40),
    usuarioId: 'u1',
    ordenCompra: 'OC-2026-00902',
    lineas: [
      {
        id: 'rq3-1',
        insumoId: 'i2',
        articuloId: 'ar2',
        cantidad: 12,
        cantidadInsumo: 12,
        proveedorId: 'pv2',
        origen: [],
        cantidadConvertida: 12,
        precioNeto: 38,
      },
      {
        id: 'rq3-2',
        insumoId: 'i6',
        articuloId: 'ar8',
        cantidad: 1,
        cantidadInsumo: 20,
        proveedorId: 'pv3',
        origen: [],
        cantidadConvertida: 1,
        precioNeto: 96,
      },
      {
        id: 'rq3-3',
        insumoId: 'i3',
        articuloId: 'ar5',
        cantidad: 1,
        cantidadInsumo: 50,
        proveedorId: 'pv3',
        origen: [],
        cantidadConvertida: 1,
        precioNeto: 110,
      },
      {
        id: 'rq3-4',
        insumoId: 'i5',
        articuloId: 'ar7',
        cantidad: 1,
        cantidadInsumo: 20,
        proveedorId: 'pv3',
        origen: [],
        cantidadConvertida: 1,
        precioNeto: 52,
      },
    ],
    historial: [
      { estado: 'borrador', fecha: hace(40), autor: 'Brandon Ríos' },
      { estado: 'enviado', fecha: hace(39), autor: 'Brandon Ríos' },
      { estado: 'aprobado', fecha: hace(30), autor: 'ERP' },
      { estado: 'convertido', fecha: hace(26), autor: 'ERP', nota: 'OC-2026-00902' },
      { estado: 'despachado', fecha: hace(3), autor: 'ERP' },
    ],
  })

  /** Compra de mercado sin OC, esperando que administración la valide. */
  const recepciones: Recepcion[] = [
    {
      id: 'rc1',
      numero: 'REC-000001',
      localId: 'l1',
      zonaId: 'zn1',
      comprobante: {
        tipo: 'boleta',
        serie: 'B001',
        numero: '004512',
        monto: 42,
        proveedorOcasional: 'Mercado N.° 2 · puesto 40',
      },
      motivo: 'Faltó limón para el servicio del mediodía',
      estado: 'pendienteRegularizar',
      fecha: hace(20),
      usuarioId: 'u1',
      lineas: [
        {
          id: 'rc1-1',
          insumoId: 'i6',
          factor: 1,
          costoUnitario: 7.12,
          modo: 'total',
          partes: [{ cantidad: 5 }],
          porProcesar: false,
        },
      ],
    },
  ]

  /** Pescado recibido ayer que todavía no se despiezó. */
  const porProcesar: PorProcesar[] = [
    {
      id: 'pp1',
      recepcionId: 'rc0',
      insumoId: 'i2',
      zonaId: 'zn2',
      cantidad: 7.2,
      pendiente: 7.2,
      fecha: hace(12),
    },
  ]

  // ── F4.6: recetas estandarizadas (D-007) ──
  const diaIso = (dias: number) => new Date(ahora - dias * 86_400_000).toISOString().slice(0, 10)
  const costoDe = (ids: string[], cambios: Record<string, number> = {}) =>
    Object.fromEntries(
      ids.map((id) => [id, cambios[id] ?? insumos.find((x) => x.id === id)?.costoUnitario ?? 0]),
    )
  const linea = (
    id: string,
    insumoId: string,
    cantidad: number,
    unidad: LineaRecetaSemilla['unidad'],
    extra: Partial<LineaRecetaSemilla> = {},
  ): LineaRecetaSemilla => ({ id, tipo: 'ingrediente', insumoId, cantidad, unidad, ...extra })
  type LineaRecetaSemilla = RecetaEstandar['versiones'][number]['lineas'][number]
  const lineasLomo = [
    linea('lr1', 'i1', 200, 'g'),
    linea('lr2', 'i4', 250, 'g'),
    linea('lr3', 'i5', 80, 'g'),
    linea('lr4', 'i8', 150, 'g'),
    linea('lr5', 'i9', 50, 'ml'),
    linea('lr6', 'i15', 0.02, 'paquete', { tipo: 'consumible' }),
  ]
  const lineasCebiche = (f: number, p: string) => [
    linea(`${p}1`, 'i2', 200 * f, 'g', { cantidadTipo: 'neta' }),
    linea(`${p}2`, 'i6', 120 * f, 'g'),
    linea(`${p}3`, 'i5', 60 * f, 'g'),
    linea(`${p}4`, 'i7', 20 * f, 'g'),
  ]
  const recetasEstandar: RecetaEstandar[] = [
    {
      id: 're1',
      vendibleId: 'p:p6',
      versiones: [
        {
          id: 'vr1',
          numero: 1,
          vigenteDesde: diaIso(90),
          lineas: lineasLomo.map((l) => (l.insumoId === 'i1' ? { ...l, cantidad: 220 } : l)),
          nota: 'Receta inicial',
          autor: 'Chef ejecutivo',
          creada: hace(24 * 90),
          costosAlGuardar: costoDe(['i1', 'i4', 'i5', 'i8', 'i9', 'i15'], { i1: 48 }),
        },
        {
          id: 'vr2',
          numero: 2,
          vigenteDesde: diaIso(20),
          lineas: lineasLomo,
          nota: 'Porción de lomo de 220 g a 200 g para cuidar el food cost',
          autor: 'Chef ejecutivo',
          creada: hace(24 * 20),
          costosAlGuardar: costoDe(['i1', 'i4', 'i5', 'i8', 'i9', 'i15']),
        },
      ],
    },
    {
      id: 're2',
      vendibleId: 'v:v1',
      versiones: [
        {
          id: 'vr3',
          numero: 1,
          vigenteDesde: diaIso(60),
          lineas: lineasCebiche(1, 'lc'),
          autor: 'Chef ejecutivo',
          creada: hace(24 * 60),
          // El lenguado subió de 40 a 45 desde que se guardó: costo desactualizado.
          costosAlGuardar: costoDe(['i2', 'i6', 'i5', 'i7'], { i2: 40 }),
        },
      ],
    },
    {
      id: 're3',
      vendibleId: 'v:v2',
      // La fuente se comparte: se acepta un food cost más alto.
      foodCostObjetivo: 34,
      versiones: [
        {
          id: 'vr4',
          numero: 1,
          vigenteDesde: diaIso(60),
          lineas: lineasCebiche(1.8, 'lf'),
          nota: 'Escalada de la personal × 1,8',
          autor: 'Chef ejecutivo',
          creada: hace(24 * 60),
          costosAlGuardar: costoDe(['i2', 'i6', 'i5', 'i7']),
        },
      ],
    },
    {
      id: 're4',
      vendibleId: 'v:v3',
      versiones: [
        {
          id: 'vr5',
          numero: 1,
          vigenteDesde: diaIso(60),
          lineas: [linea('lh1', 'i13', 50, 'g'), linea('lh2', 'i6', 30, 'g')],
          autor: 'Jefe de barra',
          creada: hace(24 * 60),
          costosAlGuardar: costoDe(['i13', 'i6']),
        },
      ],
    },
  ]
  // Se vende tal como se compra: receta 1:1 automática.
  recetasEstandar.push({
    id: 're5',
    vendibleId: 'p:p15',
    reventaInsumoId: 'i40',
    versiones: [
      {
        id: 'vr6',
        numero: 1,
        vigenteDesde: diaIso(60),
        lineas: [linea('lk1', 'i40', 1, 'unidad')],
        nota: 'Reventa 1:1',
        autor: 'Sistema',
        creada: hace(24 * 60),
        costosAlGuardar: costoDe(['i40']),
      },
    ],
  })
  // Ficha técnica del lomo saltado (se muestra con la ficha activa).
  const lomoV2 = recetasEstandar[0]!.versiones[1]!
  lomoV2.ficha = {
    porciones: 1,
    toleranciaPesoPorcentaje: 5,
    conservacion: 'Se sirve al momento; el lomo cortado dura 48 h en cámara a 2 °C.',
    pasos: [
      {
        id: 'pf1',
        descripcion: 'Saltear el lomo en tiras a fuego máximo',
        tiempoMin: 2,
        temperaturaC: 250,
        equipo: 'Wok',
      },
      {
        id: 'pf2',
        descripcion: 'Agregar cebolla y tomate, flamear con sillao y vinagre',
        tiempoMin: 1,
        equipo: 'Wok',
      },
      { id: 'pf3', descripcion: 'Emplatar con papas fritas y arroz' },
    ],
  }
  // Alérgenos de los insumos: la receta los suma.
  const alergenosInsumo: Record<string, NonNullable<Insumo['alergenos']>> = {
    i2: ['pescado'],
    i7: ['aji'],
    i10: ['lacteos'],
    i11: ['huevo'],
    i12: ['mariscos'],
  }
  for (const [id, a] of Object.entries(alergenosInsumo)) {
    const insumo = insumos.find((x) => x.id === id)
    if (insumo) insumo.alergenos = a
  }
  // Extras del lomo que suman insumos; «Sin cebolla» la quita.
  const lomo = productos.find((p) => p.id === 'p6')
  const extras = lomo?.gruposModificadores.find((g) => g.id === 'g3')
  if (lomo && extras) {
    for (const m of extras.modificadores) {
      if (m.id === 'mo7')
        m.efectos = [{ insumoId: 'i11', cantidad: 1, unidad: 'unidad', efecto: 'suma' }]
      if (m.id === 'mo8')
        m.efectos = [{ insumoId: 'i4', cantidad: 150, unidad: 'g', efecto: 'suma' }]
    }
    extras.modificadores.push({
      id: 'mo20',
      nombre: 'Sin cebolla',
      recargo: 0,
      activo: true,
      efectos: [{ insumoId: 'i5', cantidad: 80, unidad: 'g', efecto: 'quita' }],
    })
    lomo.notasRapidas = ['Poca sal', 'Sin ají', 'Para compartir']
  }
  // Barranco no trabaja lenguado: el tiradito no se ofrece allí.
  const tiradito = productos.find((p) => p.id === 'p4')
  if (tiradito) {
    tiradito.noOfrecidoEn = ['l3']
  }

  // El lenguado rinde 55 % limpio: solo cuenta con el parámetro de rendimiento activo.
  const lenguado = insumos.find((x) => x.id === 'i2')
  if (lenguado) lenguado.rendimientoPorcentaje = 55
  const cebiches = categorias.find((c) => c.id === 'c2')
  if (cebiches) cebiches.foodCostObjetivo = 32

  // ── F4.5.2: listas de precios (D-010) ──
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const hoyFecha = new Date()
  const inicioMes = iso(new Date(hoyFecha.getFullYear(), hoyFecha.getMonth(), 1))
  const finMes = iso(new Date(hoyFecha.getFullYear(), hoyFecha.getMonth() + 1, 0))
  const anio = hoyFecha.getFullYear()
  const listasPrecios: ListaPrecios[] = [
    {
      id: 'lp1',
      codigo: 'LP-MIR-01',
      nombre: 'Carta Miraflores',
      tipo: 'base',
      localId: 'l1',
      canalIds: ['cv1', 'cv2', 'cv3'],
      // La chicha tiene 20 % de descuento este mes; el resto usa el precio de la carta.
      precios: [
        {
          vendibleId: 'v:v3',
          precio: 12,
          descuento: { porcentaje: 20, desde: inicioMes, hasta: finMes },
        },
        { vendibleId: 'p:p4', precio: 48 },
      ],
      activa: true,
    },
    {
      id: 'lp2',
      codigo: 'LP-MIR-RP',
      nombre: 'Rappi Miraflores',
      tipo: 'base',
      localId: 'l1',
      canalIds: ['cv4', 'cv5'],
      // Rappi cobra 25 % de comisión: la lista sube 15 % sobre la carta del salón.
      derivadaDe: 'lp1',
      ajustePorcentaje: 15,
      precios: [{ vendibleId: 'c:cb2', precio: 139 }],
      activa: true,
    },
    {
      id: 'lp3',
      codigo: 'LP-MIR-VR',
      nombre: `Verano ${anio + 1}`,
      tipo: 'temporada',
      localId: 'l1',
      canalIds: ['cv1'],
      desde: `${anio + 1}-01-01`,
      hasta: `${anio + 1}-03-31`,
      precios: [
        { vendibleId: 'v:v1', precio: 45 },
        { vendibleId: 'v:v2', precio: 82 },
      ],
      activa: true,
    },
    {
      id: 'lp4',
      codigo: 'LP-SIS-01',
      nombre: 'Carta San Isidro',
      tipo: 'base',
      localId: 'l2',
      canalIds: ['cv1', 'cv2', 'cv3', 'cv4'],
      derivadaDe: 'lp1',
      ajustePorcentaje: 0,
      precios: [],
      activa: true,
    },
    {
      id: 'lp5',
      codigo: 'LP-BAR-01',
      nombre: 'Carta Barranco',
      tipo: 'base',
      localId: 'l3',
      canalIds: ['cv1', 'cv2'],
      // Barranco declara precios sin IGV (clientela corporativa con factura).
      igvIncluido: false,
      precios: [{ vendibleId: 'p:p1', precio: 20.34 }],
      activa: true,
    },
  ]

  // ── F6.1: clientes (ERP) y reservas ──
  const clientes: Cliente[] = [
    {
      id: 'cl1',
      tipoDocumento: 'dni',
      documento: '45872109',
      nombre: 'Carla Benavides',
      telefono: '987 654 321',
      email: 'carla.benavides@gmail.com',
      distrito: 'Miraflores',
      activo: true,
    },
    {
      id: 'cl2',
      tipoDocumento: 'ruc',
      documento: '20548712399',
      nombre: 'Consultora Andina S.A.C.',
      telefono: '01 445 8890',
      email: 'administracion@andina.pe',
      direccion: 'Av. Camino Real 1234',
      distrito: 'San Isidro',
      activo: true,
    },
    {
      id: 'cl3',
      tipoDocumento: 'dni',
      documento: '09871234',
      nombre: 'Jorge Manrique',
      telefono: '999 112 334',
      distrito: 'Barranco',
      activo: true,
    },
    {
      id: 'cl4',
      tipoDocumento: 'ce',
      documento: '001238845',
      nombre: 'Marie Lefèvre',
      telefono: '921 887 010',
      email: 'marie.lefevre@outlook.com',
      distrito: 'Miraflores',
      activo: true,
    },
    {
      id: 'cl5',
      tipoDocumento: 'dni',
      documento: '71234098',
      nombre: 'Renzo Palacios',
      telefono: '955 340 128',
      distrito: 'Surco',
      activo: false,
    },
  ]

  const fichasCliente: FichaCliente[] = [
    {
      clienteId: 'cl1',
      alergenos: ['mariscos'],
      etiquetas: ['Frecuente', 'Celebra aniversario en julio'],
      notas: 'Prefiere mesa junto a la ventana; siempre pide cebiche sin ají.',
      salonPreferidoId: 's1',
    },
    {
      clienteId: 'cl2',
      alergenos: [],
      etiquetas: ['Corporativo', 'Factura'],
      notas: 'Almuerzos de trabajo: pide comprobante a nombre de la empresa.',
    },
  ]

  /** Día relativo a hoy, en el mismo formato que usan los servicios. */
  const diaReserva = (dias: number) =>
    new Date(ahora + dias * 86_400_000).toISOString().slice(0, 10)

  const reservas: Reserva[] = [
    {
      id: 'rs1',
      localId: 'l1',
      clienteId: 'cl1',
      nombreContacto: 'Carla Benavides',
      telefono: '987 654 321',
      personas: 4,
      fecha: diaReserva(0),
      hora: '13:00',
      duracionMin: 90,
      mesaIds: ['m4'],
      canal: 'telefono',
      estado: 'confirmada',
      nota: 'Cumpleaños: llevar postre con vela.',
      creada: hace(30),
      usuarioId: 'u4',
    },
    {
      id: 'rs2',
      localId: 'l1',
      clienteId: 'cl2',
      nombreContacto: 'Consultora Andina',
      telefono: '01 445 8890',
      personas: 8,
      fecha: diaReserva(0),
      hora: '20:00',
      duracionMin: 120,
      mesaIds: ['m1', 'm2'],
      canal: 'web',
      estado: 'pendiente',
      creada: hace(8),
    },
    {
      id: 'rs3',
      localId: 'l1',
      nombreContacto: 'Familia Rodríguez',
      telefono: '913 442 771',
      personas: 2,
      fecha: diaReserva(1),
      hora: '21:00',
      duracionMin: 90,
      mesaIds: ['m4'],
      canal: 'mostrador',
      estado: 'pendiente',
      creada: hace(2),
      usuarioId: 'u4',
    },
    {
      id: 'rs4',
      localId: 'l1',
      clienteId: 'cl4',
      nombreContacto: 'Marie Lefèvre',
      personas: 3,
      fecha: diaReserva(-2),
      hora: '13:30',
      duracionMin: 90,
      mesaIds: ['m4'],
      canal: 'app',
      estado: 'noShow',
      motivo: 'No llegó y no contestó el teléfono',
      creada: hace(60),
    },
  ]

  // ── F5: permisos, turnos y bitácora ──
  const turnos: Turno[] = [
    {
      id: 'tu1',
      nombre: 'Mañana',
      localId: 'l1',
      desde: '11:00',
      hasta: '18:00',
      dias: [0, 1, 2, 3, 4],
      usuarioIds: ['u2', 'u4'],
      activo: true,
    },
    {
      id: 'tu2',
      nombre: 'Noche',
      localId: 'l1',
      desde: '18:00',
      hasta: '00:30',
      dias: [3, 4, 5],
      usuarioIds: ['u3', 'u5'],
      activo: true,
    },
    {
      id: 'tu3',
      nombre: 'Fin de semana',
      localId: 'l2',
      desde: '12:00',
      hasta: '23:00',
      dias: [5, 6],
      usuarioIds: ['u6'],
      activo: true,
    },
  ]

  const bitacora: RegistroAuditoria[] = [
    {
      id: 'au1',
      fecha: hace(240),
      autor: 'Consola Karma',
      modulo: 'Integración',
      accion: 'Cambio de modo',
      detalle: 'Compras en Barranco pasó de sincronizado a autónomo',
      localId: 'l3',
    },
    {
      id: 'au2',
      fecha: hace(20 * 24),
      usuarioId: 'u1',
      autor: 'Chef ejecutivo',
      modulo: 'Recetas',
      accion: 'Versión guardada',
      detalle: 'Lomo saltado · versión 2 desde ' + diaIso(20),
    },
    {
      id: 'au3',
      fecha: hace(6),
      usuarioId: 'u4',
      autor: 'Ana Quispe',
      modulo: 'Compras',
      accion: 'Ingreso sin OC',
      detalle: 'Limón · 8 kg · S/ 60.00 en Miraflores',
      localId: 'l1',
    },
  ]

  return {
    combos,
    permisosPorRol: {
      admin: [],
      cajero: ['compras.solicitar', 'reservas.gestionar'],
      mesero: [],
      cocinero: ['compras.solicitar', 'produccion.registrar'],
    },
    excepcionesPermiso: [
      // Marco, el cocinero jefe, aprueba recetas sin ser administrador.
      { usuarioId: 'u5', clave: 'recetas.aprobar', concedido: true },
    ],
    turnos,
    bitacora,
    clientes,
    fichasCliente,
    reservas,
    listasPrecios,
    zonas,
    proveedores,
    marcas,
    articulos,
    empresa,
    impuestos,
    locales,
    mediosPago,
    canales,
    areas,
    impresoras,
    motivos,
    series,
    salones,
    mesas,
    usuarios,
    categorias,
    productos,
    insumos,
    movimientos,
    recetasEstandar,
    ubicaciones,
    lotes,
    stockDetalle,
    transformaciones,
    ajustesParametros,
    solicitudes,
    requerimientos,
    recepciones,
    porProcesar,
    partesProduccion: [],
    configuracion: { vertical: {}, cadenas: {}, locales: {} },
    almacenes,
    // Cevicherías agrupa Miraflores y San Isidro; Barranco opera sin cadena.
    cadenas: [{ id: 'cd1', nombre: 'Cevicherías', localIds: ['l1', 'l2'], activo: true }],
    // El administrador no gestiona la barra, aunque el ERP le da el almacén.
    accesosZona: [{ usuarioId: 'u1', zonaId: 'zn3', nivel: 'ninguno' }],
    accesosCadena: [],
    integracion: {
      empresa: {
        inventario: 'sincronizado',
        compras: 'sincronizado',
        precios: 'autonomo',
        ventas: 'autonomo',
        contabilidad: 'autonomo',
        asistencia: 'autonomo',
      },
      // Barranco es el local piloto que todavía compra sin pasar por el ERP.
      locales: { l3: { compras: 'autonomo', inventario: 'autonomo' } },
      historial: [
        {
          capacidad: 'compras',
          localId: 'l3',
          anterior: 'sincronizado',
          nuevo: 'autonomo',
          motivo: 'Local nuevo: empieza con compra directa hasta estabilizar la operación',
          autor: 'Consola Karma',
          fecha: hace(240),
        },
      ],
    },
    vinculosErp: [
      {
        id: 've1',
        entidad: 'almacen',
        idVertical: 'am1',
        idExterno: 'ALM-0101',
        estado: 'sincronizado',
        version: 3,
        actualizado: hace(5),
      },
      {
        id: 've2',
        entidad: 'almacen',
        idVertical: 'am2',
        idExterno: 'ALM-0201',
        estado: 'sincronizado',
        version: 2,
        actualizado: hace(5),
      },
      {
        id: 've3',
        entidad: 'local',
        idVertical: 'l1',
        idExterno: 'LV-0001',
        estado: 'sincronizado',
        version: 1,
        actualizado: hace(400),
      },
      {
        id: 've4',
        entidad: 'local',
        idVertical: 'l2',
        idExterno: 'LV-0002',
        estado: 'sincronizado',
        version: 1,
        actualizado: hace(400),
      },
    ],
  }
}

function cargar(): Esquema {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) return JSON.parse(crudo) as Esquema
  } catch {
    // localStorage bloqueado o dato corrupto: se reinicia con la semilla.
  }
  const inicial = semilla()
  guardar(inicial)
  return inicial
}

function guardar(datos: Esquema) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    // Sin persistencia: los cambios viven solo en memoria durante la sesión.
  }
}

export const db = cargar()

export function persistir() {
  guardar(db)
}

/** Reinicia los datos mock a la semilla original. */
export function reiniciarMock() {
  Object.assign(db, semilla())
  guardar(db)
}

/** Simula la red (latencia y fallos configurables) para que los estados de carga y error sean visibles. */
export function latencia<T>(valor: T, ms?: number): Promise<T> {
  return simularRed(valor, ms)
}

export function nuevoId(prefijo: string) {
  return `${prefijo}${Math.random().toString(36).slice(2, 9)}`
}
