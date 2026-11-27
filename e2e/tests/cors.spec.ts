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

    const sameOrigin = await page.evaluate(async () => {
      const response = await fetch('/api/v1/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'add', operands: [2, 3] }),
      })
      return response.status
    })
    expect(sameOrigin).toBe(200)

    const crossOrigin = await page.evaluate(async (url) => {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'add', operands: [2, 3] }),
        })
        return 'answered'
      } catch (error) {
        return (error as Error).name
      }
    }, calculateURL)
    expect(crossOrigin).toBe('TypeError')
  },
)
