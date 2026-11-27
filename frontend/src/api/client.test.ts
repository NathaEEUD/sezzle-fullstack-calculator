import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Calculation, Outcome } from '../calculator/operations'
import { createCalculatorClient, SERVICE_UNAVAILABLE_MESSAGE } from './client'

type FetchCall = { url: string; init: RequestInit | undefined }

function fakeFetch(respond: () => Promise<Response>) {
  const calls: FetchCall[] = []
  const fetch: typeof globalThis.fetch = (input, init) => {
    calls.push({ url: String(input), init })
    return respond()
  }
  return { fetch, calls }
}

const json = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const twoPlusThree: Calculation = { operation: 'add', operands: [2, 3] }

describe('createCalculatorClient', () => {
  it('posts the calculation to the relative /api/v1/calculate', async () => {
    const { fetch, calls } = fakeFetch(() =>
      json(200, { operation: 'add', operands: [2, 3], result: 5 }),
    )

    await createCalculatorClient(fetch).calculate(twoPlusThree)

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/v1/calculate')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ operation: 'add', operands: [2, 3] })
  })

  it('returns an ok outcome with the result for a 200', async () => {
    const { fetch } = fakeFetch(() => json(200, { operation: 'add', operands: [2, 3], result: 5 }))

    const outcome = await createCalculatorClient(fetch).calculate(twoPlusThree)

    expect(outcome).toEqual({ kind: 'ok', result: 5 })
  })

  it.each([
    ['DIVISION_BY_ZERO', 'Cannot divide by zero'],
    ['OVERFLOW', 'Result too large'],
  ])("returns a maths error with the service's message for a 422 %s", async (code, message) => {
    const { fetch } = fakeFetch(() => json(422, { error: { code, message } }))

    const outcome = await createCalculatorClient(fetch).calculate(twoPlusThree)

    expect(outcome).toEqual({ kind: 'maths_error', message })
  })

  it('chooses a maths error from the 422 status alone, whatever the code', async () => {
    const { fetch } = fakeFetch(() =>
      json(422, { error: { code: 'SOME_FUTURE_CODE', message: 'Not a real number' } }),
    )

    const outcome = await createCalculatorClient(fetch).calculate(twoPlusThree)

    expect(outcome).toEqual({ kind: 'maths_error', message: 'Not a real number' })
  })

  it.each([
    [400, 'INVALID_OPERAND_COUNT', 'expected 2 operands for add, got 1'],
    [500, 'INTERNAL_ERROR', 'internal error'],
  ])(
    'reports service unavailable with the envelope message for a %i',
    async (status, code, message) => {
      const { fetch } = fakeFetch(() => json(status, { error: { code, message } }))

      const outcome = await createCalculatorClient(fetch).calculate(twoPlusThree)

      expect(outcome).toEqual({ kind: 'unavailable', message })
    },
  )

  it.each([
    ['the network fails', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['the service faults with no envelope', () => json(500, {})],
    [
      'the service faults with an empty body',
      () => Promise.resolve(new Response('', { status: 502 })),
    ],
    ['a 200 body is not JSON', () => Promise.resolve(new Response('<html>', { status: 200 }))],
    ['a 200 body has no numeric result', () => json(200, { result: 'five' })],
    ['a 422 has no envelope message', () => json(422, {})],
  ])('reports service unavailable and never throws when %s', async (_, respond) => {
    const { fetch } = fakeFetch(respond)

    const outcome = await createCalculatorClient(fetch).calculate(twoPlusThree)

    expect(outcome).toEqual({ kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE })
  })

  describe('timeout', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    // A service that never answers until the request is aborted.
    const hang = (init: RequestInit | undefined) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        )
      })

    it('reports service unavailable when the service takes longer than 5 s', async () => {
      const fetch: typeof globalThis.fetch = (_, init) => hang(init)
      let outcome: Outcome | undefined
      void createCalculatorClient(fetch)
        .calculate(twoPlusThree)
        .then((o) => (outcome = o))

      await vi.advanceTimersByTimeAsync(4_999)
      expect(outcome).toBeUndefined()
      await vi.advanceTimersByTimeAsync(1)

      expect(outcome).toEqual({ kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE })
    })

    it('reports service unavailable when a body takes longer than 5 s to arrive', async () => {
      const fetch: typeof globalThis.fetch = (_, init) =>
        Promise.resolve({ status: 200, json: () => hang(init) } as Response)
      let outcome: Outcome | undefined
      void createCalculatorClient(fetch)
        .calculate(twoPlusThree)
        .then((o) => (outcome = o))

      await vi.advanceTimersByTimeAsync(5_000)

      expect(outcome).toEqual({ kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE })
    })
  })
})
