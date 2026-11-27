const SIGNIFICANT_DIGITS = 12
const EXPONENT_AT_OR_ABOVE = 1e12
const EXPONENT_BELOW = 1e-9

/**
 * A result rounded for reading: at most 12 significant digits, no trailing
 * zeros, exponent notation at ≥ 1e12 or < 1e-9, and −0 as 0. Only the display
 * uses it; state keeps the full-precision result.
 */
export function formatForDisplay(result: number): string {
  if (result === 0) return '0'
  const rounded = Number(result.toPrecision(SIGNIFICANT_DIGITS))
  const magnitude = Math.abs(rounded)
  if (magnitude >= EXPONENT_AT_OR_ABOVE || magnitude < EXPONENT_BELOW) {
    return rounded.toExponential()
  }
  const plain = String(rounded)
  // JavaScript switches to exponent notation below 1e-6; write those out in full.
  return plain.includes('e') ? stripTrailingZeros(rounded.toFixed(20)) : plain
}

function stripTrailingZeros(fixed: string): string {
  return fixed.replace(/\.?0+$/, '')
}
