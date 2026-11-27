import type { CalculatorClient } from '../api/client'
import { useCalculator } from '../calculator/useCalculator'
import styles from './Calculator.module.css'
import { Display } from './Display'
import { Keypad } from './Keypad'
import { ServiceAlert } from './ServiceAlert'

export function Calculator({ client }: { client: CalculatorClient }) {
  const { display, serviceAlert, onKey } = useCalculator(client)
  return (
    <main className={styles.calculator}>
      <h1 className={styles.title}>Calculator</h1>
      <Display text={display} />
      <ServiceAlert message={serviceAlert} />
      <Keypad onKey={onKey} />
    </main>
  )
}
