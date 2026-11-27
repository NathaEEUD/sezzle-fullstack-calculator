# Immediate execution: no precedence

The keypad evaluates left to right as each operator key is pressed, so `2 + 3 × 4 =` is 20, not 14. This is how a classic pocket calculator works, and it means every keypress sequence becomes a chain of single calculations. Each `POST /api/v1/calculate` then carries one operation and its operands, and the app's state is a small pure reducer with no stack or parser. The trade-off is that people used to precedence-respecting calculators (iOS since 11, Google) may expect 14, so the README says it openly.

## Considered Options

- **Keypad with precedence**: the app keeps a stack of pending operations. The API would be unchanged, but the reducer gets harder to reason about and test for little gain in a 2–4 hour brief.
- **Expression entry parsed by the service**: an `evaluate("2+3*4")` endpoint. It needs a tokenizer and parser, and the service would own input syntax as well as arithmetic.

## Consequences

- Switching to precedence later is an app-only change (the reducer), because the API already evaluates one calculation at a time.
