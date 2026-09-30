import { ref } from 'vue'

/**
 * Cargar por primera vez y refrescar no son lo mismo.
 *
 * El patrón de siempre —poner `cargando` a `true` y esconder el contenido—
 * está bien la primera vez, cuando no hay nada que enseñar. Pero al repetirlo
 * después de cada acción, la pantalla entera desaparece y vuelve: se pierde el
 * scroll, parpadea el layout y la sensación es la de una recarga de página,
 * aunque el dato tardase 200 ms.
 *
 * Aquí se separan los dos casos. `cargando` solo es cierto mientras no hay
 * nada en pantalla; a partir de ahí, un refresco levanta `refrescando`, que la
 * vista usa para atenuar lo que ya está —sin desmontarlo— mientras llega el
 * dato nuevo. El contenido no se mueve de sitio en ningún momento.
 */
export function useCarga() {
  const cargando = ref(true)
  const refrescando = ref(false)
  let estrenado = false

  /** Envuelve la carga de datos y decide cuál de los dos estados le toca. */
  async function con<T>(tarea: () => Promise<T>): Promise<T | undefined> {
    if (estrenado) refrescando.value = true
    else cargando.value = true
    try {
      return await tarea()
    } finally {
      estrenado = true
      cargando.value = false
      refrescando.value = false
    }
  }

  /**
   * Las dos mitades de `con`, para el código que ya tiene su `try/finally`
   * escrito y solo necesita cambiar dos líneas.
   */
  function iniciar() {
    if (estrenado) refrescando.value = true
    else cargando.value = true
  }

  function terminar() {
    estrenado = true
    cargando.value = false
    refrescando.value = false
  }

  return { cargando, refrescando, con, iniciar, terminar }
}
