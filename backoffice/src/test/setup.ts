/**
 * Se ejecuta antes de cada archivo de pruebas.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/vue'
import { afterEach, beforeEach } from 'vitest'
import { guardarConfigRed } from '@/services/mock/red'

beforeEach(() => {
  // Sin latencia ni fallos aleatorios: las pruebas deben ser rápidas y deterministas.
  guardarConfigRed({ latenciaMs: 0, tasaError: 0 })
})

afterEach(() => {
  // Desmonta lo renderizado y limpia lo que los componentes teletransportan a <body>.
  cleanup()
  document.body.innerHTML = ''
})
