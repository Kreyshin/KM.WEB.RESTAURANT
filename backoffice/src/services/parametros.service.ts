import type {
  AlcanceParametro,
  DefinicionParametro,
  ExcepcionPermiso,
  PermisoVertical,
  Rol,
  Usuario,
} from '@/types'
import { registrar } from './auditoria.service'
import { db, latencia, persistir } from './mock/db'
import { errorCampo } from './mock/reglas'

/**
 * Configuración propia de la vertical (D-006).
 *
 * - **Empresa:** afecta a todos los locales.
 * - **Cadena:** afecta a los locales de la cadena (D-008), si existe.
 * - **Local:** afecta a un local; cada usuario solo ve los locales a los que
 *   tiene acceso (dato del ERP).
 * - **Permisos:** se asignan a los roles del ERP y se ajustan por usuario.
 *
 * Cada fase añade aquí sus definiciones y las pantallas las muestran sin
 * cambios. Un parámetro de alcance `local` se fija para la empresa y cada
 * cadena o local puede tener su propio valor; uno de alcance `vertical` vale
 * igual en todos. Los controles avanzados empiezan en su modo simple (D-007).
 */

const definiciones: DefinicionParametro[] = [
  {
    clave: 'recepcion.sinOc.permitido',
    etiqueta: 'Permitir ingresos sin orden de compra',
    descripcion: 'Compras de emergencia o de mercado que entran al stock sin pasar por el ERP.',
    alcance: 'local',
    grupo: 'Recepción',
    tipo: 'booleano',
    porDefecto: false,
  },
  {
    clave: 'recepcion.sinOc.tope',
    etiqueta: 'Tope por ingreso sin OC',
    descripcion: 'Monto máximo del comprobante, en soles. 0: sin tope.',
    alcance: 'local',
    grupo: 'Recepción',
    tipo: 'numero',
    porDefecto: 300,
  },
  {
    clave: 'recepcion.sinOc.comprobante',
    etiqueta: 'Exigir comprobante en ingresos sin OC',
    descripcion: 'Tipo, serie, número y monto del comprobante.',
    alcance: 'local',
    grupo: 'Recepción',
    tipo: 'booleano',
    porDefecto: true,
  },
  {
    clave: 'produccion.modo',
    etiqueta: 'Registro de producción',
    descripcion:
      'Simple: se aplica lo esperado de la transformación. Detallado: se anotan consumos y salidas reales, y la diferencia debe explicarse.',
    alcance: 'local',
    grupo: 'Producción',
    tipo: 'opcion',
    opciones: [
      { valor: 'simple', etiqueta: 'Simple' },
      { valor: 'detallado', etiqueta: 'Detallado' },
    ],
    porDefecto: 'simple',
  },
  {
    clave: 'produccion.vidaUtil',
    etiqueta: 'Vida útil de lo producido',
    descripcion:
      'Simple: se propone la del insumo y se puede cambiar. Validada: solo vale la vida útil aprobada en el insumo.',
    alcance: 'vertical',
    grupo: 'Producción',
    tipo: 'opcion',
    opciones: [
      { valor: 'simple', etiqueta: 'Simple' },
      { valor: 'validada', etiqueta: 'Validada' },
    ],
    porDefecto: 'simple',
  },
  {
    clave: 'reservas.confirmarAutomatico',
    etiqueta: 'Confirmar las reservas al crearlas',
    descripcion:
      'Sin esto, la reserva entra como pendiente y alguien la confirma después de llamar al cliente.',
    alcance: 'local',
    grupo: 'Reservas',
    tipo: 'booleano',
    porDefecto: false,
  },
  {
    clave: 'reservas.duracionMin',
    etiqueta: 'Duración de una reserva',
    descripcion: 'Minutos que se aparta la mesa. Se puede cambiar en cada reserva.',
    alcance: 'local',
    grupo: 'Reservas',
    tipo: 'numero',
    porDefecto: 90,
  },
  {
    clave: 'reservas.anticipacionMaxDias',
    etiqueta: 'Anticipación máxima',
    descripcion: 'Días con los que se puede reservar. 0: sin límite.',
    alcance: 'local',
    grupo: 'Reservas',
    tipo: 'numero',
    porDefecto: 60,
  },
  {
    clave: 'reservas.cupoPorFranja',
    etiqueta: 'Cupo de personas por franja',
    descripcion:
      'Personas reservadas que la cocina aguanta a la vez. 0: sin tope, solo manda la capacidad de las mesas.',
    alcance: 'local',
    grupo: 'Reservas',
    tipo: 'numero',
    porDefecto: 0,
  },
  {
    clave: 'recetas.foodCostObjetivo',
    etiqueta: 'Objetivo de food cost',
    descripcion:
      'Porcentaje del precio neto que puede costar un plato. La categoría o la presentación pueden fijar el suyo.',
    alcance: 'local',
    grupo: 'Recetas y costos',
    tipo: 'numero',
    porDefecto: 30,
  },
  {
    clave: 'recetas.cantidadBrutaNeta',
    etiqueta: 'Distinguir cantidad bruta y neta',
    descripcion:
      'Cada línea indica si la cantidad es la que sale del almacén (bruta) o la que queda en el plato (neta).',
    alcance: 'local',
    grupo: 'Recetas y costos',
    tipo: 'booleano',
    porDefecto: false,
  },
  {
    clave: 'recetas.rendimientoInsumo',
    etiqueta: 'Usar el rendimiento del insumo',
    descripcion:
      'Las cantidades netas se dividen entre el rendimiento del insumo (pescado limpio, papa pelada).',
    alcance: 'local',
    grupo: 'Recetas y costos',
    tipo: 'booleano',
    porDefecto: false,
  },
  {
    clave: 'recetas.fichaTecnica',
    etiqueta: 'Ficha técnica en las recetas',
    descripcion:
      'Pasos con tiempo, temperatura y equipo, porciones, conservación, foto de emplatado y tolerancia de peso.',
    alcance: 'vertical',
    grupo: 'Recetas y costos',
    tipo: 'booleano',
    porDefecto: false,
  },
  {
    clave: 'recetas.aprobacion',
    etiqueta: 'Aprobar versiones de receta',
    descripcion:
      'Una versión nueva queda en borrador y no rige hasta que alguien con permiso la aprueba. Exige porciones, pasos y todos los ingredientes con costo.',
    alcance: 'vertical',
    grupo: 'Recetas y costos',
    tipo: 'booleano',
    porDefecto: false,
  },
  {
    clave: 'recetas.toleranciaCosto',
    etiqueta: 'Tolerancia para costo desactualizado',
    descripcion:
      'Variación del costo de un insumo, en %, desde que se guardó la receta a partir de la cual se avisa.',
    alcance: 'vertical',
    grupo: 'Recetas y costos',
    tipo: 'numero',
    porDefecto: 5,
  },
]

