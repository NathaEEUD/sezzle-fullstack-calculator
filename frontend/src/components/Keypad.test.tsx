import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { KeyEvent } from '../calculator/reducer'
import { Keypad } from './Keypad'

/** Every key by accessible name, with each keyboard key bound to it in user-event syntax. */
const BINDINGS: [name: string, keyboard: string[]][] = [
  ...[...'0123456789'].map((d): [string, string[]] => [d, [d]]),
  ['decimal point', ['.']],
  ['add', ['+']],
  ['subtract', ['-']],
  ['multiply', ['*']],
  ['divide', ['/']],
  ['power', ['^']],
  ['percent', ['%']],
  ['square root', ['r']],
  ['equals', ['{Enter}', '=']],
  ['delete last digit', ['{Backspace}']],
  ['clear', ['{Escape}']],
]

function renderKeypad() {
  const events: KeyEvent[] = []
  const onKey = vi.fn((event: KeyEvent) => events.push(event))
  render(<Keypad onKey={onKey} />)
  return { events, onKey }
}

describe('Keypad', () => {
  it('binds a keyboard key to every key on the keypad', () => {
    renderKeypad()

    const bound = BINDINGS.map(([name]) => name).sort()
    const keys = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
    expect(keys.sort()).toEqual(bound)
  })

  it.each(BINDINGS)(
    'dispatches the same event for the %s key from a click and from the keyboard',
    async (name, keyboard) => {
      const user = userEvent.setup()
      const { events } = renderKeypad()

      await user.click(screen.getByRole('button', { name }))
      const [clicked] = events.splice(0)

      for (const key of keyboard) {
        ;(document.activeElement as HTMLElement | null)?.blur()
        await user.keyboard(key)
        expect(events.splice(0)).toEqual([clicked])
      }
    },
  )

  it.each(['Control', 'Meta', 'Alt'])(
    'leaves %s shortcuts such as reload and zoom to the browser',
    async (modifier) => {
      const user = userEvent.setup()
      const { onKey } = renderKeypad()
      const defaultPrevented: boolean[] = []
      const record = (event: KeyboardEvent) => defaultPrevented.push(event.defaultPrevented)
      window.addEventListener('keydown', record)

      await user.keyboard(`{${modifier}>}r-={/${modifier}}`)

      window.removeEventListener('keydown', record)
      expect(onKey).not.toHaveBeenCalled()
      expect(defaultPrevented).not.toContain(true)
    },
  )
})
