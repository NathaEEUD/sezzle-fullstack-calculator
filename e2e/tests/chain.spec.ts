import { expect, test } from '@playwright/test'

test(
  '2 + 3 × 4 = shows 20 with immediate execution through the real service',
  { tag: '@issue-5' },
  async ({ page }) => {
    await page.goto('/')
    const display = page.getByRole('status', { name: 'display' })

    for (const name of ['2', 'add', '3', 'multiply']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(display).toHaveText('5')

    for (const name of ['4', 'equals']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(display).toHaveText('20')
  },
)
