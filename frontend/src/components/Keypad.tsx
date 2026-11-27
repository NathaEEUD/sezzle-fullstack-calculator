import type { OperationName } from '../calculator/operations'
import type { KeyEvent } from '../calculator/reducer'
import styles from './Keypad.module.css'

type Key = { label: string; name: string; event: KeyEvent; wide?: boolean }

const digit = (d: string): Key => ({ label: d, name: d, event: { type: 'digit', digit: d } })

const operator = (label: string, operation: OperationName): Key => ({
  label,
  name: operation,
  event: { type: 'operator', operation },
})

/** In reading order on a four-column grid, operator keys down the right. */
const KEYS: Key[] = [
  { label: 'C', name: 'clear', event: { type: 'clear' }, wide: true },
  { label: '⌫', name: 'delete last digit', event: { type: 'deleteLastDigit' }, wide: true },
  ...['7', '8', '9'].map(digit),
  operator('÷', 'divide'),
  ...['4', '5', '6'].map(digit),
  operator('×', 'multiply'),
  ...['1', '2', '3'].map(digit),
  operator('−', 'subtract'),
  digit('0'),
  { label: '.', name: 'decimal point', event: { type: 'decimalPoint' } },
  { label: '=', name: 'equals', event: { type: 'equals' } },
  operator('+', 'add'),
]

export function Keypad({ onKey }: { onKey: (key: KeyEvent) => void }) {
  return (
    <div className={styles.keypad}>
      {KEYS.map((key) => (
        <button
          key={key.name}
          type="button"
          className={key.wide ? `${styles.key} ${styles.wide}` : styles.key}
          aria-label={key.name}
          onClick={() => onKey(key.event)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
