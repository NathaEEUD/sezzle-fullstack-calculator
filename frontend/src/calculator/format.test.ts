import { describe, expect, it } from 'vitest'
import { formatForDisplay } from './format'

describe('formatForDisplay', () => {
  it.each([
    // Whole numbers and signs
    ['zero', 0, '0'],
    ['−0 is shown as 0', -0, '0'],
    ['a whole result', 5, '5'],
    ['a negative result', -3, '-3'],
    // At most 12 significant digits
    ['a result that fits in 12 significant digits', 123456.789, '123456.789'],
    ['a repeating fraction rounded to 12 significant digits', 2 / 3, '0.666666666667'],
    ['a negative repeating fraction', -1 / 3, '-0.333333333333'],
    ['a 12-digit whole result', 999999999999, '999999999999'],
    ['a whole part of 12 digits drops its fraction', 123456789012.4, '123456789012'],
    // Trailing zeros stripped
    ['floating-point noise rounds away', 0.1 + 0.2, '0.3'],
    ['trailing zeros after rounding', 1.10000000000001, '1.1'],
    ['a fraction that rounds to a whole number', 2.9999999999999, '3'],
    // Exponent notation at ≥ 1e12
    ['1e12', 1e12, '1e+12'],
    ['a result that rounds up to 1e12', 999999999999.6, '1e+12'],
    ['a large result rounded to 12 significant digits', 1234567890123456, '1.23456789012e+15'],
    ['a large negative result', -1e12, '-1e+12'],
    ['the largest finite result', Number.MAX_VALUE, '1.79769313486e+308'],
    // Exponent notation below 1e-9
    ['1e-9 is still plain', 1e-9, '0.000000001'],
    ['a small result keeps 12 significant digits', 1.23456789012345e-9, '0.00000000123456789012'],
    ['a result plain JavaScript would write as 1e-7', 1e-7, '0.0000001'],
    ['just under 1e-9', 9.99e-10, '9.99e-10'],
    ['a tiny result', 1e-10, '1e-10'],
    ['a tiny negative result', -2.5e-15, '-2.5e-15'],
  ])('%s', (_, value, expected) => {
    expect(formatForDisplay(value)).toBe(expected)
  })
})
