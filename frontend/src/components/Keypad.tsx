import { useEffect } from 'react'
import type { KeyEvent, PendableOperationName } from '../calculator/reducer'
import styles from './Keypad.module.css'

/** `keyboardKeys` lists the `KeyboardEvent.key` values bound to the key. */
type Key = {
  label: string
  name: string
  event: KeyEvent
  keyboardKeys: string[]
  variant?: 'operator' | 'equals'
}

const digit = (d: string): Key => ({
  label: d,
  name: d,
  event: { type: 'digit', digit: d },
  keyboardKeys: [d],
})

const operator = (label: string, operation: PendableOperationName, keyboardKey: string): Key => ({
  label,
  name: operation,
  event: { type: 'operator', operation },
  keyboardKeys: [keyboardKey],
  variant: 'operator',
})

/** In reading order on a four-column grid, operator keys down the right and equals across the bottom row. */
const KEYS: Key[] = [
  { label: 'C', name: 'clear', event: { type: 'clear' }, keyboardKeys: ['Escape'] },
  {
    label: '⌫',
    name: 'delete last digit',
    event: { type: 'deleteLastDigit' },
    keyboardKeys: ['Backspace'],
  },
  {
    label: '√',
    name: 'square root',
    event: { type: 'unaryOperator', operation: 'sqrt' },
    keyboardKeys: ['r', 'R'],
    variant: 'operator',
  },
  operator('xʸ', 'power', '^'),
  ...['7', '8', '9'].map(digit),
  operator('÷', 'divide', '/'),
  ...['4', '5', '6'].map(digit),
  operator('×', 'multiply', '*'),
  ...['1', '2', '3'].map(digit),
  operator('−', 'subtract', '-'),
  digit('0'),
  { label: '.', name: 'decimal point', event: { type: 'decimalPoint' }, keyboardKeys: ['.'] },
  {
    label: '%',
    name: 'percent',
    event: { type: 'percent' },
    keyboardKeys: ['%'],
    variant: 'operator',
  },
  operator('+', 'add', '+'),
  {
    label: '=',
    name: 'equals',
    event: { type: 'equals' },
    keyboardKeys: ['Enter', '='],
    variant: 'equals',
  },
]

const EVENT_BY_KEYBOARD_KEY = new Map(
  KEYS.flatMap((key) => key.keyboardKeys.map((keyboardKey) => [keyboardKey, key.event])),
)

/** Keyboard input dispatches the same events as clicks, wherever focus is on the page. */
function useKeyboard(onKey: (key: KeyEvent) => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Shift stays allowed: it types * + % ^ on most layouts.
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const keyEvent = EVENT_BY_KEYBOARD_KEY.get(event.key)
      if (keyEvent === undefined) return
      // A bound key wins over the focused button, so Enter is always equals.
      event.preventDefault()
      onKey(keyEvent)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKey])
}

export function Keypad({ onKey }: { onKey: (key: KeyEvent) => void }) {
  useKeyboard(onKey)
  return (
    <div className={styles.keypad}>
      {KEYS.map((key) => (
        <button
          key={key.name}
          type="button"
          className={key.variant ? `${styles.key} ${styles[key.variant]}` : styles.key}
          aria-label={key.name}
          onClick={() => onKey(key.event)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
