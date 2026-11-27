import type { CalculatorClient } from '../api/client'
import { useCalculator } from '../calculator/useCalculator'
import styles from './Calculator.module.css'
import { Display } from './Display'
import { Keypad } from './Keypad'

export function Calculator({ client }: { client: CalculatorClient }) {
  const { display, onKey } = useCalculator(client)
  return (
    <main className={styles.calculator}>
      <h1 className={styles.title}>Calculator</h1>
      <Display text={display} />
      <Keypad onKey={onKey} />
    </main>
  )
}
