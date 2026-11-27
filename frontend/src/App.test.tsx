import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the calculator with its display', () => {
    render(<App />)

    expect(screen.getByRole('status', { name: 'display' })).toHaveTextContent(/^0$/)
  })
})
