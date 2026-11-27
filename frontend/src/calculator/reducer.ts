import { formatForDisplay } from './format'
import type { Calculation, OperationName, Outcome } from './operations'

/** The operations an operator key can make the pending operation; percent is applied at once instead. */
export type PendableOperationName = Exclude<OperationName, 'percent'>

/** A binary operation waiting for its right operand. */
export type PendingOperation = { operation: PendableOperationName; left: number }

export type CalculatorState = {
  /** The number being typed, or '' when nothing is being typed; '0' is a typed zero and makes the operand 0. */
  entry: string
  /** The latest result, at full precision. */
  result: number | null
  /** The percent key's result, which stands in for the entry until the next key. */
  percentResult: number | null
  /** The binary operation waiting for its right operand. */
  pending: PendingOperation | null
  /** The calculation the service must evaluate before the next key, if any. */
  calculation: Calculation | null
  /** The operation whose operator key sent the calculation; it becomes the pending operation once the result arrives. */
  nextOperation: PendableOperationName | null
  /** The most recently evaluated binary operation with its right operand, for repeated equals. */
  lastCalculation: { operation: OperationName; right: number } | null
  /** The service alert's message after service unavailable, until the next keypress. */
  serviceAlert: string | null
  /** The service's maths error message, which replaces the display until a digit, decimal point or clear. */
  mathsError: string | null
}

export type KeyEvent =
  | { type: 'digit'; digit: string }
  | { type: 'decimalPoint' }
  | { type: 'deleteLastDigit' }
  | { type: 'clear' }
  | { type: 'operator'; operation: PendableOperationName }
  | { type: 'equals' }
  | { type: 'percent' }

export type CalculatorEvent = KeyEvent | { type: 'outcome'; outcome: Outcome }

export const initialState: CalculatorState = {
  entry: '',
  result: null,
  percentResult: null,
  pending: null,
  calculation: null,
  nextOperation: null,
  lastCalculation: null,
  serviceAlert: null,
  mathsError: null,
}

/** An entry stops accepting digits once it holds this many significant digits. */
const MAX_SIGNIFICANT_DIGITS = 15

/** Every keypad rule. It never does arithmetic: results arrive as outcome events. */
export function calculatorReducer(state: CalculatorState, event: CalculatorEvent): CalculatorState {
  if (event.type === 'outcome') return applyOutcome(state, event.outcome)
  // Keys are ignored while a calculation is in flight.
  if (state.calculation !== null) return state
  if (state.mathsError !== null) return recoverFromMathsError(state, event)
  // Any keypress dismisses the service alert.
  return applyKey(state.serviceAlert === null ? state : { ...state, serviceAlert: null }, event)
}

/** After a maths error the chain is gone: a digit or decimal point starts a new entry, clear resets, and every other key is ignored. */
function recoverFromMathsError(state: CalculatorState, event: KeyEvent): CalculatorState {
  switch (event.type) {
    case 'digit':
    case 'decimalPoint':
    case 'clear':
      return applyKey(initialState, event)
    default:
      return state
  }
}

function applyKey(state: CalculatorState, event: KeyEvent): CalculatorState {
  switch (event.type) {
    case 'digit':
      if (significantDigits(state.entry) >= MAX_SIGNIFICANT_DIGITS) return state
      return {
        ...state,
        entry: (state.entry === '0' ? '' : state.entry) + event.digit,
        percentResult: null,
      }
    case 'decimalPoint':
      if (state.entry.includes('.')) return state
      return {
        ...state,
        entry: (state.entry === '' ? '0' : state.entry) + '.',
        percentResult: null,
      }
    case 'deleteLastDigit':
      if (state.entry === '') return state
      return { ...state, entry: state.entry.slice(0, -1) || '0' }
    case 'clear':
      return initialState
    case 'operator': {
      const right = rightOperand(state)
      if (state.pending !== null && right !== null) {
        return {
          ...state,
          calculation: pendingCalculation(state.pending, right),
          nextOperation: event.operation,
        }
      }
      return {
        ...state,
        entry: '',
        percentResult: null,
        pending: { operation: event.operation, left: currentNumber(state) },
      }
    }
    case 'equals': {
      if (state.pending === null) return repeatedEquals(state)
      const right = rightOperand(state)
      if (right === null) return state
      return { ...state, calculation: pendingCalculation(state.pending, right) }
    }
    case 'percent':
      if (state.pending !== null && rightOperand(state) === null) return state
      return {
        ...state,
        calculation: { operation: 'percent', operands: [currentNumber(state), percentBase(state)] },
      }
  }
}

/** The left operand when add or subtract is pending, otherwise 1 (ADR-0003). */
function percentBase({ pending }: CalculatorState): number {
  return pending?.operation === 'add' || pending?.operation === 'subtract' ? pending.left : 1
}

function applyOutcome(state: CalculatorState, outcome: Outcome): CalculatorState {
  const { calculation } = state
  if (calculation === null) return state
  switch (outcome.kind) {
    case 'ok':
      if (calculation.operation === 'percent') {
        // The percent result stands in for the entry; the pending operation and last calculation are kept.
        return {
          ...state,
          entry: '',
          percentResult: outcome.result,
          calculation: null,
          serviceAlert: null,
        }
      }
      return {
        entry: '',
        result: outcome.result,
        percentResult: null,
        pending:
          state.nextOperation === null
            ? null
            : { operation: state.nextOperation, left: outcome.result },
        calculation: null,
        nextOperation: null,
        lastCalculation: { operation: calculation.operation, right: calculation.operands[1] },
        serviceAlert: null,
        mathsError: null,
      }
    case 'unavailable':
      // The state from before the keypress, so the person can press the key again.
      return { ...state, calculation: null, nextOperation: null, serviceAlert: outcome.message }
    case 'maths_error':
      // The message replaces the display and the calculation chain is reset.
      return { ...initialState, mathsError: outcome.message }
  }
}

/** The digits of an entry, not counting the decimal point or zeros before the first non-zero digit. */
function significantDigits(entry: string): number {
  return entry.replace('.', '').replace(/^0+/, '').length
}

/** Equals with nothing pending applies the last calculation again to the current result. */
function repeatedEquals(state: CalculatorState): CalculatorState {
  if (rightOperand(state) !== null || state.lastCalculation === null) return state
  const { operation, right } = state.lastCalculation
  return { ...state, calculation: { operation, operands: [currentNumber(state), right] } }
}

function pendingCalculation(pending: PendingOperation, right: number): Calculation {
  return { operation: pending.operation, operands: [pending.left, right] }
}

/** The number typed or produced by the percent key since the last operator key, if any. */
function rightOperand(state: CalculatorState): number | null {
  if (state.entry !== '') return Number(state.entry)
  return state.percentResult
}

/** What the display shows for a state. */
export function displayText(state: CalculatorState): string {
  if (state.mathsError !== null) return state.mathsError
  if (state.entry !== '') return state.entry
  return formatForDisplay(currentNumber(state))
}

function currentNumber(state: CalculatorState): number {
  return rightOperand(state) ?? state.pending?.left ?? state.result ?? 0
}
