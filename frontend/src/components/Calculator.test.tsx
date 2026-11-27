import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CalculatorClient } from '../api/client'
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
      'equals',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
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
})
