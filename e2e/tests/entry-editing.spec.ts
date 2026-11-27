import { expect, test } from '@playwright/test'

test(
  'an entry fixed with the decimal point and delete last digit becomes the operand the real service adds',
  { tag: '@issue-6' },
  async ({ page }) => {
    await page.goto('/')
    const display = page.getByRole('status', { name: 'display' })
    const press = async (...names: string[]) => {
      for (const name of names) {
        await page.getByRole('button', { name, exact: true }).click()
      }
    }

    await press('0', '7', 'decimal point', '5', 'decimal point', '5')
    await expect(display).toHaveText('7.55')

    await press('delete last digit')
    await expect(display).toHaveText('7.5')

    await press('add', '1', 'equals')
    await expect(display).toHaveText('8.5')

    await press('clear')
    await expect(display).toHaveText('0')
  },
)
