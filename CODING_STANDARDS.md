# Coding standards

What a reviewer checks on every PR. Each line is a yes or no. A "no" blocks the merge unless the PR explains it and records a new ADR. Anything the tools at the end already enforce is left out.

## Contract

- The routes are `POST /api/v1/calculate`, `GET /api/v1/operations` and `GET /healthz`, and nothing else.
- A breaking change ships under `/api/v2` alongside `/api/v1`.
- A 200 from `/calculate` echoes `operation` and `operands` and adds `result`.
- `GET /api/v1/operations` returns `{"operations":[{"name","arity"}]}` sorted by name.
- Every error body is `{"error":{"code","message"}}`; the one bare body is the 403 for a disallowed CORS preflight.
- Every status and code matches the table below, and a shipped code keeps its name.
- 422 messages are exactly "Cannot divide by zero", "Not a real number" and "Result too large".
- 4xx and 5xx messages name the specific cause for a developer (for example "expected 2 operands for add, got 1").
- No response contains NaN or ±Infinity: one finiteness check runs on every result before encoding.
- The UI's `OPERATIONS` constant and the service registry list the same `{name, arity}` pairs.

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_JSON` | malformed JSON, unknown field, trailing data, body over 1024 bytes, non-number operand |
| 400 | `UNKNOWN_OPERATION` | `operation` missing, empty or not in the registry |
| 400 | `INVALID_OPERAND_COUNT` | `operands` missing, or count ≠ the operation's arity |
| 404 | `NOT_FOUND` | unknown path |
| 405 | `METHOD_NOT_ALLOWED` | wrong method, with an `Allow` header |
| 422 | `DIVISION_BY_ZERO` | x ÷ 0, and 0 to a negative power |
| 422 | `INVALID_OPERAND` | NaN result: √ of a negative, negative base with a non-integer exponent |
| 422 | `OVERFLOW` | ±Inf result |
| 500 | `INTERNAL_ERROR` | panic or unexpected error |

413 and 415 are never returned; Content-Type is not checked.

## Service

- `go.mod` has no `require` lines: standard library only.
- `internal/calc` is pure maths and imports no `net/http`.
- `calc` failures are `*calc.Error` values with a `Code`, plus sentinels such as `calc.ErrDivisionByZero` for `errors.Is`.
- HTTP status codes appear only in `internal/httpapi`, and one mapping function turns errors into envelopes.
- Adding an operation is one registry entry in `calc` and one table-test row, with no change to `httpapi`.
- The service returns the raw float64 result and never rounds.
- `cmd/calculator/main.go` only reads env, wires the handler and shuts down; logic lives in `internal/`.
- Config comes only from env: `PORT` (8080), `STATIC_DIR` (unset), `LOG_LEVEL` (`info`), `CORS_ALLOWED_ORIGINS` (empty).
- `httpapi.NewHandler(logger)` builds every route and middleware, with the logger injected.
- Each request logs one `slog` JSON line to stdout with method, path, status and duration.

## App

- Runtime dependencies are React and React DOM only: no UI kit, state library, CSS framework or HTTP library.
- `calculatorReducer(state, event)` is pure and holds every keypad rule (immediate execution, repeated equals, percent base, error handling, entry limits).
- The app does no arithmetic on operands; every result comes from the service.
- `useCalculator(client)` is the only code that calls the client, and keys are ignored while a request is in flight.
- Components are presentational: they receive state and `onKey`, and keyboard input dispatches the same events as clicks.
- `createCalculatorClient` takes an injected `fetch`, calls the relative `/api/v1`, times out after 5 s and never throws.
- The client picks the `Outcome` kind from the HTTP status (422 → `maths_error`, anything else → `unavailable`) and never reads `code`.
- The app shows the service's `message` verbatim; its own copy is the one no-envelope fallback, "Can't reach the calculator service. Try again."
- A maths error replaces the display; service unavailable keeps the state from before the keypress and shows the service alert.
- An entry holds at most 15 significant digits and one decimal point.
- `formatForDisplay` shows at most 12 significant digits, strips trailing zeros, uses exponent notation at ≥ 1e12 or < 1e-9, shows −0 as 0, and state keeps the full-precision result.
- Styles are CSS Modules per component; colours and sizes come from custom properties in `tokens.css`, and dark mode overrides tokens under `prefers-color-scheme`.
- Every key is a `<button>` with an accessible name ("multiply", "square root", "delete last digit").
- The display is an `<output aria-live="polite">`, and the service alert has `role="alert"`.
- Every key has a keyboard binding (`0–9 . + - * / ^ % Enter = Backspace Escape`) and a visible `:focus-visible` ring.
- Text and keys meet WCAG AA contrast, touch targets are at least 44×44 px, the layout works from 320 px, and the viewport meta allows zoom.

## Tests

- Each behaviour change arrives with a test at its seam, written before the code.
- `calc`: table tests cover every operation, every 422 case, −0 and huge values.
- `httpapi`: `httptest` against the real `NewHandler`, covering every row of the code table, the `Allow` header, the echoed 200, panic recovery and the three CORS cases, with the logger writing to a buffer.
- Reducer: plain `reducer(state, event)` tests cover every keypad rule.
- `formatForDisplay`: a table test covers every rounding and notation rule.
- Client: a fake `fetch` returns canned responses for each `Outcome` kind, plus a timeout case.
- `useCalculator` and components: Testing Library with a fake client, queried by role and accessible name, keyboard via `user-event`.
- e2e: Playwright's `webServer` builds the app and runs the real binary with `STATIC_DIR`, on Chromium plus one 360 px project.
- e2e covers a chain, percent, divide by zero then recovery, keyboard only, service unavailable via `page.route` abort, and the operation-list contract test.
- Unit tests use injected fakes only: no network, no mocking library.
- Test names use glossary terms.
- Coverage thresholds and exclusions are unchanged: `calc` 100%, `httpapi` 90%, frontend `src/` 90% lines and branches with `main.tsx` excluded.
- `coverage/` is regenerated and committed in the same PR as the code it measures.

## Infrastructure

- There is one `Dockerfile` with three stages: `node:22-alpine`, `golang:1.27-alpine` (`CGO_ENABLED=0`, `-trimpath`), and `gcr.io/distroless/static:nonroot`.
- The image sets `STATIC_DIR=/app/web`, exposes 8080, and has no `HEALTHCHECK`.
- The static handler never shadows `/api/...`, and it falls back to `index.html` only for non-API paths.
- The app always calls the relative `/api/v1`; in dev the Vite proxy forwards `/api` to `localhost:8080`, and there is no `VITE_API_URL`.
- `frontend/` and `e2e/` use npm with committed lockfiles; Node is pinned in `.nvmrc` (22) and Go in `go.mod` (1.27).
- Every command a person runs is a `Makefile` target.
- CI is one GitHub Actions workflow on push and PR that runs `make gate` and `docker build`, and publishes nothing.

## Security

- The decoder rejects unknown fields and trailing data, and the body is capped at 1024 bytes with `http.MaxBytesReader`.
- The server sets `ReadHeaderTimeout` 5 s, `ReadTimeout` and `WriteTimeout` 10 s, and `IdleTimeout` 60 s.
- SIGINT and SIGTERM trigger `Shutdown` with a 10 s deadline.
- A panic is recovered into a 500 envelope and logged.
- Error bodies carry only the code and message; Go error text and stack traces go to the log.
- CORS is off unless `CORS_ALLOWED_ORIGINS` is set, and neither dev nor the image sets it.
- An allowed preflight gets 204 with the echoed `Allow-Origin`, `Allow-Methods: GET, POST`, `Allow-Headers: Content-Type`, `Max-Age: 600` and `Vary: Origin`.
- A disallowed preflight gets a bare 403, and a disallowed simple request is served without CORS headers.
- The image runs as the distroless `nonroot` user.

## Enforced by tools

Reviewers skip these; `make gate` fails on them:

- `gofmt -l` and Prettier `--check`: formatting.
- `go vet` and the Go compiler: suspicious constructs, unused imports and variables, type errors.
- ESLint (Vite's flat config, including `react-hooks`): JS/TS lint and hook rules.
- `tsc --noEmit`: TypeScript types.
- `go test` and Vitest coverage thresholds: coverage floors.
- Playwright: the e2e smoke and the operation-list contract.
