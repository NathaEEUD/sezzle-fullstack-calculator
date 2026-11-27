# Calculator

A keypad calculator. A React + TypeScript app sends each calculation to a stateless Go service, which evaluates it and answers in JSON. The assignment is [`docs/BRIEF.md`](docs/BRIEF.md).

- **Operations**: add, subtract, multiply, divide, power, square root and percent.
- **Keypad**: immediate execution, like a pocket calculator, so `2 + 3 × 4 =` is 20 ([why](#design-decisions)).
- **Service**: Go standard library only. One `POST` evaluates one calculation.
- **App**: React and React DOM are its only runtime dependencies. It does no arithmetic itself.
- **Deployment**: one Docker image serves the app and the API from one origin.

The words used here (operation, calculation, operand, maths error, bad request, service unavailable) are defined in [`GLOSSARY.md`](GLOSSARY.md).

## Contents

- [Quick start with Docker](#quick-start-with-docker)
- [Setup for development](#setup-for-development)
- [Configuration](#configuration)
- [API](#api)
- [Design decisions](#design-decisions)
- [Tests and coverage](#tests-and-coverage)
- [Extras beyond the brief](#extras-beyond-the-brief)
- [Repository layout](#repository-layout)
- [Prompts](#prompts)

## Quick start with Docker

You need Docker and nothing else.

```bash
make docker
```

```bash
docker run --rm -p 8080:8080 calculator
```

Open <http://localhost:8080>. The same container answers the [API examples](#api) below. If port 8080 is taken, publish another one (`-p 9090:8080`) and change the port in the examples.

`make docker` prints the image size after the build, which on the last run was:

```text
Image size: 21.7MB
```

The image is a three-stage build (`node:22-alpine`, `golang:1.27-alpine`, `gcr.io/distroless/static:nonroot`) and runs as the distroless `nonroot` user.

## Setup for development

Prerequisites:

- Go 1.27 (pinned in [`backend/go.mod`](backend/go.mod))
- Node 22 (pinned in [`.nvmrc`](.nvmrc)) with npm
- Docker, only for the image

Install the npm dependencies for the app and the e2e suite, and the Playwright browser:

```bash
make install
```

### Run the app and the service together

```bash
make dev
```

This starts the service on <http://localhost:8080> and the Vite dev server on <http://localhost:5173>. Open the Vite URL: it proxies `/api` to the service, so the app always calls the relative `/api/v1` and never needs the service's address. Ctrl-C stops both.

### Run the service on its own

```bash
make build
```

```bash
./bin/calculator
```

Without `STATIC_DIR` the binary is an API-only microservice on port 8080. To serve the built app from it as well, the way the image does:

```bash
STATIC_DIR=frontend/dist ./bin/calculator
```

### Every command

Every command is a Make target. `make help` lists them:

```text
  help       List the targets
  install    Install npm dependencies and the Playwright browser
  dev        Run the service on :8080 and the Vite dev server, which proxies /api to it
  build      Build the app into frontend/dist and the service into bin/calculator
  fmt        Format Go, TypeScript and CSS
  fmt-check  Fail if anything needs formatting
  vet        go vet
  lint       ESLint
  typecheck  tsc for the app and the e2e suite
  test       Both unit suites with their coverage thresholds
  coverage   Run both unit suites and regenerate coverage/SUMMARY.md
  e2e        Playwright against the real binary serving the built app
  gate       Everything CI runs
  evidence   Record the e2e tests tagged @issue-$(ISSUE) into docs/evidence/$(ISSUE)/; DOCKER=1 records against the image (not part of the gate)
  docker     Build the image and print its size and how to run it
  docker-e2e Run the e2e suite against the image (not part of the gate)
```

`make gate` is the definition of done, and CI runs it on every push and pull request, followed by `make docker`.

## Configuration

The service reads its configuration from the environment and nothing else.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | Port to listen on |
| `STATIC_DIR` | unset | Directory of the built app to serve on non-API paths. The image sets `/app/web`. |
| `LOG_LEVEL` | `info` | `slog` level for the JSON log on stdout |
| `CORS_ALLOWED_ORIGINS` | empty | Comma-separated origins allowed to call the API cross-origin. Off by default, and neither `make dev` nor the image sets it. |

## API

Three routes, and nothing else:

| Method | Path | Answers |
| --- | --- | --- |
| `POST` | `/api/v1/calculate` | The result of one calculation |
| `GET` | `/api/v1/operations` | Every operation with its arity, sorted by name |
| `GET` | `/healthz` | `{"status":"ok"}` |

A calculation is `{"operation":"<name>","operands":[...]}`. A 200 echoes `operation` and `operands` and adds `result`, the raw float64 the service computed: the service never rounds, and the app rounds only for the display. Every error body is `{"error":{"code","message"}}`. The service doesn't check `Content-Type`, so plain `curl -d` works.

Every example below runs against `make dev` or the image on port 8080 and prints exactly what is shown, except the `Date` header. The e2e test [`readme.spec.ts`](e2e/tests/readme.spec.ts) runs each one against the real binary on every `make gate`, and `make docker-e2e` runs it against the image.

### Health

```bash
curl -i http://localhost:8080/healthz
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Date: …
Content-Length: 16

{"status":"ok"}
```

### Operations

```bash
curl -i http://localhost:8080/api/v1/operations
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Date: …
Content-Length: 212

{"operations":[{"name":"add","arity":2},{"name":"divide","arity":2},{"name":"multiply","arity":2},{"name":"percent","arity":2},{"name":"power","arity":2},{"name":"sqrt","arity":1},{"name":"subtract","arity":2}]}
```

### Calculate

A binary operation takes two operands:

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"add","operands":[2,3]}'
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Date: …
Content-Length: 48

{"operation":"add","operands":[2,3],"result":5}
```

`percent` takes `[x, base]` and returns x × base / 100. The app picks the base ([ADR-0003](docs/adr/0003-percent-is-a-binary-operation.md)):

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"percent","operands":[10,200]}'
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Date: …
Content-Length: 56

{"operation":"percent","operands":[10,200],"result":20}
```

`sqrt`, the one unary operation, takes one operand, and the result comes back at full precision:

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"sqrt","operands":[2]}'
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Date: …
Content-Length: 64

{"operation":"sqrt","operands":[2],"result":1.4142135623730951}
```

### Maths errors (422)

The calculation is well formed but has no real result. The message is short enough for the display, and the app shows it as is ([ADR-0004](docs/adr/0004-service-owns-error-copy.md)).

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"divide","operands":[5,0]}'
```

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
Date: …
Content-Length: 72

{"error":{"code":"DIVISION_BY_ZERO","message":"Cannot divide by zero"}}
```

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"sqrt","operands":[-1]}'
```

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
Date: …
Content-Length: 67

{"error":{"code":"INVALID_OPERAND","message":"Not a real number"}}
```

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"power","operands":[10,400]}'
```

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
Date: …
Content-Length: 59

{"error":{"code":"OVERFLOW","message":"Result too large"}}
```

### Bad requests (400)

The request itself is wrong, which always means a bug in the caller. The message names the cause for a developer.

Malformed JSON, an unknown field, trailing data, a body over 1024 bytes or an operand that isn't a number is `INVALID_JSON`:

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"add","operands":[2,3]'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Date: …
Content-Length: 77

{"error":{"code":"INVALID_JSON","message":"request body is not valid JSON"}}
```

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"add","operands":[2,"3"]}'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Date: …
Content-Length: 83

{"error":{"code":"INVALID_JSON","message":"operands must be numbers, got string"}}
```

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"add","operands":[2,3],"precision":2}'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Date: …
Content-Length: 74

{"error":{"code":"INVALID_JSON","message":"unknown field \"precision\""}}
```

An operation that is missing, empty or not in the registry is `UNKNOWN_OPERATION`:

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"modulo","operands":[7,2]}'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Date: …
Content-Length: 80

{"error":{"code":"UNKNOWN_OPERATION","message":"unknown operation \"modulo\""}}
```

Missing operands, or a count that isn't the operation's arity, is `INVALID_OPERAND_COUNT`:

```bash
curl -i http://localhost:8080/api/v1/calculate -d '{"operation":"add","operands":[1]}'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Date: …
Content-Length: 90

{"error":{"code":"INVALID_OPERAND_COUNT","message":"expected 2 operands for add, got 1"}}
```

### Routing errors (404, 405)

An unknown path is `NOT_FOUND`:

```bash
curl -i http://localhost:8080/api/v1/sum
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
Date: …
Content-Length: 72

{"error":{"code":"NOT_FOUND","message":"no route for GET /api/v1/sum"}}
```

The wrong method is `METHOD_NOT_ALLOWED`, with an `Allow` header naming the right one:

```bash
curl -i http://localhost:8080/api/v1/calculate
```

```http
HTTP/1.1 405 Method Not Allowed
Allow: POST
Content-Type: application/json
Date: …
Content-Length: 114

{"error":{"code":"METHOD_NOT_ALLOWED","message":"method GET is not allowed on /api/v1/calculate; allowed: POST"}}
```

### Every status and code

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_JSON` | malformed JSON, unknown field, trailing data, body over 1024 bytes, non-number operand |
| 400 | `UNKNOWN_OPERATION` | `operation` missing, empty or not in the registry |
| 400 | `INVALID_OPERAND_COUNT` | `operands` missing, or count ≠ the operation's arity |
| 404 | `NOT_FOUND` | unknown path |
| 405 | `METHOD_NOT_ALLOWED` | wrong method, with an `Allow` header |
| 422 | `DIVISION_BY_ZERO` | x ÷ 0, and 0 to a negative power |
| 422 | `INVALID_OPERAND` | NaN result: √ of a negative, negative base with a non-integer exponent |
| 422 | `OVERFLOW` | ±Inf result |
| 500 | `INTERNAL_ERROR` | panic or unexpected error |

A response never contains NaN or ±Infinity: one finiteness check runs on every result before encoding. A shipped code keeps its name. The table is the contract in [`CODING_STANDARDS.md`](CODING_STANDARDS.md#contract), and the service's `httptest` suite covers every row.

### Versioning

Every route the app calls is under `/api/v1`. A breaking change (renaming a field or code, changing a status or the meaning of an operation) ships under `/api/v2`, served alongside `/api/v1`, so an existing client keeps working. Adding an operation isn't breaking, since `GET /api/v1/operations` lists what the service supports. There is no `/api/v2` yet: only the rule for when it would exist.

## Design decisions

The decisions that shape the code are recorded as ADRs in [`docs/adr/`](docs/adr/):

- [ADR-0001: One Docker image; the service serves the built app when told to](docs/adr/0001-single-image-service-serves-the-app.md). A single `docker run` is the easiest thing for an evaluator to start, and one origin means production needs no CORS. Without `STATIC_DIR` the binary is an API-only microservice.
- [ADR-0002: Immediate execution: no precedence](docs/adr/0002-immediate-execution-no-precedence.md). Each binary operation is applied as soon as the next operator key or equals is pressed, strictly left to right, like a classic pocket calculator. Every keypress that needs maths becomes one calculation, so the API stays one operation per request and the keypad state is a small pure reducer with no stack or parser.
- [ADR-0003: Percent is a binary operation, "x percent of base"](docs/adr/0003-percent-is-a-binary-operation.md). `200 + 10 % =` is 220 and `50 × 10 % =` is 5. The app picks the percent base from its keypad state, and the maths stays in the service.
- [ADR-0004: The service owns error copy; the app shows `message` verbatim](docs/adr/0004-service-owns-error-copy.md). The app tells a maths error (422) from service unavailable (anything else) by status alone and never reads `code`, so a new error case needs no app change.

> **Open note: `2 + 3 × 4 =` is 20, not 14.** That's immediate execution working as designed (ADR-0002), but people used to calculators that respect precedence (iOS, Google) may expect 14. Switching to precedence later is an app-only change to the reducer, because the API already evaluates one calculation at a time.

Other choices and assumptions:

- **The service is stateless.** It never sees a chain, only one calculation at a time. Keypad state (the pending operation, the last calculation for repeated equals, the percent base) lives in the app's reducer.
- **Results are float64.** The service returns the raw result. The app shows at most 12 significant digits with trailing zeros stripped, switches to exponent notation at ≥ 1e12 or < 1e-9, shows −0 as 0, and keeps the full-precision result in state so chained calculations don't build up rounding errors. An entry holds at most 15 significant digits.
- **Real numbers only.** √ of a negative is a maths error, not a complex number.
- **422 for maths errors, 400 for bad requests.** "The maths has no answer" and "your request is wrong" need different handling, and only the first is the person's to see. The app shows a 422 message in the display and treats every other failure as service unavailable, keeping its state from before the keypress so the person can retry.
- **Standard library only in Go; React and React DOM only in the app.** No router, UI kit, state library or HTTP library, because the problem is small enough that each would cost more to learn than to replace.
- **Out of scope:** precedence and expression parsing, arbitrary-precision decimals, memory keys and history, a ± key, parentheses, sessions and authentication, localisation.

[`CODING_STANDARDS.md`](CODING_STANDARDS.md) lists every rule a reviewer checks, and the full spec is [issue #3](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/3).

## Tests and coverage

Tests are written first at the seam for each layer:

- **Service maths** (`backend/internal/calc`): table tests for every operation, every 422 case, −0 and huge values.
- **Service HTTP** (`backend/internal/httpapi`): `httptest` against the real `NewHandler`, covering every row of the status and code table, the `Allow` header, panic recovery, CORS, the static handler and the per-request log line.
- **App logic** (`frontend/src/calculator`, `frontend/src/api`): plain `calculatorReducer(state, event)` tests for every keypad rule, a `formatForDisplay` table test, and the client against a fake `fetch`.
- **App UI** (`frontend/src/components`): Testing Library with a fake client, queried by role and accessible name, keyboard through `user-event`.
- **End to end** (`e2e/`): Playwright against the real Go binary serving the built app, on desktop Chromium and a 360 px phone viewport. It includes a contract test that the app's `OPERATIONS` list equals `GET /api/v1/operations`, and the test that runs this README's curl examples.

Unit tests use injected fakes only: no network and no mocking library.

```bash
make coverage
```

runs both unit suites with their thresholds and regenerates [`coverage/SUMMARY.md`](coverage/SUMMARY.md), which has every coverage number, the thresholds, and links to the full HTML reports for the [service](coverage/backend/coverage.html) and the [app](coverage/frontend/index.html). The reports are committed, and regenerated in the same pull request as the code they measure.

Each issue's e2e tests are tagged `@issue-<n>`, and `make evidence ISSUE=<n>` records a screenshot and a video of each into [`docs/evidence/<n>/`](docs/evidence/), which the issue's pull request links.

## Extras beyond the brief

The brief's optional items are all built: power, square root, percent and the Dockerfile. Beyond those:

| Extra | Why |
| --- | --- |
| `GET /api/v1/operations` and an e2e contract test | The app's keys and the service's registry can't drift apart unnoticed. |
| `GET /healthz` | Playwright and `make docker-e2e` wait on it before running, and it's what any orchestrator would probe. |
| Service unavailable handling: a 5 s timeout, a service alert, keys ignored while a calculation is in flight, and state kept for a retry | A network failure should never look like a wrong answer or lose what the person typed. |
| Keyboard bindings for every key, visible focus rings, accessible names, a polite live region for the display | The brief asks for an intuitive UI; that includes people who don't use a mouse or can't see the screen. |
| WCAG AA contrast, 44×44 px touch targets, a layout that works from 320 px, dark mode | "Basic mobile support", done so it holds on a small phone. |
| Opt-in CORS through `CORS_ALLOWED_ORIGINS` | Lets the service run behind another origin without opening it by default. |
| One JSON log line per request, server timeouts, a 1024-byte body cap, panic recovery, graceful shutdown on SIGINT and SIGTERM | Cheap with the standard library, and what a real service needs to be operated safely. |
| A distroless, non-root image | Small, with no shell or package manager to attack. |
| Playwright against the real binary, on two viewports, with recorded evidence per issue | Unit tests prove the parts; these prove the app and the service work together. |
| CI running `make gate` and `docker build` on every push and pull request | Main stays green, and the image always builds. |
| Committed coverage reports with a generated summary | Coverage numbers an evaluator can check rather than take on trust. |
| Every prompt captured by a hook into [`docs/prompts/`](docs/prompts/), summarised in [`PROMPTS.md`](PROMPTS.md) | The brief asks for the prompts used; this records all of them, as typed. |

## Repository layout

```text
backend/    Go module, standard library only
  cmd/calculator/     reads env, wires the handler, shuts down
  internal/calc/      the operations: pure maths, no HTTP
  internal/httpapi/   routing, decoding, the error envelope, CORS, static files
  internal/logging/   the slog JSON logger
frontend/   Vite app: the calculator reducer, useCalculator, the API client, presentational components
e2e/        Playwright suite, run against the real binary serving the built app
coverage/   committed unit-test coverage reports and the generated SUMMARY.md
docs/       the brief, ADRs, evidence per issue, captured prompts
scripts/    coverage summary and the Docker e2e runner
Makefile    every command
Dockerfile  the single image
```

## Prompts

The project was built with Claude Code, one GitHub issue per branch and pull request. [`PROMPTS.md`](PROMPTS.md) lists each stage, from design through every build slice, with its prompts, and [`AGENTS.md`](AGENTS.md) is the entry point the agent works from.
