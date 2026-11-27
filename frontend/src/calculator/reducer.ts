import type { Calculation, OperationName, Outcome } from './operations'

export type CalculatorState = {
  /** The number being typed, or '' when nothing is being typed. */
  entry: string
  /** The latest result, at full precision. */
  result: number | null
  /** The binary operation waiting for its right operand. */
  pending: { operation: OperationName; left: number } | null
  /** The calculation the service must evaluate before the next key, if any. */
  calculation: Calculation | null
}

export type CalculatorEvent =
  | { type: 'digit'; digit: string }
  | { type: 'operator'; operation: OperationName }
  | { type: 'equals' }
  | { type: 'outcome'; outcome: Outcome }

export const initialState: CalculatorState = {
  entry: '',
  result: null,
  pending: null,
  calculation: null,
}

/** Every keypad rule. It never does arithmetic: results arrive as outcome events. */
export function calculatorReducer(state: CalculatorState, event: CalculatorEvent): CalculatorState {
  switch (event.type) {
    case 'digit':
      return { ...state, entry: state.entry + event.digit }
    case 'operator':
      return {
        ...state,
        entry: '',
        pending: { operation: event.operation, left: currentNumber(state) },
      }
    case 'equals':
      if (state.pending === null || state.entry === '') return state
      return {
        ...state,
        calculation: {
          operation: state.pending.operation,
          operands: [state.pending.left, Number(state.entry)],
        },
      }
    case 'outcome':
      if (event.outcome.kind !== 'ok') return { ...state, calculation: null }
      return { entry: '', result: event.outcome.result, pending: null, calculation: null }
  }
}

/** What the display shows for a state. */
export function displayText(state: CalculatorState): string {
  if (state.entry !== '') return state.entry
  return String(currentNumber(state))
}

function currentNumber(state: CalculatorState): number {
  if (state.entry !== '') return Number(state.entry)
  return state.pending?.left ?? state.result ?? 0
}
