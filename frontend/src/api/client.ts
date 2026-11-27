import type { Calculation, Outcome } from '../calculator/operations'

/** The app's one piece of error copy, for when no envelope message is available. */
export const SERVICE_UNAVAILABLE_MESSAGE = "Can't reach the calculator service. Try again."

export type CalculatorClient = {
  calculate(calculation: Calculation): Promise<Outcome>
}

/** How long a calculation may take, body included, before the service counts as unavailable. */
const TIMEOUT_MS = 5_000

/** A client for the calculation service. It never throws: every failure is an Outcome. */
export function createCalculatorClient(fetch: typeof globalThis.fetch): CalculatorClient {
  return {
    async calculate(calculation) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      try {
        const response = await fetch('/api/v1/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calculation),
          signal: controller.signal,
        })
        const body: unknown = await response.json()
        if (response.status === 200 && hasNumericResult(body)) {
          return { kind: 'ok', result: body.result }
        }
        const message = envelopeMessage(body)
        // The kind comes from the status alone, never from `code` (ADR-0004).
        if (response.status === 422 && message !== undefined) {
          return { kind: 'maths_error', message }
        }
        return { kind: 'unavailable', message: message ?? SERVICE_UNAVAILABLE_MESSAGE }
      } catch {
        // Network failure, timeout or a body that isn't JSON: the service is unavailable.
        return { kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE }
      } finally {
        clearTimeout(timer)
      }
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

/** The service's own message from an error envelope, shown verbatim (ADR-0004). */
function envelopeMessage(body: unknown): string | undefined {
  const message = (body as { error?: { message?: unknown } } | null)?.error?.message
  return typeof message === 'string' ? message : undefined
}