const permisos: PermisoVertical[] = [
  {
    clave: 'compras.ajustarCantidades',
    etiqueta: 'Ajustar cantidades al consolidar',
    modulo: 'Compras',
    descripcion: 'Cambiar en el requerimiento la cantidad que pidieron las áreas.',
  },
  {
    clave: 'recetas.aprobar',
    etiqueta: 'Aprobar versiones de receta',
    modulo: 'Recetas',
    descripcion: 'Poner en vigencia una versión en borrador cuando la aprobación está activa.',
  },
  {
    clave: 'compras.regularizarIngresos',
    etiqueta: 'Regularizar ingresos sin OC',
    modulo: 'Compras',
    descripcion: 'Validar una compra de mercado que ya entró al stock.',
  },
  {
    clave: 'compras.solicitar',
    etiqueta: 'Pedir insumos para su área',
    modulo: 'Compras',
    descripcion: 'Crear y enviar solicitudes de compra del área.',
  },
  {
    clave: 'compras.recepcionar',
    etiqueta: 'Recibir mercadería',
    modulo: 'Compras',
    descripcion: 'Registrar la recepción contra la orden de compra.',
  },
  {
    clave: 'carta.editar',
    etiqueta: 'Editar la carta',
    modulo: 'Carta',
    descripcion: 'Productos, categorías, secciones y combos.',
  },
  {
    clave: 'precios.editar',
    etiqueta: 'Editar listas de precios',
    modulo: 'Carta',
    descripcion: 'Crear listas y cambiar precios por local y canal.',
  },
  {
    clave: 'precios.descuentos',
    etiqueta: 'Poner descuentos en la lista',
    modulo: 'Carta',
    descripcion: 'Descuento por línea con su vigencia.',
  },
  {
    clave: 'recetas.editar',
    etiqueta: 'Editar recetas',
    modulo: 'Recetas',
    descripcion: 'Guardar versiones de receta y su ficha técnica.',
  },
  {
    clave: 'inventario.ajustar',
    etiqueta: 'Ajustar stock',
    modulo: 'Inventario',
    descripcion: 'Entradas y salidas manuales con motivo.',
  },
  {
    clave: 'produccion.registrar',
    etiqueta: 'Registrar producción',
    modulo: 'Inventario',
    descripcion: 'Partes de producción y transformaciones.',
  },
  {
    clave: 'reservas.gestionar',
    etiqueta: 'Gestionar reservas',
    modulo: 'Sala',
    descripcion: 'Crear, editar, confirmar, sentar y cancelar reservas.',
  },
  {
    clave: 'personal.turnos',
    etiqueta: 'Gestionar turnos',
    modulo: 'Personal',
    descripcion: 'Crear turnos del local y asignar personal.',
  },
  {
    clave: 'personal.permisos',
    etiqueta: 'Asignar permisos',
    modulo: 'Personal',
    descripcion: 'Permisos por rol y excepciones por usuario.',
  },
  {
    clave: 'personal.auditoria',
    etiqueta: 'Ver la bitácora',
    modulo: 'Personal',
    descripcion: 'Quién hizo cada acción sensible y cuándo.',
  },
]

