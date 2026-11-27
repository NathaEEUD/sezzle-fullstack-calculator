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
  /** The service alert's message after service unavailable, until the next keypress. */
  alert: string | null
}

export type KeyEvent =
  | { type: 'digit'; digit: string }
  | { type: 'operator'; operation: OperationName }
  | { type: 'equals' }

export type CalculatorEvent = KeyEvent | { type: 'outcome'; outcome: Outcome }

export const initialState: CalculatorState = {
  entry: '',
  result: null,
  pending: null,
  calculation: null,
  nextOperation: null,
  lastCalculation: null,
  alert: null,
}

/** Every keypad rule. It never does arithmetic: results arrive as outcome events. */
export function calculatorReducer(state: CalculatorState, event: CalculatorEvent): CalculatorState {
  if (event.type === 'outcome') return applyOutcome(state, event.outcome)
  // Keys are ignored while a calculation is in flight.
  if (state.calculation !== null) return state
  // Any keypress dismisses the service alert.
  return applyKey(state.alert === null ? state : { ...state, alert: null }, event)
}

function applyKey(state: CalculatorState, event: KeyEvent): CalculatorState {
  switch (event.type) {
    case 'digit':
      return { ...state, entry: state.entry + event.digit }
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
  }
}

function applyOutcome(state: CalculatorState, outcome: Outcome): CalculatorState {
  const { calculation } = state
  if (calculation === null) return state
  switch (outcome.kind) {
    case 'ok':
      return {
        entry: '',
        result: outcome.result,
        pending:
          state.nextOperation === null
            ? null
            : { operation: state.nextOperation, left: outcome.result },
        calculation: null,
        nextOperation: null,
        lastCalculation: { operation: calculation.operation, right: calculation.operands[1] },
        alert: null,
      }
    case 'unavailable':
      // The state from before the keypress, so the person can press the key again.
      return { ...state, calculation: null, nextOperation: null, alert: outcome.message }
    case 'maths_error':
      return { ...state, calculation: null, nextOperation: null }
  }
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
