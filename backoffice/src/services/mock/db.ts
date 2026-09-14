/**
 * "Base de datos" en memoria + localStorage para el modo mock.
 *
 * Sustituible por completo: cuando llegue el backend real, los servicios dejan
 * de importar este módulo y esta carpeta se borra.
 */

import type {
  Almacen,
  CanalVenta,
  CategoriaInsumo,
  Combo,
  Proveedor,
  Categoria,
  ConfigImpuestos,
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
  Receta,
  Salon,
  Usuario,
  Articulo,
  Marca,
} from '@/types'
import { ilustracionCombo, imagenPlato } from './ilustraciones'
import { simularRed } from './red'

/**
 * La clave lleva versión: al cambiar la forma de los datos se sube el número y
 * los navegadores con la semilla anterior parten de cero en vez de romperse.
 */
const CLAVE = 'km.restaurante.mock.v17'

export interface Esquema {
  combos: Combo[]
  almacenes: Almacen[]
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
  recetas: Receta[]
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
    { id: 'c3', nombre: 'Fondos criollos', orden: 3, activa: true },
    { id: 'c4', nombre: 'Fondos marinos', orden: 4, activa: true },
    { id: 'c5', nombre: 'Postres', orden: 5, activa: true },
    { id: 'c6', nombre: 'Bebidas', orden: 6, activa: true },
    {
      id: 'c7',
      nombre: 'Menú del día',
      descripcion: 'Solo de lunes a viernes al mediodía',
      orden: 7,
      activa: false,
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

  const productosBase: Omit<Producto, 'preciosCanal'>[] = [
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

  const insumosBase: (Omit<Insumo, 'existencias' | 'proveedorId' | 'categoria'> & {
    proveedor?: string
  })[] = [
    {
      id: 'i1',
      nombre: 'Lomo fino de res',
      unidad: 'kg',
      stock: 8.4,
      stockMinimo: 10,
      costoUnitario: 52,
      proveedor: 'Carnes del Sur',
      activo: true,
    },
    {
      id: 'i2',
      nombre: 'Pescado del día (lenguado)',
      unidad: 'kg',
      stock: 14,
      stockMinimo: 8,
      costoUnitario: 45,
      proveedor: 'Pesquera Villa',
      activo: true,
    },
    {
      id: 'i3',
      nombre: 'Papa amarilla',
      unidad: 'kg',
      stock: 32,
      stockMinimo: 20,
      costoUnitario: 4.5,
      proveedor: 'Mercado Mayorista',
      activo: true,
    },
    {
      id: 'i4',
      nombre: 'Papa blanca',
      unidad: 'kg',
      stock: 45,
      stockMinimo: 25,
      costoUnitario: 3.2,
      proveedor: 'Mercado Mayorista',
      activo: true,
    },
    {
      id: 'i5',
      nombre: 'Cebolla roja',
      unidad: 'kg',
      stock: 18,
      stockMinimo: 15,
      costoUnitario: 3.8,
      proveedor: 'Mercado Mayorista',
      activo: true,
    },
    {
      id: 'i6',
      nombre: 'Limón',
      unidad: 'kg',
      stock: 6,
      stockMinimo: 12,
      costoUnitario: 7.5,
      proveedor: 'Mercado Mayorista',
      activo: true,
    },
    {
      id: 'i7',
      nombre: 'Ají amarillo',
      unidad: 'kg',
      stock: 4.2,
      stockMinimo: 3,
      costoUnitario: 9,
      proveedor: 'Mercado Mayorista',
      activo: true,
    },
    {
      id: 'i8',
      nombre: 'Arroz extra',
      unidad: 'kg',
      stock: 60,
      stockMinimo: 30,
      costoUnitario: 4.1,
      proveedor: 'Distribuidora Central',
      activo: true,
    },
    {
      id: 'i9',
      nombre: 'Aceite vegetal',
      unidad: 'l',
      stock: 22,
      stockMinimo: 15,
      costoUnitario: 8.9,
      proveedor: 'Distribuidora Central',
      activo: true,
    },
    {
      id: 'i10',
      nombre: 'Leche evaporada',
      unidad: 'unidad',
      stock: 40,
      stockMinimo: 24,
      costoUnitario: 4.3,
      proveedor: 'Distribuidora Central',
      activo: true,
    },
    {
      id: 'i11',
      nombre: 'Huevo',
      unidad: 'unidad',
      stock: 120,
      stockMinimo: 60,
      costoUnitario: 0.6,
      proveedor: 'Granja San Pedro',
      activo: true,
    },
    {
      id: 'i12',
      nombre: 'Calamar',
      unidad: 'kg',
      stock: 5.5,
      stockMinimo: 6,
      costoUnitario: 38,
      proveedor: 'Pesquera Villa',
      activo: true,
    },
    {
      id: 'i13',
      nombre: 'Maíz morado',
      unidad: 'kg',
      stock: 9,
      stockMinimo: 5,
      costoUnitario: 11,
      proveedor: 'Mercado Mayorista',
      activo: true,
    },
    {
      id: 'i14',
      nombre: 'Pisco quebranta',
      unidad: 'l',
      stock: 7,
      stockMinimo: 4,
      costoUnitario: 42,
      proveedor: 'Bodega Ica',
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
  ]

  const recetas: Receta[] = [
    {
      productoId: 'p6',
      ingredientes: [
        { insumoId: 'i1', cantidad: 0.22 },
        { insumoId: 'i4', cantidad: 0.25 },
        { insumoId: 'i5', cantidad: 0.08 },
        { insumoId: 'i8', cantidad: 0.15 },
        { insumoId: 'i9', cantidad: 0.05 },
      ],
    },
    {
      productoId: 'p3',
      ingredientes: [
        { insumoId: 'i2', cantidad: 0.2 },
        { insumoId: 'i6', cantidad: 0.12 },
        { insumoId: 'i5', cantidad: 0.06 },
        { insumoId: 'i7', cantidad: 0.02 },
      ],
    },
    {
      productoId: 'p13',
      ingredientes: [
        { insumoId: 'i13', cantidad: 0.05 },
        { insumoId: 'i6', cantidad: 0.03 },
      ],
    },
  ]

  const ahora = Date.now()
  const hace = (horas: number) => new Date(ahora - horas * 3600_000).toISOString()

  const movimientosBase: Omit<Movimiento, 'almacenId'>[] = [
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
    imagen: imagenPlato(p.nombre),
    // Rappi cobra 25 % de comisión: los platos de fondo suben de precio en la app.
    preciosCanal: p.precio >= 30 ? [{ canalId: 'cv4', precio: Math.round(p.precio * 1.15) }] : [],
  }))

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

  for (const c of combos)
    c.imagen = ilustracionCombo(
      c.grupos.map((g) => productos.find((p) => p.id === g.opciones[0])?.nombre ?? ''),
    )

  // ── Fase 4: inventario y compras ──
  const almacenes: Almacen[] = [
    {
      id: 'al1',
      nombre: 'Almacén principal',
      localId: 'l1',
      descripcion: 'Secos y abarrotes',
      activo: true,
    },
    {
      id: 'al2',
      nombre: 'Cámara de frío',
      localId: 'l1',
      descripcion: 'Carnes, pescados y lácteos',
      activo: true,
    },
    { id: 'al3', nombre: 'Barra', localId: 'l1', descripcion: 'Bebidas y licores', activo: true },
    { id: 'al4', nombre: 'Almacén San Isidro', localId: 'l2', activo: true },
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
  const proveedorPorNombre: Record<string, string> = {
    'Carnes del Sur': 'pv1',
    'Pesquera Villa': 'pv2',
    'Mercado Mayorista': 'pv3',
    'Distribuidora Central': 'pv4',
    'Granja San Pedro': 'pv5',
    'Bodega Ica': 'pv6',
  }
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
  }
  /** Almacén donde se guarda cada categoría en Miraflores. */
  const almacenPorCategoria: Record<CategoriaInsumo, string> = {
    carnes: 'al2',
    pescados: 'al2',
    lacteos: 'al2',
    verduras: 'al1',
    abarrotes: 'al1',
    descartables: 'al1',
    preparaciones: 'al2',
    bebidas: 'al3',
  }

  const insumos: Insumo[] = insumosBase.map(({ proveedor, ...i }) => {
    const categoria = categoriaPorInsumo[i.id] ?? 'abarrotes'
    const almacenId = almacenPorCategoria[categoria]
    // Una quinta parte del stock está en San Isidro para que el traslado tenga sentido.
    const enSanIsidro = Math.round(i.stock * 0.2 * 10) / 10
    return {
      ...i,
      categoria,
      proveedorId: proveedor ? proveedorPorNombre[proveedor] : undefined,
      existencias: [
        { almacenId, cantidad: Math.round((i.stock - enSanIsidro) * 1000) / 1000 },
        { almacenId: 'al4', cantidad: enSanIsidro },
      ],
    }
  })

  // Subreceta: leche de tigre, que usan los cebiches.
  insumos.push({
    id: 'i16',
    nombre: 'Leche de tigre (base)',
    unidad: 'l',
    categoria: 'preparaciones',
    stock: 1.5,
    existencias: [{ almacenId: 'al2', cantidad: 1.5 }],
    stockMinimo: 1,
    costoUnitario: 0,
    preparacion: {
      rendimiento: 1,
      ingredientes: [
        { insumoId: 'i6', cantidad: 0.6 },
        { insumoId: 'i2', cantidad: 0.15 },
        { insumoId: 'i5', cantidad: 0.1 },
        { insumoId: 'i7', cantidad: 0.05 },
      ],
    },
    activo: true,
  })
  const i16 = insumos.at(-1)!
  i16.costoUnitario =
    Math.round(
      i16.preparacion!.ingredientes.reduce(
        (t, g) => t + (insumos.find((x) => x.id === g.insumoId)?.costoUnitario ?? 0) * g.cantidad,
        0,
      ) * 100,
    ) / 100

  const movimientos: Movimiento[] = movimientosBase.map((m) => ({
    ...m,
    almacenId: almacenPorCategoria[categoriaPorInsumo[m.insumoId] ?? 'abarrotes'],
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

  return {
    combos,
    almacenes,
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
    recetas,
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
