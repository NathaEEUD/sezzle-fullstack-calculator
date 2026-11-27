import { expect, test } from '@playwright/test'

test('2 + 3 = shows the result 5 from the real service', { tag: '@issue-4' }, async ({ page }) => {
  await page.goto('/')

  for (const name of ['2', 'add', '3', 'equals']) {
    await page.getByRole('button', { name, exact: true }).click()
  }

  await expect(page.getByRole('status', { name: 'display' })).toHaveText('5')
})