/**
 * Permiso efectivo (F5): el administrador puede todo; el resto suma lo de su
 * rol del ERP y encima manda la excepción de la persona, si la tiene.
 */
export function tienePermiso(usuarioId: string | undefined, clave: string) {
  const usuario = db.usuarios.find((u) => u.id === usuarioId)
  if (!usuario) return false
  if (usuario.rol === 'admin') return true
  const excepcion = db.excepcionesPermiso.find(
    (e) => e.usuarioId === usuarioId && e.clave === clave,
  )
  if (excepcion) return excepcion.concedido
  return (db.permisosPorRol[usuario.rol] ?? []).includes(clave)
}

/** De dónde sale el permiso efectivo de una persona. */
export function origenPermiso(usuarioId: string, clave: string) {
  const usuario = db.usuarios.find((u) => u.id === usuarioId)
  if (!usuario) return 'sinAcceso' as const
  if (usuario.rol === 'admin') return 'admin' as const
  const excepcion = db.excepcionesPermiso.find(
    (e) => e.usuarioId === usuarioId && e.clave === clave,
  )
  if (excepcion) return excepcion.concedido ? ('concedido' as const) : ('quitado' as const)
  return (db.permisosPorRol[usuario.rol] ?? []).includes(clave)
    ? ('rol' as const)
    : ('sinAcceso' as const)
}

function exigirPermiso(usuarioId: string, clave: string, accion: string) {
  if (!tienePermiso(usuarioId, clave)) throw { mensaje: `No tienes permiso para ${accion}.` }
}

export const etiquetaRol: Record<Rol, string> = {
  admin: 'Administrador',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
}

type Valor = string | number | boolean

