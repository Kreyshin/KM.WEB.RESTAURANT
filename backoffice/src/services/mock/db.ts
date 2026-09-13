/**
 * "Base de datos" en memoria + localStorage para el modo mock.
 *
 * Sustituible por completo: cuando llegue el backend real, los servicios dejan
 * de importar este módulo y esta carpeta se borra.
 */

import type {
  Categoria,
  Insumo,
  Local,
  Mesa,
  Movimiento,
  Producto,
  Receta,
  Salon,
  Usuario,
} from '@/types'
import { simularRed } from './red'

/**
 * La clave lleva versión: al cambiar la forma de los datos se sube el número y
 * los navegadores con la semilla anterior parten de cero en vez de romperse.
 */
const CLAVE = 'km.restaurante.mock.v3'

export interface Esquema {
  locales: Local[]
  salones: Salon[]
  mesas: Mesa[]
  usuarios: Usuario[]
  categorias: Categoria[]
  productos: Producto[]
  insumos: Insumo[]
  movimientos: Movimiento[]
  recetas: Receta[]
}

function semilla(): Esquema {
  const locales: Local[] = [
    {
      id: 'l1',
      nombre: 'Miraflores',
      direccion: 'Av. José Larco 812',
      distrito: 'Miraflores',
      telefono: '01 445 2210',
      activo: true,
    },
    {
      id: 'l2',
      nombre: 'San Isidro',
      direccion: 'Calle Las Begonias 475',
      distrito: 'San Isidro',
      telefono: '01 422 8930',
      activo: true,
    },
    {
      id: 'l3',
      nombre: 'Barranco',
      direccion: 'Jr. Pedro de Osma 135',
      distrito: 'Barranco',
      activo: false,
    },
  ]

  const usuarios: Usuario[] = [
    {
      id: 'u1',
      nombre: 'Brandon Ríos',
      email: 'admin@kmrestaurante.pe',
      rol: 'admin',
      activo: true,
    },
    {
      id: 'u2',
      nombre: 'Lucía Paredes',
      email: 'lucia@kmrestaurante.pe',
      rol: 'mesero',
      activo: true,
    },
    {
      id: 'u3',
      nombre: 'Diego Salas',
      email: 'diego@kmrestaurante.pe',
      rol: 'mesero',
      activo: true,
    },
    { id: 'u4', nombre: 'Ana Quispe', email: 'ana@kmrestaurante.pe', rol: 'cajero', activo: true },
    {
      id: 'u5',
      nombre: 'Marco Tello',
      email: 'marco@kmrestaurante.pe',
      rol: 'cocinero',
      activo: false,
    },
    {
      id: 'u6',
      nombre: 'Rosa Huamán',
      email: 'rosa@kmrestaurante.pe',
      rol: 'cocinero',
      activo: true,
    },
  ]

  const salones: Salon[] = [
    {
      id: 's1',
      nombre: 'Salón principal',
      descripcion: 'Planta baja, junto a la barra',
      orden: 1,
      activo: true,
    },
    { id: 's2', nombre: 'Terraza', descripcion: 'Al aire libre, techada', orden: 2, activo: true },
    {
      id: 's3',
      nombre: 'Segundo piso',
      descripcion: 'Eventos y grupos grandes',
      orden: 3,
      activo: true,
    },
    { id: 's4', nombre: 'Barra', descripcion: 'Atención rápida', orden: 4, activo: false },
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

  const productos: Producto[] = [
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

  const insumos: Insumo[] = [
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

  const movimientos: Movimiento[] = [
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

  return { locales, salones, mesas, usuarios, categorias, productos, insumos, movimientos, recetas }
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
