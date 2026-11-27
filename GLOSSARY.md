# Calculator

A keypad calculator. The person enters numbers and operations, and each calculation is evaluated by a stateless service.

## Language

### Arithmetic

**Operation**:
A named arithmetic function the calculator can evaluate: add, subtract, multiply, divide, power, square root or percent.
_Avoid_: operator, function, op

**Operand**:
A number an operation is applied to.
_Avoid_: argument, input, value

**Arity**:
How many operands an operation takes. Every operation is either a binary operation or a unary operation.

**Binary operation**:
An operation that takes two operands, a left operand and a right operand (add, subtract, multiply, divide, power, percent).

**Unary operation**:
An operation that takes one operand (square root).

**Calculation**:
One operation applied to its operands, together with the result. It's the unit of work the service evaluates.
_Avoid_: expression, computation, request

**Result**:
The number a calculation produces.
_Avoid_: answer, output, total

**Percent**:
The binary operation "x percent of base", equal to x × base / 100.
_Avoid_: modulo, mod

**Percent base**:
The base the percent key uses: the left operand when add or subtract is pending, otherwise 1. That's what makes `200 + 10 % =` give 220 and `50 × 10 % =` give 5.

### Keypad behaviour

**Operator key**:
A keypad key that starts an operation (+, −, ×, ÷, xʸ, √, %). It's the only place "operator" is used.
_Avoid_: operation key, function key

**Immediate execution**:
The evaluation rule where each binary operation is applied as soon as the next operator key or equals is pressed, strictly left to right, with no precedence. So `2 + 3 × 4 =` is 20.
_Avoid_: chaining (on its own), precedence mode

**Entry**:
The number the person is typing, before it becomes an operand.
_Avoid_: input, current value

**Display**:
What the calculator shows: the entry, the latest result rounded for reading, or a maths error message.
_Avoid_: screen, output

**Pending operation**:
The binary operation whose key has been pressed but which hasn't been applied yet, waiting for its right operand.
_Avoid_: current operator, queued operation

**Last calculation**:
The most recently evaluated binary operation with its right operand. Repeated equals applies it again.

**Repeated equals**:
Pressing equals again with nothing pending, which applies the last calculation to the current result: `2 + 3 = =` gives 8.
_Avoid_: constant mode, repeat

### Failures

**Maths error**:
The service's answer that a calculation has no real result (division by zero, square root of a negative, a result too large). Its message replaces the display.
_Avoid_: calculation error, invalid input

**Bad request**:
A request the service refuses because the request itself is wrong (malformed, unknown operation, wrong number of operands), not because of the maths. It always means a bug in the caller.
_Avoid_: validation error, invalid input

**Service unavailable**:
The calculator couldn't get a usable answer from the service (network failure, timeout, server fault, or a bad request). The calculator's state is kept as it was before the keypress, so the person can retry.
_Avoid_: offline, server error, maths error