function definicion(clave: string) {
  const d = definiciones.find((x) => x.clave === clave)
  if (!d) throw { mensaje: `Parámetro desconocido: ${clave}.` }
  return d
}

/** Cadena del local, si la tiene (D-008). */
function cadenaDe(localId?: string) {
  if (!localId || db.cadenas.length === 0) return undefined
  return db.cadenas.find((c) => c.activo && c.localIds.includes(localId))?.id
}

/**
 * Valor efectivo de un parámetro: el del local si lo fijó, si no el de su
 * cadena, si no el de la empresa, si no el valor por defecto.
 */
export function valorConfig<T extends Valor = Valor>(clave: string, localId?: string): T {
  const d = definicion(clave)
  if (d.alcance === 'local' && localId) {
    const local = db.configuracion.locales[localId]?.[clave]
    if (local !== undefined) return local as T
    const cadenaId = cadenaDe(localId)
    const cadena = cadenaId ? db.configuracion.cadenas[cadenaId]?.[clave] : undefined
    if (cadena !== undefined) return cadena as T
  }
  return (db.configuracion.vertical[clave] ?? d.porDefecto) as T
}

export interface ValorParametro {
  definicion: DefinicionParametro
  valor: Valor
  /** De dónde sale el valor mostrado. */
  origen: 'propio' | 'cadena' | 'empresa' | 'defecto'
}

/** Nivel que se consulta o edita: la empresa, una cadena o un local. */
export interface AmbitoConfig {
  localId?: string
  cadenaId?: string
}

