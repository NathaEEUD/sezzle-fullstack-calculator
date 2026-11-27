import { expect, test, type Locator, type Page } from '@playwright/test'

const KEY_NAMES = [
  'clear',
  'delete last digit',
  'square root',
  'power',
  '7',
  '8',
  '9',
  'divide',
  '4',
  '5',
  '6',
  'multiply',
  '1',
  '2',
  '3',
  'subtract',
  '0',
  'decimal point',
  'percent',
  'add',
  'equals',
]

type Rgb = [number, number, number]

function parseRgb(css: string): Rgb {
  const match = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) throw new Error(`not an rgb colour: ${css}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The element's text colour and the first opaque background behind it. */
async function colours(locator: Locator): Promise<{ fg: Rgb; bg: Rgb }> {
  const { fg, bg } = await locator.evaluate((element) => {
    let node: Element | null = element
    let background = 'rgba(0, 0, 0, 0)'
    while (node) {
      const value = getComputedStyle(node).backgroundColor
      if (!/rgba\(.*,\s*0\)$/.test(value) && value !== 'transparent') {
        background = value
        break
      }
      node = node.parentElement
    }
    return { fg: getComputedStyle(element).color, bg: background }
  })
  return { fg: parseRgb(fg), bg: parseRgb(bg) }
}

const display = (page: Page) => page.getByRole('status', { name: 'display' })

test(
  'keyboard only: 2 + 3 × 4 = shows 20, then Escape clears it',
  { tag: '@issue-12' },
  async ({ page }) => {
    await page.goto('/')
    // The keyboard listener attaches once the keypad has rendered.
    await expect(page.getByRole('button', { name: 'equals' })).toBeVisible()

    await page.keyboard.type('2+3*')
    await expect(display(page)).toHaveText('5')
    await page.keyboard.type('4')
    await page.keyboard.press('Enter')
    await expect(display(page)).toHaveText('20')

    await page.keyboard.type('12.5')
    await page.keyboard.press('Backspace')
    await expect(display(page)).toHaveText('12.')
    await page.keyboard.press('Escape')
    await expect(display(page)).toHaveText('0')

    await page.keyboard.type('9r')
    await expect(display(page)).toHaveText('3')
    await page.keyboard.type('^2=')
    await expect(display(page)).toHaveText('9')
  },
)

test(
  'Tab reaches every key and shows a focus ring on it',
  { tag: '@issue-12' },
  async ({ page }) => {
    await page.goto('/')
    const pageBackground = parseRgb(
      await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    )

    for (const name of KEY_NAMES) {
      await page.keyboard.press('Tab')
      const key = page.getByRole('button', { name, exact: true })
      await expect(key).toBeFocused()

      const ring = await key.evaluate((element) => {
        const style = getComputedStyle(element)
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor }
      })
      expect(ring.style, name).not.toBe('none')
      expect(parseFloat(ring.width), name).toBeGreaterThanOrEqual(2)
      expect(contrast(parseRgb(ring.color), pageBackground), name).toBeGreaterThanOrEqual(3)
    }
  },
)

test(
  'at 320 px the keypad fits without horizontal scroll and every key is at least 44×44',
  { tag: '@issue-12' },
  async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)

    for (const name of KEY_NAMES) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox()
      expect(box, name).not.toBeNull()
      expect(box!.width, name).toBeGreaterThanOrEqual(44)
      expect(box!.height, name).toBeGreaterThanOrEqual(44)
      expect(box!.x + box!.width, name).toBeLessThanOrEqual(320)
    }
  },
)

test('the viewport meta allows pinch zoom', { tag: '@issue-12' }, async ({ page }) => {
  await page.goto('/')

  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(viewport).toContain('width=device-width')
  expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/)
  expect(viewport).not.toMatch(/maximum-scale/)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(
    `in ${colorScheme} mode the display, keys and service alert meet WCAG AA contrast`,
    { tag: '@issue-12' },
    async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      // The service alert only shows after service unavailable.
      await page.route('**/api/v1/calculate', (route) => route.abort())
      await page.goto('/')

      const body = parseRgb(
        await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
      )
      if (colorScheme === 'dark') expect(luminance(body)).toBeLessThan(0.1)
      else expect(luminance(body)).toBeGreaterThan(0.8)

      for (const name of ['2', 'add', '3', 'equals']) {
        await page.getByRole('button', { name, exact: true }).click()
      }
      await expect(page.getByRole('alert')).toBeVisible()

      const targets: [string, Locator][] = [
        ['display', display(page)],
        ['service alert', page.getByRole('alert')],
        ['title', page.getByRole('heading', { name: 'Calculator' })],
        ...KEY_NAMES.map((name): [string, Locator] => [
          name,
          page.getByRole('button', { name, exact: true }),
        ]),
      ]
      for (const [name, locator] of targets) {
        const { fg, bg } = await colours(locator)
        expect(contrast(fg, bg), name).toBeGreaterThanOrEqual(4.5)
      }
    },
  )
}
