import { formatForDisplay } from './format'
import type { Calculation, OperationName, Outcome } from './operations'

/** A binary operation waiting for its right operand. */
export type PendingOperation = { operation: OperationName; left: number }

export type CalculatorState = {
  /** The number being typed, or '' when nothing is being typed. */
  entry: string
  /** The latest result, at full precision. */
  result: number | null
  /** The binary operation waiting for its right operand. */
  pending: PendingOperation | null
  /** The calculation the service must evaluate before the next key, if any. */
  calculation: Calculation | null
  /** The operation whose operator key sent the calculation; it becomes the pending operation once the result arrives. */
  nextOperation: OperationName | null
  /** The most recently evaluated binary operation with its right operand, for repeated equals. */
  lastCalculation: { operation: OperationName; right: number } | null
}

export type CalculatorEvent =
  | { type: 'digit'; digit: string }
  | { type: 'decimalPoint' }
  | { type: 'deleteLastDigit' }
  | { type: 'clear' }
  | { type: 'operator'; operation: OperationName }
  | { type: 'equals' }
  | { type: 'outcome'; outcome: Outcome }

export const initialState: CalculatorState = {
  entry: '',
  result: null,
  pending: null,
  calculation: null,
  nextOperation: null,
  lastCalculation: null,
}

/** An entry stops accepting digits once it holds this many significant digits. */
const MAX_SIGNIFICANT_DIGITS = 15

/** Every keypad rule. It never does arithmetic: results arrive as outcome events. */
export function calculatorReducer(state: CalculatorState, event: CalculatorEvent): CalculatorState {
  switch (event.type) {
    case 'digit':
      if (significantDigits(state.entry) >= MAX_SIGNIFICANT_DIGITS) return state
      return { ...state, entry: (state.entry === '0' ? '' : state.entry) + event.digit }
    case 'decimalPoint':
      if (state.entry.includes('.')) return state
      return { ...state, entry: (state.entry === '' ? '0' : state.entry) + '.' }
    case 'deleteLastDigit':
      if (state.entry === '') return state
      return { ...state, entry: state.entry.slice(0, -1) || '0' }
    case 'clear':
      return initialState
    case 'operator':
      if (state.pending !== null && state.entry !== '') {
        return {
          ...state,
          calculation: pendingCalculation(state.pending, state.entry),
          nextOperation: event.operation,
        }
      }
      return {
        ...state,
        entry: '',
        pending: { operation: event.operation, left: currentNumber(state) },
      }
    case 'equals':
      if (state.pending === null) return repeatedEquals(state)
      if (state.entry === '') return state
      return { ...state, calculation: pendingCalculation(state.pending, state.entry) }
    case 'outcome': {
      const { calculation } = state
      if (calculation === null) return state
      if (event.outcome.kind !== 'ok') return { ...state, calculation: null, nextOperation: null }
      const result = event.outcome.result
      return {
        entry: '',
        result,
        pending:
          state.nextOperation === null ? null : { operation: state.nextOperation, left: result },
        calculation: null,
        nextOperation: null,
        lastCalculation: { operation: calculation.operation, right: calculation.operands[1] },
      }
    }
  }
}

/** The digits of an entry, not counting the decimal point or zeros before the first non-zero digit. */
function significantDigits(entry: string): number {
  return entry.replace('.', '').replace(/^0+/, '').length
}

/** Equals with nothing pending applies the last calculation again to the current result. */
function repeatedEquals(state: CalculatorState): CalculatorState {
  if (state.entry !== '' || state.lastCalculation === null) return state
  const { operation, right } = state.lastCalculation
  return { ...state, calculation: { operation, operands: [currentNumber(state), right] } }
}

function pendingCalculation(pending: PendingOperation, entry: string): Calculation {
  return { operation: pending.operation, operands: [pending.left, Number(entry)] }
}

/** What the display shows for a state. */
export function displayText(state: CalculatorState): string {
  if (state.entry !== '') return state.entry
  return formatForDisplay(currentNumber(state))
}

function currentNumber(state: CalculatorState): number {
  if (state.entry !== '') return Number(state.entry)
  return state.pending?.left ?? state.result ?? 0
}
