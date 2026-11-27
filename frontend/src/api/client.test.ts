import { describe, expect, it } from 'vitest'
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

const twoPlusThree = { operation: 'add', operands: [2, 3] } as const

describe('createCalculatorClient', () => {
  it('posts the calculation to the relative /api/v1/calculate', async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { ...twoPlusThree, result: 5 }))

    await createCalculatorClient(fetch).calculate({ operation: 'add', operands: [2, 3] })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/v1/calculate')
    expect(calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ operation: 'add', operands: [2, 3] })
  })

  it('returns an ok outcome with the result for a 200', async () => {
    const { fetch } = fakeFetch(() => json(200, { ...twoPlusThree, result: 5 }))

    const outcome = await createCalculatorClient(fetch).calculate({
      operation: 'add',
      operands: [2, 3],
    })

    expect(outcome).toEqual({ kind: 'ok', result: 5 })
  })

  it.each([
    ['the network fails', () => Promise.reject(new TypeError('Failed to fetch'))],
    [
      'the service faults',
      () => json(500, { error: { code: 'INTERNAL_ERROR', message: 'internal error' } }),
    ],
    ['a 200 body is not JSON', () => Promise.resolve(new Response('<html>', { status: 200 }))],
    ['a 200 body has no numeric result', () => json(200, { result: 'five' })],
  ])('reports service unavailable and never throws when %s', async (_, respond) => {
    const { fetch } = fakeFetch(respond)

    const outcome = await createCalculatorClient(fetch).calculate({
      operation: 'add',
      operands: [2, 3],
    })

    expect(outcome).toEqual({ kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE })
  })
})
