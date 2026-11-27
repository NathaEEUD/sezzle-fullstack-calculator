import { expect, test } from '@playwright/test'

test(
  '200 + 10 % = shows 220 using the percent base through the real service',
  { tag: '@issue-11' },
  async ({ page }) => {
    await page.goto('/')
    const display = page.getByRole('status', { name: 'display' })

    for (const name of ['2', '0', '0', 'add', '1', '0', 'percent']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(display).toHaveText('20')

    await page.getByRole('button', { name: 'equals', exact: true }).click()
    await expect(display).toHaveText('220')
  },
)

test('50 × 10 % = shows 5 with a percent base of 1', { tag: '@issue-11' }, async ({ page }) => {
  await page.goto('/')
  const display = page.getByRole('status', { name: 'display' })

  for (const name of ['5', '0', 'multiply', '1', '0', 'percent']) {
    await page.getByRole('button', { name, exact: true }).click()
  }
  await expect(display).toHaveText('0.1')

  await page.getByRole('button', { name: 'equals', exact: true }).click()
  await expect(display).toHaveText('5')
})
