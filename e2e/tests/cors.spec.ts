import { expect, test } from '@playwright/test'

// localhost and 127.0.0.1 reach the same server from two origins.
function otherOrigin(url: string): string {
  const other = new URL(url)
  other.hostname = other.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
  return other.origin
}

test(
  'a page on another origin cannot send a calculation while CORS is off',
  { tag: '@issue-13' },
  async ({ page }) => {
    await page.goto('/')
    const calculateURL = `${otherOrigin(page.url())}/api/v1/calculate`

    // Sends 2 + 3 from the page; a JSON body makes a cross-origin call preflight.
    const sendCalculation = (url: string) =>
      page.evaluate(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation: 'add', operands: [2, 3] }),
          })
          return response.status
        } catch (error) {
          return (error as Error).name
        }
      }, url)

    expect(await sendCalculation('/api/v1/calculate')).toBe(200)
    const crossOrigin = await sendCalculation(calculateURL)
    expect(crossOrigin).toBe('TypeError')
  },
)
