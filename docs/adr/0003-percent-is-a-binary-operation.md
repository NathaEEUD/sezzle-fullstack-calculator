# Percent is a binary operation, "x percent of base"

The % key follows the handheld rule: `200 + 10 % =` is 220, while `50 × 10 % =` is 5. To keep every piece of maths in the service, the API exposes `percent` as a binary operation, x × base / 100, and the app chooses the percent base: the left operand when add or subtract is pending, otherwise 1. A reader expecting a unary x/100 operation, or the context rule inside the service, will find neither, and that's deliberate. The context comes from the keypad's state, which only the app has, and the service stays stateless.

## Considered Options

- **Unary x/100**: simplest, but `200 + 10 % =` gives 200.1, which reads as a bug.
- **Context rule computed in the app**: no service call, but it would be the one operation whose maths isn't in the service or its tests.
- **Service takes the pending operation as a hint**: leaks keypad state into the API contract.
