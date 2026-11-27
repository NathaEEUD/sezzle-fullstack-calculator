import { expect, test } from '@playwright/test'

test('2 xʸ 10 = shows 1024', { tag: '@issue-10' }, async ({ page }) => {
  await page.goto('/')

  for (const name of ['2', 'power', '1', '0', 'equals']) {
    await page.getByRole('button', { name, exact: true }).click()
  }

  await expect(page.getByRole('status', { name: 'display' })).toHaveText('1024')
})

test(
  '9 √ shows 3, and 2 + 9 √ = uses it as the right operand',
  { tag: '@issue-10' },
  async ({ page }) => {
    await page.goto('/')
    const display = page.getByRole('status', { name: 'display' })

    for (const name of ['9', 'square root']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(display).toHaveText('3')

    await page.getByRole('button', { name: 'clear', exact: true }).click()
    for (const name of ['2', 'add', '9', 'square root']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    await expect(display).toHaveText('3')
    await page.getByRole('button', { name: 'equals', exact: true }).click()
    await expect(display).toHaveText('5')
  },
)

test('√ of a negative result shows Not a real number', { tag: '@issue-10' }, async ({ page }) => {
  await page.goto('/')
  const display = page.getByRole('status', { name: 'display' })

  for (const name of ['0', 'subtract', '9', 'equals']) {
    await page.getByRole('button', { name, exact: true }).click()
  }
  await expect(display).toHaveText('-9')
  await page.getByRole('button', { name: 'square root', exact: true }).click()

  await expect(display).toHaveText('Not a real number')
  await expect(page.getByRole('alert')).toBeHidden()
})
