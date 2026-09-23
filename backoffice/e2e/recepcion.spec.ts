import { drawer, expect, test } from './fixtures'

/**
 * Recepción contra OC (F4.5): total a ciegas (todo o nada, con rechazo) y a
 * detalle (se cuenta y puede llegar menos), con lote, ubicación y serie.
 */

const CAPTURAS = process.env.CAPTURAS

async function abrirOc(page: import('@playwright/test').Page, oc: string) {
  await page.goto('/compras/recepcion')
  const tarjeta = page.getByRole('listitem').filter({ hasText: oc }).first()
  await tarjeta.getByRole('button', { name: 'Recibir', exact: true }).click()
  await expect(drawer(page)).toContainText(`Recibir ${oc}`)
  return drawer(page)
}

test('total a ciegas: cantidades fijas, se recibe todo', async ({ page, entrar }) => {
  await entrar()
  await page.goto('/compras/recepcion')
  await expect(page.getByText('OC-2026-00948')).toBeVisible()
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/1-lista.png`, fullPage: true })
  const tarjeta = page.getByRole('listitem').filter({ hasText: 'OC-2026-00915' }).first()
  const [hoja] = await Promise.all([
    page.context().waitForEvent('page'),
    tarjeta.getByRole('button', { name: 'Imprimir hoja' }).click(),
  ])
  await expect(hoja.getByText('Hoja de recepción · OC-2026-00915')).toBeVisible()
  await expect(hoja.getByText('Series (4)')).toBeVisible()
  if (CAPTURAS) await hoja.screenshot({ path: `${CAPTURAS}/0-hoja.png`, fullPage: true })
  await hoja.close()
  const panel = await abrirOc(page, 'OC-2026-00948')
  await expect(panel.getByRole('radio', { name: /Total · a ciegas/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(panel.getByRole('radio', { name: /A detalle/ })).toBeDisabled()
  await expect(panel.getByLabel(/Cantidad que llegó/)).toHaveCount(0)
  await expect(panel).toContainText('1 Saco 50 kg = 50 kg')
  if (CAPTURAS) await panel.screenshot({ path: `${CAPTURAS}/2-total.png` })
  await panel.getByRole('button', { name: 'Recibir todo' }).click()
  await expect(page.getByText(/registrada/)).toBeVisible()
})

test('total con serie: pide una serie por balón y se puede rechazar la entrega', async ({
  page,
  entrar,
}) => {
  await entrar()
  const panel = await abrirOc(page, 'OC-2026-00915')
  await expect(panel.getByLabel(/^Serie \d$/)).toHaveCount(4)
  await panel.getByLabel('Serie 1').fill('GLP-001')
  await panel.getByLabel('Serie 1').press('Enter')
  await expect(panel.getByLabel('Serie 2')).toBeFocused()
  await expect(panel).toContainText('Faltan 3 series')
  if (CAPTURAS) await panel.screenshot({ path: `${CAPTURAS}/3-total-serie.png` })
  await panel.getByRole('button', { name: 'Rechazar entrega' }).click()
  await page.getByLabel('Motivo').fill('Válvula dañada')
  await page.getByRole('dialog').getByRole('button', { name: 'Rechazar entrega' }).last().click()
  await expect(page.getByText(/entrega rechazada/)).toBeVisible()
})

test('a detalle: se cuenta menos, con serie y ubicación', async ({ page, entrar }) => {
  await entrar()
  const panel = await abrirOc(page, 'OC-2026-00934')
  await expect(panel).toContainText('lo exigen los parámetros de Whisky Black Label 750 ml')
  const cantidad = panel
    .getByLabel('Cantidad que llegó de Whisky Black Label 750 ml')
    .locator('input')
  await cantidad.fill('1')
  await cantidad.blur()
  await expect(panel.getByLabel(/^Serie \d$/)).toHaveCount(6)
  await expect(panel).toContainText('Faltan 1 Caja x6: quedan pendientes')
  if (CAPTURAS) await panel.screenshot({ path: `${CAPTURAS}/4-detalle.png` })
})

test('ambos: se elige el modo y lote y vencimiento se piden en los dos', async ({
  page,
  entrar,
}) => {
  await entrar()
  const panel = await abrirOc(page, 'OC-2026-00921')
  await panel.getByRole('radio', { name: /A detalle/ }).click()
  await expect(panel.getByLabel(/Cantidad que llegó/).first()).toBeVisible()
  await expect(panel.getByLabel('Lote').first()).toBeVisible()
  if (CAPTURAS) await panel.screenshot({ path: `${CAPTURAS}/5-ambos.png` })
})
