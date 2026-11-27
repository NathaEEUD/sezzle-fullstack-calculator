/** Every operation the service evaluates, with its arity. Kept equal to the service registry. */
export const OPERATIONS = [
  { name: 'add', arity: 2 },
  { name: 'divide', arity: 2 },
  { name: 'multiply', arity: 2 },
  { name: 'percent', arity: 2 },
  { name: 'subtract', arity: 2 },
] as const

export type OperationName = (typeof OPERATIONS)[number]['name']

/** One operation applied to its operands: the unit of work the service evaluates. */
export type Calculation = {
  operation: OperationName
  operands: number[]
}

/** What became of a calculation sent to the service. */
export type Outcome =
  | { kind: 'ok'; result: number }
  | { kind: 'maths_error'; message: string }
  | { kind: 'unavailable'; message: string }
