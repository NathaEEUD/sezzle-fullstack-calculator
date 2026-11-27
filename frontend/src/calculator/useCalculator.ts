import { useEffect, useReducer } from 'react'
import type { CalculatorClient } from '../api/client'
import { calculatorReducer, displayText, initialState, type CalculatorEvent } from './reducer'

export type KeyEvent = Exclude<CalculatorEvent, { type: 'outcome' }>

/** The only code that calls the client: it sends each requested calculation and feeds the outcome back. */
export function useCalculator(client: CalculatorClient) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)

  useEffect(() => {
    if (state.request === null) return
    let current = true
    void client.calculate(state.request).then((outcome) => {
      if (current) dispatch({ type: 'outcome', outcome })
    })
    return () => {
      current = false
    }
  }, [client, state.request])

  return { display: displayText(state), onKey: (key: KeyEvent) => dispatch(key) }
}
