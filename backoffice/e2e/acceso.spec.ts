import { cuentas, expect, test } from './fixtures'

test.describe('Acceso y permisos', () => {
  test('una ruta protegida sin sesión lleva al login y vuelve tras entrar', async ({ page }) => {
    await page.goto('/salones')
    await expect(page).toHaveURL(/\/login\?redirect=/)

    await page.getByLabel('Correo').fill(cuentas.admin)
    await page.getByLabel('Contraseña').fill('demo')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/salones$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Salones' })).toBeVisible()
  })

  test('un correo que no existe muestra el error en su campo', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill('nadie@kmrestaurante.pe')
    await page.getByLabel('Contraseña').fill('demo')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText('Correo no registrado')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('un cajero no ve Configuración ni puede entrar por URL', async ({ page, entrar }) => {
    await entrar(cuentas.cajero)

    await expect(page.getByRole('button', { name: /Config/ })).toHaveCount(0)

    await page.goto('/configuracion/series')
    await expect(page).toHaveURL(/\/sin-permiso$/)
  })

  test('el buscador global lleva a una sección', async ({ page, entrar }) => {
    await entrar()

    await page.keyboard.press('Control+K')
    await page.getByRole('combobox').fill('series')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/configuracion\/series$/)
  })
})
