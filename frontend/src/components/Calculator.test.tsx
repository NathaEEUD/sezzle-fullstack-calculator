import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SERVICE_UNAVAILABLE_MESSAGE, type CalculatorClient } from '../api/client'
import type { Calculation, Outcome } from '../calculator/operations'
import { Calculator } from './Calculator'

function fakeClient(outcome: Outcome | ((calculation: Calculation) => Outcome)) {
  const calculations: Calculation[] = []
  const client: CalculatorClient = {
    calculate(calculation) {
      calculations.push(calculation)
      return Promise.resolve(typeof outcome === 'function' ? outcome(calculation) : outcome)
    },
  }
  return { client, calculations }
}

/** A client whose outcomes the test settles by hand, so a calculation can stay in flight. */
function deferredClient() {
  const calculations: Calculation[] = []
  const pending: ((outcome: Outcome) => void)[] = []
  const client: CalculatorClient = {
    calculate(calculation) {
      calculations.push(calculation)
      return new Promise((resolve) => pending.push(resolve))
    },
  }
  return { client, calculations, settle: (outcome: Outcome) => pending.shift()?.(outcome) }
}

describe('Calculator', () => {
  it('shows 0 on the display before any key is pressed', () => {
    render(<Calculator client={fakeClient({ kind: 'ok', result: 0 }).client} />)

    expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^0$/)
  })

  it('has a button with an accessible name for every key', () => {
    render(<Calculator client={fakeClient({ kind: 'ok', result: 0 }).client} />)

    for (const name of [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'add',
      'subtract',
      'multiply',
      'divide',
      'percent',
      'power',
      'square root',
      'equals',
      'decimal point',
      'delete last digit',
      'clear',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('types 2 . 5 and shows 2.5 on the display', async () => {
    const user = userEvent.setup()
    render(<Calculator client={fakeClient({ kind: 'ok', result: 0 }).client} />)

    for (const name of ['2', 'decimal point', '5']) {
      await user.click(screen.getByRole('button', { name }))
    }

    expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^2\.5$/)
  })

  it('fixes an entry with delete last digit and resets it with clear', async () => {
    const user = userEvent.setup()
    render(<Calculator client={fakeClient({ kind: 'ok', result: 0 }).client} />)
    const display = screen.getByRole('status', { name: 'display' })

    for (const name of ['1', '2', '3', 'delete last digit']) {
      await user.click(screen.getByRole('button', { name }))
    }
    expect(display).toHaveTextContent(/^12$/)

    await user.click(screen.getByRole('button', { name: 'clear' }))
    expect(display).toHaveTextContent(/^0$/)
  })

  it('taps 2 + 3 = and shows the result from the service', async () => {
    const user = userEvent.setup()
    const { client, calculations } = fakeClient({ kind: 'ok', result: 5 })
    render(<Calculator client={client} />)

    for (const name of ['2', 'add', '3', 'equals']) {
      await user.click(screen.getByRole('button', { name }))
    }

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^5$/),
    )
    expect(calculations).toEqual([{ operation: 'add', operands: [2, 3] }])
  })

  describe('keyboard', () => {
    it('types 2 + 3 Enter and shows the result from the service', async () => {
      const user = userEvent.setup()
      const { client, calculations } = fakeClient({ kind: 'ok', result: 5 })
      render(<Calculator client={client} />)

      await user.keyboard('2+3{Enter}')

      await waitFor(() =>
        expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^5$/),
      )
      expect(calculations).toEqual([{ operation: 'add', operands: [2, 3] }])
    })

    it('presses equals, not the focused key, on Enter after a click', async () => {
      const user = userEvent.setup()
      const { client, calculations } = fakeClient({ kind: 'ok', result: 0 })
      render(<Calculator client={client} />)

      await user.click(screen.getByRole('button', { name: '7' }))
      expect(screen.getByRole('button', { name: '7' })).toHaveFocus()
      await user.keyboard('{Enter}')

      expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^7$/)
      expect(calculations).toEqual([])
    })

    it('presses the focused key with Space', async () => {
      const user = userEvent.setup()
      render(<Calculator client={fakeClient({ kind: 'ok', result: 0 }).client} />)

      screen.getByRole('button', { name: '7' }).focus()
      await user.keyboard(' ')

      expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^7$/)
    })
  })

  it('taps 200 + 10 % = and shows 220 using the percent base', async () => {
    const user = userEvent.setup()
    const results: Record<string, number> = { 'percent 10,200': 20, 'add 200,20': 220 }
    const { client, calculations } = fakeClient(({ operation, operands }) => ({
      kind: 'ok',
      result: results[`${operation} ${operands.join(',')}`],
    }))
    render(<Calculator client={client} />)
    const display = screen.getByRole('status', { name: 'display' })

    for (const name of ['2', '0', '0', 'add', '1', '0', 'percent']) {
      await user.click(screen.getByRole('button', { name }))
    }
    await waitFor(() => expect(display).toHaveTextContent(/^20$/))
    await user.click(screen.getByRole('button', { name: 'equals' }))

    await waitFor(() => expect(display).toHaveTextContent(/^220$/))
    expect(calculations).toEqual([
      { operation: 'percent', operands: [10, 200] },
      { operation: 'add', operands: [200, 20] },
    ])
  })

  it('taps 2 + 3 × 4 = and chains the result with immediate execution', async () => {
    const user = userEvent.setup()
    const results: Record<string, number> = { 'add 2,3': 5, 'multiply 5,4': 20 }
    const { client, calculations } = fakeClient(({ operation, operands }) => ({
      kind: 'ok',
      result: results[`${operation} ${operands.join(',')}`],
    }))
    render(<Calculator client={client} />)
    const display = screen.getByRole('status', { name: 'display' })

    for (const name of ['2', 'add', '3', 'multiply']) {
      await user.click(screen.getByRole('button', { name }))
    }
    await waitFor(() => expect(display).toHaveTextContent(/^5$/))
    for (const name of ['4', 'equals']) {
      await user.click(screen.getByRole('button', { name }))
    }

    await waitFor(() => expect(display).toHaveTextContent(/^20$/))
    expect(calculations).toEqual([
      { operation: 'add', operands: [2, 3] },
      { operation: 'multiply', operands: [5, 4] },
    ])
  })

  it('taps 2 xʸ 1 0 = and shows 1024', async () => {
    const user = userEvent.setup()
    const { client, calculations } = fakeClient({ kind: 'ok', result: 1024 })
    render(<Calculator client={client} />)

    for (const name of ['2', 'power', '1', '0', 'equals']) {
      await user.click(screen.getByRole('button', { name }))
    }

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^1024$/),
    )
    expect(calculations).toEqual([{ operation: 'power', operands: [2, 10] }])
  })

  it('taps 9 √ and shows 3 at once', async () => {
    const user = userEvent.setup()
    const { client, calculations } = fakeClient({ kind: 'ok', result: 3 })
    render(<Calculator client={client} />)

    for (const name of ['9', 'square root']) {
      await user.click(screen.getByRole('button', { name }))
    }

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^3$/),
    )
    expect(calculations).toEqual([{ operation: 'sqrt', operands: [9] }])
  })

  it('shows Not a real number for the square root of a negative result', async () => {
    const user = userEvent.setup()
    const { client } = fakeClient(({ operation }) =>
      operation === 'sqrt'
        ? { kind: 'maths_error', message: 'Not a real number' }
        : { kind: 'ok', result: -9 },
    )
    render(<Calculator client={client} />)
    const display = screen.getByRole('status', { name: 'display' })

    for (const name of ['0', 'subtract', '9', 'equals']) {
      await user.click(screen.getByRole('button', { name }))
    }
    await waitFor(() => expect(display).toHaveTextContent(/^-9$/))
    await user.click(screen.getByRole('button', { name: 'square root' }))

    await waitFor(() => expect(display).toHaveTextContent(/^Not a real number$/))
  })

  describe('service unavailable', () => {
    it('shows the service alert and keeps the numbers on the display', async () => {
      const user = userEvent.setup()
      const { client } = fakeClient({ kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE })
      render(<Calculator client={client} />)

      for (const name of ['2', 'add', '3', 'equals']) {
        await user.click(screen.getByRole('button', { name }))
      }

      expect(await screen.findByRole('alert')).toHaveTextContent(SERVICE_UNAVAILABLE_MESSAGE)
      expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^3$/)
    })

    it('clears the service alert and retries when equals is pressed again', async () => {
      const user = userEvent.setup()
      const outcomes: Outcome[] = [
        { kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE },
        { kind: 'ok', result: 5 },
      ]
      const { client, calculations } = fakeClient(() => outcomes.shift()!)
      render(<Calculator client={client} />)

      for (const name of ['2', 'add', '3', 'equals']) {
        await user.click(screen.getByRole('button', { name }))
      }
      await screen.findByRole('alert')
      await user.click(screen.getByRole('button', { name: 'equals' }))

      await waitFor(() =>
        expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^5$/),
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(calculations).toEqual([
        { operation: 'add', operands: [2, 3] },
        { operation: 'add', operands: [2, 3] },
      ])
    })
  })

  it('ignores keys while a calculation is in flight', async () => {
    const user = userEvent.setup()
    const { client, calculations, settle } = deferredClient()
    render(<Calculator client={client} />)
    const display = screen.getByRole('status', { name: 'display' })

    for (const name of ['2', 'add', '3', 'equals']) {
      await user.click(screen.getByRole('button', { name }))
    }
    for (const name of ['7', 'multiply', 'equals']) {
      await user.click(screen.getByRole('button', { name }))
    }
    expect(display).toHaveTextContent(/^3$/)
    expect(calculations).toHaveLength(1)

    settle({ kind: 'ok', result: 5 })

    await waitFor(() => expect(display).toHaveTextContent(/^5$/))
    expect(calculations).toEqual([{ operation: 'add', operands: [2, 3] }])
  })
})
