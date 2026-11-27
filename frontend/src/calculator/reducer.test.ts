import { describe, expect, it } from 'vitest'
import { SERVICE_UNAVAILABLE_MESSAGE } from '../api/client'
import {
  calculatorReducer,
  displayText,
  initialState,
  type CalculatorEvent,
  type CalculatorState,
} from './reducer'

function press(...events: CalculatorEvent[]): CalculatorState {
  return events.reduce(calculatorReducer, initialState)
}

const digit = (d: string): CalculatorEvent => ({ type: 'digit', digit: d })
const add: CalculatorEvent = { type: 'operator', operation: 'add' }
const equals: CalculatorEvent = { type: 'equals' }

describe('calculatorReducer', () => {
  it('shows 0 before any key is pressed', () => {
    expect(displayText(initialState)).toBe('0')
  })

  it('builds the entry from digit keys', () => {
    expect(displayText(press(digit('1'), digit('2'), digit('3')))).toBe('123')
  })

  it('sets add as the pending operation and keeps the left operand on the display', () => {
    const state = press(digit('2'), add)

    expect(state.pending).toEqual({ operation: 'add', left: 2 })
    expect(displayText(state)).toBe('2')
  })

  it('starts a new entry for the right operand after the operator key', () => {
    expect(displayText(press(digit('2'), add, digit('3')))).toBe('3')
  })

  it('asks for the calculation to be evaluated when equals is pressed', () => {
    const state = press(digit('2'), add, digit('3'), equals)

    expect(state.calculation).toEqual({ operation: 'add', operands: [2, 3] })
  })

  it('shows the result when the calculation comes back', () => {
    const state = press(digit('2'), add, digit('3'), equals, {
      type: 'outcome',
      outcome: { kind: 'ok', result: 5 },
    })

    expect(displayText(state)).toBe('5')
    expect(state.calculation).toBeNull()
    expect(state.pending).toBeNull()
  })

  it('starts a new entry when a digit follows a result', () => {
    const state = press(digit('2'), add, digit('3'), equals, {
      type: 'outcome',
      outcome: { kind: 'ok', result: 5 },
    })

    expect(displayText(calculatorReducer(state, digit('7')))).toBe('7')
  })

  it('does nothing on equals with no pending operation', () => {
    const state = press(digit('2'))

    expect(calculatorReducer(state, equals)).toBe(state)
  })

  it('does nothing on equals before the right operand is typed', () => {
    const state = press(digit('2'), add)

    expect(calculatorReducer(state, equals)).toBe(state)
  })

  it('keeps the state from before equals when the service is unavailable', () => {
    const before = press(digit('2'), add, digit('3'))
    const state = calculatorReducer(calculatorReducer(before, equals), {
      type: 'outcome',
      outcome: { kind: 'unavailable', message: SERVICE_UNAVAILABLE_MESSAGE },
    })

    expect(state).toEqual(before)
  })
})
