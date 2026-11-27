import type { KeyEvent } from '../calculator/useCalculator'
import styles from './Keypad.module.css'

type Key = { label: string; name: string; event: KeyEvent }

const digit = (d: string): Key => ({ label: d, name: d, event: { type: 'digit', digit: d } })

const KEYS: Key[] = [
  ...['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'].map(digit),
  { label: '+', name: 'add', event: { type: 'operator', operation: 'add' } },
  { label: '=', name: 'equals', event: { type: 'equals' } },
]

export function Keypad({ onKey }: { onKey: (key: KeyEvent) => void }) {
  return (
    <div className={styles.keypad}>
      {KEYS.map((key) => (
        <button
          key={key.name}
          type="button"
          className={styles.key}
          aria-label={key.name}
          onClick={() => onKey(key.event)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
