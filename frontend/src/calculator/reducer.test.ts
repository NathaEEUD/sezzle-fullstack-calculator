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

/** Presses the digit and decimal point keys that spell out an entry, such as '12.5'. */
function typeEntry(keys: string): CalculatorState {
  return press(...[...keys].map((key) => (key === '.' ? decimalPoint : digit(key))))
}

const digit = (d: string): CalculatorEvent => ({ type: 'digit', digit: d })
const operator = (operation: Exclude<OperationName, 'percent'>): CalculatorEvent => ({
  type: 'operator',
  operation,
})
const add = operator('add')
const subtract = operator('subtract')
const multiply = operator('multiply')
const divide = operator('divide')
const equals: CalculatorEvent = { type: 'equals' }
const decimalPoint: CalculatorEvent = { type: 'decimalPoint' }
const deleteLastDigit: CalculatorEvent = { type: 'deleteLastDigit' }
const clear: CalculatorEvent = { type: 'clear' }
const percent: CalculatorEvent = { type: 'percent' }
const ok = (result: number): CalculatorEvent => ({
  type: 'outcome',
  outcome: { kind: 'ok', result },
})
const mathsError = (message: string): CalculatorEvent => ({
  type: 'outcome',
  outcome: { kind: 'maths_error', message },
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

      expect(state).toEqual({ ...before, serviceAlert: SERVICE_UNAVAILABLE_MESSAGE })
      expect(displayText(state)).toBe('3')
    })

    it("shows the service's message in the service alert", () => {
      const state = press(digit('2'), add, digit('3'), equals, unavailable('internal error'))

      expect(state.serviceAlert).toBe('internal error')
    })

    it.each([
      ['a digit key', digit('4'), '34'],
      ['an operator key', multiply, '3'],
      ['equals', equals, '3'],
      ['the decimal point key', decimalPoint, '3.'],
      ['delete last digit', deleteLastDigit, '0'],
      ['clear', clear, '0'],
    ])('clears the service alert on the next keypress, %s', (_, key, display) => {
      const state = calculatorReducer(
        press(digit('2'), add, digit('3'), equals, unavailable()),
        key,
      )

      expect(state.serviceAlert).toBeNull()
      expect(displayText(state)).toBe(display)
    })

    it('sends the same calculation again when equals is pressed to retry', () => {
      const state = press(digit('2'), add, digit('3'), equals, unavailable(), equals)

      expect(state.calculation).toEqual({ operation: 'add', operands: [2, 3] })
    })

    it('clears the service alert when the retried calculation comes back', () => {
      const state = press(digit('2'), add, digit('3'), equals, unavailable(), equals, ok(5))

      expect(state.serviceAlert).toBeNull()
      expect(displayText(state)).toBe('5')
    })
  })

  describe('maths error', () => {
    const divideByZero = () =>
      press(digit('5'), divide, digit('0'), equals, mathsError('Cannot divide by zero'))

    it("shows the service's message in the display", () => {
      expect(displayText(divideByZero())).toBe('Cannot divide by zero')
    })

    it('resets the calculation chain', () => {
      const state = divideByZero()

      expect(state).toEqual({ ...initialState, mathsError: 'Cannot divide by zero' })
    })

    it('drops the operation whose operator key sent the calculation', () => {
      const state = press(digit('5'), divide, digit('0'), add, mathsError('Cannot divide by zero'))

      expect(state.pending).toBeNull()
      expect(displayText(state)).toBe('Cannot divide by zero')
    })

    it('starts a new entry when a digit key follows', () => {
      const state = calculatorReducer(divideByZero(), digit('7'))

      expect(state.mathsError).toBeNull()
      expect(displayText(state)).toBe('7')
    })

    it('starts a new entry when the decimal point key follows', () => {
      expect(displayText(calculatorReducer(divideByZero(), decimalPoint))).toBe('0.')
    })

    it('resets on clear', () => {
      expect(calculatorReducer(divideByZero(), clear)).toEqual(initialState)
    })

    it.each([
      ['an operator key', add],
      ['equals', equals],
      ['delete last digit', deleteLastDigit],
    ])('ignores %s while the maths error is shown', (_, key) => {
      const state = divideByZero()

      expect(calculatorReducer(state, key)).toBe(state)
    })

    it('evaluates a new calculation typed after the maths error', () => {
      const state = [digit('6'), add, digit('2'), equals, ok(8)].reduce(
        calculatorReducer,
        divideByZero(),
      )

      expect(displayText(state)).toBe('8')
    })

    it('clears the service alert when a retried calculation comes back as a maths error', () => {
      const state = press(
        digit('5'),
        divide,
        digit('0'),
        equals,
        unavailable(),
        equals,
        mathsError('Cannot divide by zero'),
      )

      expect(state.serviceAlert).toBeNull()
      expect(displayText(state)).toBe('Cannot divide by zero')
    })
  })

  describe('calculation in flight', () => {
    const inFlight = () => press(digit('2'), add, digit('3'), equals)

    it.each([
      ['a digit key', digit('4')],
      ['an operator key', multiply],
      ['equals', equals],
      ['percent', percent],
      ['the decimal point key', decimalPoint],
      ['delete last digit', deleteLastDigit],
      ['clear', clear],
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

      expect(state).toEqual({ ...before, serviceAlert: SERVICE_UNAVAILABLE_MESSAGE })
    })
  })

  describe('percent', () => {
    it.each([
      ['add', add, [10, 200]],
      ['subtract', subtract, [10, 200]],
      ['multiply', multiply, [10, 1]],
      ['divide', divide, [10, 1]],
    ])('uses the percent base for %s pending', (_, pendingKey, operands) => {
      const state = press(
        digit('2'),
        digit('0'),
        digit('0'),
        pendingKey,
        digit('1'),
        digit('0'),
        percent,
      )

      expect(state.calculation).toEqual({ operation: 'percent', operands })
    })

    it('uses a percent base of 1 with nothing pending', () => {
      const state = press(digit('1'), digit('0'), percent)

      expect(state.calculation).toEqual({ operation: 'percent', operands: [10, 1] })
    })

    const twoHundredPlusTenPercent = () =>
      press(digit('2'), digit('0'), digit('0'), add, digit('1'), digit('0'), percent, ok(20))

    it('shows the percent result and keeps the pending operation', () => {
      const state = twoHundredPlusTenPercent()

      expect(displayText(state)).toBe('20')
      expect(state.pending).toEqual({ operation: 'add', left: 200 })
      expect(state.calculation).toBeNull()
    })

    it('gives 220 for 200 + 10 % =', () => {
      const state = calculatorReducer(twoHundredPlusTenPercent(), equals)

      expect(state.calculation).toEqual({ operation: 'add', operands: [200, 20] })
      expect(displayText(calculatorReducer(state, ok(220)))).toBe('220')
    })

    it('gives 5 for 50 × 10 % =', () => {
      const state = press(
        digit('5'),
        digit('0'),
        multiply,
        digit('1'),
        digit('0'),
        percent,
        ok(0.1),
        equals,
      )

      expect(state.calculation).toEqual({ operation: 'multiply', operands: [50, 0.1] })
    })

    it('turns 10 into 0.1 with nothing pending', () => {
      const state = press(digit('1'), digit('0'), percent, ok(0.1))

      expect(displayText(state)).toBe('0.1')
      expect(state.pending).toBeNull()
    })

    it('applies the pending operation to the percent result on the next operator key', () => {
      const state = calculatorReducer(twoHundredPlusTenPercent(), multiply)

      expect(state.calculation).toEqual({ operation: 'add', operands: [200, 20] })
    })

    it('uses the percent result as the left operand with nothing pending', () => {
      const state = press(digit('1'), digit('0'), percent, ok(0.1), add)

      expect(state.pending).toEqual({ operation: 'add', left: 0.1 })
    })

    it('starts a new entry when a digit follows the percent result', () => {
      const state = calculatorReducer(twoHundredPlusTenPercent(), digit('5'))

      expect(displayText(state)).toBe('5')
      expect(calculatorReducer(state, equals).calculation).toEqual({
        operation: 'add',
        operands: [200, 5],
      })
    })

    it('takes the percent of the percent result when % is pressed again', () => {
      const state = calculatorReducer(twoHundredPlusTenPercent(), percent)

      expect(state.calculation).toEqual({ operation: 'percent', operands: [20, 200] })
    })

    it('does nothing on % before the right operand is typed', () => {
      const state = press(digit('2'), add)

      expect(calculatorReducer(state, percent)).toBe(state)
    })

    it('repeats the pending operation, not percent, on repeated equals', () => {
      const state = [equals, ok(220), equals].reduce(calculatorReducer, twoHundredPlusTenPercent())

      expect(state.calculation).toEqual({ operation: 'add', operands: [220, 20] })
    })

    it('keeps the state from before % when the service is unavailable', () => {
      const before = press(digit('2'), add, digit('1'), digit('0'))
      const state = [percent, unavailable()].reduce(calculatorReducer, before)

      expect(state).toEqual({ ...before, serviceAlert: SERVICE_UNAVAILABLE_MESSAGE })
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

  describe('entry editing', () => {
    it('adds a fractional part with the decimal point key', () => {
      expect(displayText(press(digit('2'), decimalPoint, digit('5')))).toBe('2.5')
    })

    it('ignores a second decimal point in the same entry', () => {
      const state = press(digit('2'), decimalPoint, digit('5'))

      expect(calculatorReducer(state, decimalPoint)).toBe(state)
    })

    it('shows 0. when the decimal point key starts an entry', () => {
      expect(displayText(press(decimalPoint))).toBe('0.')
    })

    it('starts the right operand at 0. after an operator key', () => {
      const state = press(digit('2'), add, decimalPoint, digit('5'), equals)

      expect(state.calculation).toEqual({ operation: 'add', operands: [2, 0.5] })
    })

    it('drops a leading zero when a digit follows it', () => {
      expect(displayText(press(digit('0'), digit('7')))).toBe('7')
    })

    it('keeps a single 0 when 0 is typed again', () => {
      expect(displayText(press(digit('0'), digit('0'), digit('0')))).toBe('0')
    })

    it('keeps zeros after the decimal point', () => {
      expect(displayText(press(digit('0'), decimalPoint, digit('0'), digit('7')))).toBe('0.07')
    })

    describe('15-significant-digit limit', () => {
      it('accepts 15 significant digits', () => {
        expect(displayText(typeEntry('123456789012345'))).toBe('123456789012345')
      })

      it('ignores a 16th significant digit', () => {
        const state = typeEntry('123456789012345')

        expect(calculatorReducer(state, digit('6'))).toBe(state)
      })

      it('does not count the decimal point', () => {
        expect(displayText(typeEntry('1234567890.123456'))).toBe('1234567890.12345')
      })

      it('does not count zeros before the first non-zero digit', () => {
        expect(displayText(typeEntry('0.00123456789012345'))).toBe('0.00123456789012345')
      })

      it('still accepts the decimal point at the limit', () => {
        expect(displayText(typeEntry('123456789012345.'))).toBe('123456789012345.')
      })
    })
  })

  describe('delete last digit', () => {
    it('removes the last digit of the entry', () => {
      expect(displayText(press(digit('1'), digit('2'), digit('3'), deleteLastDigit))).toBe('12')
    })

    it('removes a trailing decimal point', () => {
      const state = press(digit('2'), decimalPoint, deleteLastDigit)

      expect(displayText(state)).toBe('2')
      expect(displayText(calculatorReducer(state, decimalPoint))).toBe('2.')
    })

    it('leaves 0 when the only digit is removed', () => {
      expect(displayText(press(digit('7'), deleteLastDigit))).toBe('0')
    })

    it('makes the right operand 0 when its only digit is removed', () => {
      const state = press(digit('2'), add, digit('3'), deleteLastDigit, equals)

      expect(state.calculation).toEqual({ operation: 'add', operands: [2, 0] })
    })

    it('does nothing to a result', () => {
      const state = press(digit('2'), add, digit('3'), equals, ok(5))

      expect(calculatorReducer(state, deleteLastDigit)).toBe(state)
    })

    it('does nothing after an operator key', () => {
      const state = press(digit('2'), add)

      expect(calculatorReducer(state, deleteLastDigit)).toBe(state)
    })
  })

  describe('clear', () => {
    it('resets an entry to 0', () => {
      const state = press(digit('4'), decimalPoint, digit('2'), clear)

      expect(state).toEqual(initialState)
      expect(displayText(state)).toBe('0')
    })

    it('forgets the pending operation', () => {
      const state = press(digit('2'), add, digit('3'), clear, digit('4'), equals)

      expect(state.pending).toBeNull()
      expect(state.calculation).toBeNull()
    })

    it('forgets the result and the last calculation', () => {
      const state = press(digit('2'), add, digit('3'), equals, ok(5), clear)

      expect(state).toEqual(initialState)
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
