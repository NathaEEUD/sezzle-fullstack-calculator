import { describe, expect, it } from 'vitest'
import { SERVICE_UNAVAILABLE_MESSAGE } from '../api/client'
import type { OperationName } from './operations'
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
const operator = (operation: OperationName): CalculatorEvent => ({ type: 'operator', operation })
const add = operator('add')
const subtract = operator('subtract')
const multiply = operator('multiply')
const divide = operator('divide')
const equals: CalculatorEvent = { type: 'equals' }
const ok = (result: number): CalculatorEvent => ({
  type: 'outcome',
  outcome: { kind: 'ok', result },
})
const unavailable = (message = SERVICE_UNAVAILABLE_MESSAGE): CalculatorEvent => ({
  type: 'outcome',
  outcome: { kind: 'unavailable', message },
})

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

  it('ignores an outcome when no calculation was sent', () => {
    const state = press(digit('2'))

    expect(calculatorReducer(state, ok(5))).toBe(state)
  })

  it('does nothing on equals with no pending operation', () => {
    const state = press(digit('2'))

    expect(calculatorReducer(state, equals)).toBe(state)
  })

  it('does nothing on equals before the right operand is typed', () => {
    const state = press(digit('2'), add)

    expect(calculatorReducer(state, equals)).toBe(state)
  })

  describe('service unavailable', () => {
    it('keeps the state from before equals and shows the service alert', () => {
      const before = press(digit('2'), add, digit('3'))
      const state = [equals, unavailable()].reduce(calculatorReducer, before)

      expect(state).toEqual({ ...before, alert: SERVICE_UNAVAILABLE_MESSAGE })
      expect(displayText(state)).toBe('3')
    })

    it("shows the service's message in the service alert", () => {
      const state = press(digit('2'), add, digit('3'), equals, unavailable('internal error'))

      expect(state.alert).toBe('internal error')
    })

    it.each([
      ['a digit key', digit('4'), '34'],
      ['an operator key', multiply, '3'],
      ['equals', equals, '3'],
    ])('clears the service alert on the next keypress, %s', (_, key, display) => {
      const state = calculatorReducer(
        press(digit('2'), add, digit('3'), equals, unavailable()),
        key,
      )

      expect(state.alert).toBeNull()
      expect(displayText(state)).toBe(display)
    })

    it('sends the same calculation again when equals is pressed to retry', () => {
      const state = press(digit('2'), add, digit('3'), equals, unavailable(), equals)

      expect(state.calculation).toEqual({ operation: 'add', operands: [2, 3] })
    })

    it('clears the service alert when the retried calculation comes back', () => {
      const state = press(digit('2'), add, digit('3'), equals, unavailable(), equals, ok(5))

      expect(state.alert).toBeNull()
      expect(displayText(state)).toBe('5')
    })
  })

  describe('calculation in flight', () => {
    const inFlight = () => press(digit('2'), add, digit('3'), equals)

    it.each([
      ['a digit key', digit('4')],
      ['an operator key', multiply],
      ['equals', equals],
    ])('ignores %s until the outcome arrives', (_, key) => {
      const state = inFlight()

      expect(calculatorReducer(state, key)).toBe(state)
    })
  })

  describe('display formatting', () => {
    it('shows the result rounded for reading', () => {
      const state = press(digit('2'), divide, digit('3'), equals, ok(2 / 3))

      expect(displayText(state)).toBe('0.666666666667')
    })

    it('uses the full-precision result in the next calculation, not the displayed one', () => {
      const state = press(digit('2'), divide, digit('3'), equals, ok(2 / 3), multiply, digit('3'))

      expect(calculatorReducer(state, equals).calculation).toEqual({
        operation: 'multiply',
        operands: [2 / 3, 3],
      })
    })
  })

  describe('immediate execution', () => {
    it('applies the pending operation when the next operator key is pressed', () => {
      const state = press(digit('2'), add, digit('3'), multiply)

      expect(state.calculation).toEqual({ operation: 'add', operands: [2, 3] })
    })

    it('shows the result and makes the next operator key the pending operation', () => {
      const state = press(digit('2'), add, digit('3'), multiply, ok(5))

      expect(displayText(state)).toBe('5')
      expect(state.pending).toEqual({ operation: 'multiply', left: 5 })
      expect(state.calculation).toBeNull()
    })

    it('evaluates 2 + 3 × 4 = strictly left to right', () => {
      const state = press(digit('2'), add, digit('3'), multiply, ok(5), digit('4'), equals)

      expect(state.calculation).toEqual({ operation: 'multiply', operands: [5, 4] })
      expect(displayText(calculatorReducer(state, ok(20)))).toBe('20')
    })

    it('chains every binary operation in the order pressed', () => {
      const state = press(
        digit('9'),
        subtract,
        digit('3'),
        divide,
        ok(6),
        digit('2'),
        add,
        ok(3),
        digit('1'),
        equals,
      )

      expect(state.calculation).toEqual({ operation: 'add', operands: [3, 1] })
    })

    it('keeps the state from before the operator key when the service is unavailable', () => {
      const before = press(digit('2'), add, digit('3'))
      const state = [multiply, unavailable()].reduce(calculatorReducer, before)

      expect(state).toEqual({ ...before, alert: SERVICE_UNAVAILABLE_MESSAGE })
    })
  })

  describe('operator replacement', () => {
    it('replaces the pending operation when a second operator key follows straight after', () => {
      const state = press(digit('2'), add, multiply)

      expect(state.pending).toEqual({ operation: 'multiply', left: 2 })
      expect(state.calculation).toBeNull()
    })

    it('replaces the pending operation set by immediate execution', () => {
      const state = press(
        digit('2'),
        add,
        digit('3'),
        multiply,
        ok(5),
        subtract,
        digit('1'),
        equals,
      )

      expect(state.calculation).toEqual({ operation: 'subtract', operands: [5, 1] })
    })
  })

  describe('repeated equals', () => {
    it('applies the last calculation to the current result', () => {
      const state = press(digit('2'), add, digit('3'), equals, ok(5), equals)

      expect(state.calculation).toEqual({ operation: 'add', operands: [5, 3] })
    })

    it('gives 8 for 2 + 3 = =', () => {
      const state = press(digit('2'), add, digit('3'), equals, ok(5), equals, ok(8))

      expect(displayText(state)).toBe('8')
    })

    it('keeps applying the last calculation on every further equals', () => {
      const state = press(digit('9'), subtract, digit('2'), equals, ok(7), equals, ok(5), equals)

      expect(state.calculation).toEqual({ operation: 'subtract', operands: [5, 2] })
    })

    it('repeats the calculation that immediate execution applied last', () => {
      const state = press(
        digit('2'),
        add,
        digit('3'),
        multiply,
        ok(5),
        digit('4'),
        equals,
        ok(20),
        equals,
      )

      expect(state.calculation).toEqual({ operation: 'multiply', operands: [20, 4] })
    })

    it('does nothing on equals when there is no last calculation', () => {
      const state = press(digit('2'), equals)

      expect(calculatorReducer(state, equals)).toBe(state)
    })
  })

  describe('after a result', () => {
    const afterResult = () => press(digit('2'), add, digit('3'), equals, ok(5))

    it('uses a new entry, not the result, as the next left operand', () => {
      const state = [digit('7'), subtract, digit('1'), equals].reduce(
        calculatorReducer,
        afterResult(),
      )

      expect(state.calculation).toEqual({ operation: 'subtract', operands: [7, 1] })
    })

    it('does nothing on equals once a new entry has been typed', () => {
      const state = calculatorReducer(afterResult(), digit('7'))

      expect(calculatorReducer(state, equals)).toBe(state)
    })

    it('uses the result as the left operand of an operator key', () => {
      const state = calculatorReducer(afterResult(), multiply)

      expect(state.pending).toEqual({ operation: 'multiply', left: 5 })
      expect(displayText(state)).toBe('5')
    })

    it('uses the result as the left operand of the next calculation', () => {
      const state = [multiply, digit('4'), equals].reduce(calculatorReducer, afterResult())

      expect(state.calculation).toEqual({ operation: 'multiply', operands: [5, 4] })
    })
  })
})
