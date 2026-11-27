import type { Calculation, Outcome } from '../calculator/operations'

/** The app's one piece of error copy, for when no envelope message is available. */
export const SERVICE_UNAVAILABLE_MESSAGE = "Can't reach the calculator service. Try again."

export type CalculatorClient = {
  calculate(calculation: Calculation): Promise<Outcome>
}

/** A client for the calculation service. It never throws: every failure is an Outcome. */
export function createCalculatorClient(fetch: typeof globalThis.fetch): CalculatorClient {
  return {
    async calculate(calculation) {
      try {
        const response = await fetch('/api/v1/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calculation),
        })
        if (response.status === 200) {
          const body: unknown = await response.json()
          if (hasNumericResult(body)) return { kind: 'ok', result: body.result }
        }
      } catch {
        // Network failure or unreadable body: the service is unavailable.
      }
      return { kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE }
    },
  }
}

function hasNumericResult(body: unknown): body is { result: number } {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { result?: unknown }).result === 'number'
  )
}
