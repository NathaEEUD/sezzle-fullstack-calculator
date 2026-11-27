import { expect, test } from '@playwright/test'

test(
  'service unavailable shows the service alert, keeps the numbers and retries once the service is back',
  { tag: '@issue-9' },
  async ({ page }) => {
    await page.route('/api/v1/calculate', (route) => route.abort('connectionrefused'))
    await page.goto('/')
    const display = page.getByRole('status', { name: 'display' })

    for (const name of ['2', 'add', '3', 'equals']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(page.getByRole('alert')).toHaveText(
      "Can't reach the calculator service. Try again.",
    )
    await expect(display).toHaveText('3')

    await page.unroute('/api/v1/calculate')
    await page.getByRole('button', { name: 'equals', exact: true }).click()

    await expect(display).toHaveText('5')
    await expect(page.getByRole('alert')).toBeHidden()
  },
)
