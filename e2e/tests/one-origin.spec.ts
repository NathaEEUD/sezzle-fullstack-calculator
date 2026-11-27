import { expect, test } from '@playwright/test'

test(
  'the app and the service answer from one origin',
  { tag: '@issue-14' },
  async ({ page, request }) => {
    expect((await request.get('/healthz')).ok()).toBe(true)

    await page.goto('/')
    const calculation = page.waitForRequest('**/api/v1/calculate')
    for (const name of ['4', 'add', '1', 'equals']) {
      await page.getByRole('button', { name, exact: true }).click()
    }

    expect(new URL((await calculation).url()).origin).toBe(new URL(page.url()).origin)
    await expect(page.getByRole('status', { name: 'display' })).toHaveText('5')
  },
)
