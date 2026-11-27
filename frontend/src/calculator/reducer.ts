import { formatForDisplay } from './format'
import type {
  BinaryCalculation,
  BinaryOperationName,
  Calculation,
  Outcome,
  UnaryCalculation,
  UnaryOperationName,
} from './operations'

/** The binary operations an operator key can make the pending operation; percent is applied at once instead. */
export type PendableOperationName = Exclude<BinaryOperationName, 'percent'>

/** A binary operation waiting for its right operand. */
export type PendingOperation = { operation: PendableOperationName; left: number }

export type CalculatorState = {
  /**
   * The number being typed, or '' when nothing is being typed; '0' is a typed zero and makes the operand 0.
   * A number is a unary operation's result standing as the entry: a digit or decimal point replaces it.
   */
  entry: string | number
  /** The latest result, at full precision. */
  result: number | null
  /** The binary operation waiting for its right operand. */
  pending: PendingOperation | null
  /** The calculation the service must evaluate before the next key, if any. */
  calculation: Calculation | null
  /** The operation whose operator key sent the calculation; it becomes the pending operation once the result arrives. */
  nextOperation: PendableOperationName | null
  /** The most recently evaluated binary operation with its right operand, for repeated equals. */
  lastCalculation: { operation: BinaryOperationName; right: number } | null
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
  | { type: 'unaryOperator'; operation: UnaryOperationName }
  | { type: 'percent' }
  | { type: 'equals' }

export type CalculatorEvent = KeyEvent | { type: 'outcome'; outcome: Outcome }

export const initialState: CalculatorState = {
  entry: '',
  result: null,
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
    case 'digit': {
      const typed = typedEntry(state)
      if (significantDigits(typed) >= MAX_SIGNIFICANT_DIGITS) return state
      return { ...state, entry: (typed === '0' ? '' : typed) + event.digit }
    }
    case 'decimalPoint': {
      const typed = typedEntry(state)
      if (typed.includes('.')) return state
      return { ...state, entry: (typed === '' ? '0' : typed) + '.' }
    }
    case 'deleteLastDigit':
      if (typeof state.entry !== 'string' || state.entry === '') return state
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
    case 'unaryOperator':
      return {
        ...state,
        calculation: { operation: event.operation, operands: [currentNumber(state)] },
      }
    case 'percent':
      if (state.pending !== null && state.entry === '') return state
      return {
        ...state,
        calculation: { operation: 'percent', operands: [currentNumber(state), percentBase(state)] },
      }
    case 'equals':
      if (state.pending === null) return repeatedEquals(state)
      if (state.entry === '') return state
      return { ...state, calculation: pendingCalculation(state.pending, state.entry) }
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
      if (isUnary(calculation) || calculation.operation === 'percent') {
        // Applied at once: its result becomes the entry, and the pending operation and last calculation stay.
        return { ...state, entry: outcome.result, calculation: null, serviceAlert: null }
      }
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

/** The entry as typed so far: a unary operation's result counts as nothing typed. */
function typedEntry(state: CalculatorState): string {
  return typeof state.entry === 'string' ? state.entry : ''
}

function isUnary(calculation: Calculation): calculation is UnaryCalculation {
  return calculation.operands.length === 1
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

function pendingCalculation(pending: PendingOperation, entry: string | number): BinaryCalculation {
  return { operation: pending.operation, operands: [pending.left, Number(entry)] }
}

/** What the display shows for a state. */
export function displayText(state: CalculatorState): string {
  if (state.mathsError !== null) return state.mathsError
  if (typeof state.entry === 'string' && state.entry !== '') return state.entry
  return formatForDisplay(currentNumber(state))
}

function currentNumber(state: CalculatorState): number {
  if (state.entry !== '') return Number(state.entry)
  return state.pending?.left ?? state.result ?? 0
}
