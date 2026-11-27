import { expect, test } from '@playwright/test'

test(
  '5 ÷ 0 = shows the maths error, then a new calculation shows its result',
  { tag: '@issue-7' },
  async ({ page }) => {
    await page.goto('/')
    const display = page.getByRole('status', { name: 'display' })

    for (const name of ['5', 'divide', '0', 'equals']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(display).toHaveText('Cannot divide by zero')
    await expect(page.getByRole('alert')).toBeHidden()

    for (const name of ['6', 'add', '2', 'equals']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(display).toHaveText('8')
  },
)
