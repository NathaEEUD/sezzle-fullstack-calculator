import type { KeyEvent, PendableOperationName } from '../calculator/reducer'
import styles from './Keypad.module.css'

type Key = { label: string; name: string; event: KeyEvent; fullRow?: boolean }

const digit = (d: string): Key => ({ label: d, name: d, event: { type: 'digit', digit: d } })

const operator = (label: string, operation: PendableOperationName): Key => ({
  label,
  name: operation,
  event: { type: 'operator', operation },
})

/** In reading order on a four-column grid, operator keys down the right and equals across the bottom row. */
const KEYS: Key[] = [
  { label: 'C', name: 'clear', event: { type: 'clear' } },
  { label: '⌫', name: 'delete last digit', event: { type: 'deleteLastDigit' } },
  { label: '√', name: 'square root', event: { type: 'unaryOperator', operation: 'sqrt' } },
  operator('xʸ', 'power'),
  ...['7', '8', '9'].map(digit),
  operator('÷', 'divide'),
  ...['4', '5', '6'].map(digit),
  operator('×', 'multiply'),
  ...['1', '2', '3'].map(digit),
  operator('−', 'subtract'),
  digit('0'),
  { label: '.', name: 'decimal point', event: { type: 'decimalPoint' } },
  { label: '%', name: 'percent', event: { type: 'percent' } },
  operator('+', 'add'),
  { label: '=', name: 'equals', event: { type: 'equals' }, fullRow: true },
]

export function Keypad({ onKey }: { onKey: (key: KeyEvent) => void }) {
  return (
    <div className={styles.keypad}>
      {KEYS.map((key) => (
        <button
          key={key.name}
          type="button"
          className={key.fullRow ? `${styles.key} ${styles.fullRow}` : styles.key}
          aria-label={key.name}
          onClick={() => onKey(key.event)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
