import { useCallback, useEffect, useReducer } from 'react'
import type { CalculatorClient } from '../api/client'
import { calculatorReducer, displayText, initialState, type KeyEvent } from './reducer'

/** The only code that calls the client: it sends each requested calculation and feeds the outcome back. The reducer ignores keys while that calculation is in flight. */
export function useCalculator(client: CalculatorClient) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)

  useEffect(() => {
    if (state.calculation === null) return
    let current = true
    void client.calculate(state.calculation).then((outcome) => {
      if (current) dispatch({ type: 'outcome', outcome })
    })
    return () => {
      current = false
    }
  }, [client, state.calculation])

  // Stable across renders, so the keypad's keyboard listener isn't re-attached on every keypress.
  const onKey = useCallback((key: KeyEvent) => dispatch(key), [])

  return { display: displayText(state), serviceAlert: state.serviceAlert, onKey }
}