export const parametrosService = {
  /** En la empresa se ven todos; en una cadena o un local, solo los que admiten valor propio. */
  async definiciones(alcance: AlcanceParametro): Promise<DefinicionParametro[]> {
    return latencia(
      alcance === 'vertical' ? definiciones : definiciones.filter((d) => d.alcance === 'local'),
    )
  },

  async valores(ambito: AmbitoConfig = {}): Promise<ValorParametro[]> {
    const { localId } = ambito
    const cadenaId = ambito.cadenaId ?? cadenaDe(localId)
    const esEmpresa = !localId && !ambito.cadenaId
    const lista = esEmpresa ? definiciones : definiciones.filter((d) => d.alcance === 'local')
    return latencia(
      lista.map((d) => {
        const empresa = db.configuracion.vertical[d.clave]
        const cadena = cadenaId ? db.configuracion.cadenas[cadenaId]?.[d.clave] : undefined
        const propio = localId
          ? db.configuracion.locales[localId]?.[d.clave]
          : ambito.cadenaId
            ? cadena
            : empresa
        if (propio !== undefined) return { definicion: d, valor: propio, origen: 'propio' }
        if (localId && cadena !== undefined)
          return { definicion: d, valor: cadena, origen: 'cadena' }
        if (!esEmpresa && empresa !== undefined) {
          return { definicion: d, valor: empresa, origen: 'empresa' }
        }
        return { definicion: d, valor: d.porDefecto, origen: 'defecto' }
      }),
    )
  },

  /** Fija un valor en la empresa, una cadena o un local; `undefined` lo quita y vuelve a heredarse. */
  async guardarValor(
    clave: string,
    valor: Valor | undefined,
    localId?: string,
    cadenaId?: string,
  ): Promise<void> {
    const d = definicion(clave)
    if ((localId || cadenaId) && d.alcance !== 'local') {
      throw { mensaje: `«${d.etiqueta}» vale igual para toda la empresa.` }
    }
    if (valor !== undefined) {
      const ok =
        (d.tipo === 'booleano' && typeof valor === 'boolean') ||
        (d.tipo === 'numero' &&
          typeof valor === 'number' &&
          Number.isFinite(valor) &&
          valor >= 0) ||
        (d.tipo === 'opcion' && d.opciones?.some((o) => o.valor === valor)) ||
        (d.tipo === 'texto' && typeof valor === 'string')
      if (!ok) throw errorCampo(clave, `Valor no válido para «${d.etiqueta}».`)
    }
    const destino = localId
      ? (db.configuracion.locales[localId] ??= {})
      : cadenaId
        ? (db.configuracion.cadenas[cadenaId] ??= {})
        : db.configuracion.vertical
    if (valor === undefined) delete destino[clave]
    else destino[clave] = valor
    persistir()
    await latencia(null)
  },

  async permisos(): Promise<PermisoVertical[]> {
    return latencia(permisos)
  },

  /** Claves de permiso que tiene un rol. El administrador siempre los tiene todos. */
  async permisosDeRol(rol: Rol): Promise<string[]> {
    return latencia(
      rol === 'admin' ? permisos.map((p) => p.clave) : [...(db.permisosPorRol[rol] ?? [])],
    )
  },

  /** Cambia los permisos de un rol. El administrador no se edita: siempre puede todo. */
  async guardarPermisosDeRol(rol: Rol, claves: string[], usuarioId: string): Promise<string[]> {
    exigirPermiso(usuarioId, 'personal.permisos', 'asignar permisos')
    if (rol === 'admin')
      throw { mensaje: 'El administrador siempre tiene todos los permisos: no se edita.' }
    const validas = claves.filter((c) => permisos.some((p) => p.clave === c))
    const antes = db.permisosPorRol[rol] ?? []
    db.permisosPorRol[rol] = validas
    const sumados = validas.filter((c) => !antes.includes(c)).length
    const quitados = antes.filter((c) => !validas.includes(c)).length
    registrar({
      usuarioId,
      modulo: 'Permisos',
      accion: 'Permisos de rol',
      detalle: `${etiquetaRol[rol]}: ${sumados} permiso(s) agregado(s) y ${quitados} quitado(s)`,
    })
    persistir()
    return latencia([...validas])
  },

  async excepciones(): Promise<ExcepcionPermiso[]> {
    return latencia([...db.excepcionesPermiso])
  },

  /** `concedido` sin valor deja a la persona como su rol. */
  async fijarExcepcion(
    objetivoId: string,
    clave: string,
    concedido: boolean | undefined,
    usuarioId: string,
  ): Promise<ExcepcionPermiso[]> {
    exigirPermiso(usuarioId, 'personal.permisos', 'asignar permisos')
    const objetivo = db.usuarios.find((u) => u.id === objetivoId)
    if (!objetivo) throw { mensaje: 'Usuario no encontrado.' }
    if (objetivo.rol === 'admin')
      throw { mensaje: 'El administrador no necesita excepciones: ya puede todo.' }
    if (!permisos.some((p) => p.clave === clave)) throw { mensaje: 'Permiso desconocido.' }
    db.excepcionesPermiso = db.excepcionesPermiso.filter(
      (e) => !(e.usuarioId === objetivoId && e.clave === clave),
    )
    if (concedido !== undefined)
      db.excepcionesPermiso.push({ usuarioId: objetivoId, clave, concedido })
    const etiqueta = permisos.find((p) => p.clave === clave)!.etiqueta
    registrar({
      usuarioId,
      modulo: 'Permisos',
      accion: 'Excepción por usuario',
      detalle: `${objetivo.nombre}: «${etiqueta}» ${
        concedido === undefined ? 'vuelve a lo de su rol' : concedido ? 'concedido' : 'quitado'
      }`,
    })
    persistir()
    return latencia([...db.excepcionesPermiso])
  },

  /** Roles que llegan del ERP, con cuántos usuarios tiene cada uno. */
  async roles(): Promise<{ rol: Rol; etiqueta: string; usuarios: number }[]> {
    const roles = Object.keys(etiquetaRol) as Rol[]
    return latencia(
      roles.map((rol) => ({
        rol,
        etiqueta: etiquetaRol[rol],
        usuarios: db.usuarios.filter((u) => u.rol === rol).length,
      })),
    )
  },

  async usuarios(): Promise<Usuario[]> {
    return latencia([...db.usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre)))
  },
}
