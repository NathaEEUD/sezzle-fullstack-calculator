/** Every operation the service evaluates, with its arity. Kept equal to the service registry. */
export const OPERATIONS = [
  { name: 'add', arity: 2 },
  { name: 'divide', arity: 2 },
  { name: 'multiply', arity: 2 },
  { name: 'percent', arity: 2 },
  { name: 'power', arity: 2 },
  { name: 'sqrt', arity: 1 },
  { name: 'subtract', arity: 2 },
] as const

type Operation = (typeof OPERATIONS)[number]

export type OperationName = Operation['name']

/** An operation that takes a left operand and a right operand. */
export type BinaryOperationName = Extract<Operation, { arity: 2 }>['name']

/** An operation that takes one operand. */
export type UnaryOperationName = Extract<Operation, { arity: 1 }>['name']

/** One operation applied to its operands: the unit of work the service evaluates. */
export type Calculation = BinaryCalculation | UnaryCalculation

export type BinaryCalculation = { operation: BinaryOperationName; operands: [number, number] }

export type UnaryCalculation = { operation: UnaryOperationName; operands: [number] }

/** What became of a calculation sent to the service. */
export type Outcome =
  | { kind: 'ok'; result: number }
  | { kind: 'maths_error'; message: string }
  | { kind: 'unavailable'; message: string }
