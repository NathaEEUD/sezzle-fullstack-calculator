import { expect, test } from '@playwright/test'
import { OPERATIONS } from '../../frontend/src/calculator/operations.ts'

test(
  'the OPERATIONS constant lists the same operations as the service',
  { tag: '@issue-8' },
  async ({ page }) => {
    const response = await page.goto('/api/v1/operations')

    expect(response?.status()).toBe(200)
    expect(await response?.json()).toEqual({ operations: OPERATIONS })
  },
)
