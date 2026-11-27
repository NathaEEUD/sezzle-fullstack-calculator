# Prompts

Every prompt typed in this repo is captured by a `UserPromptSubmit` hook ([`.claude/hooks/log-prompt.sh`](.claude/hooks/log-prompt.sh)); the raw log is in [`docs/prompts/`](docs/prompts/), one file per session.

The design stages (agent skills setup through to-tickets) are reused as they were run: their prompts are quoted verbatim below, and their output landed together in [PR #2](https://github.com/NathaEEUD/sezzle-fullstack-calculator/pull/2). Those sessions are not in `docs/prompts/`, which holds only the sessions run in this repo.

## Workflow

| Stage | Session | Prompt |
| --- | --- | --- |
| Setup: prompt capture | — | [Setup: prompt capture](#setup-prompt-capture) |
| Setup: agent skills | — | [Setup: agent skills](#setup-agent-skills) |
| Design: grill with docs | — | [Design: grill with docs](#design-grill-with-docs) |
| Setup: agent entry point and standards | — | [Setup: agent entry point and standards](#setup-agent-entry-point-and-standards) |
| Spec: to-spec | — | [Spec: to-spec](#spec-to-spec) |
| Plan: to-tickets | — | [Plan: to-tickets](#plan-to-tickets) |
| Build: walking skeleton (#4) | [`bafb1d07`](docs/prompts/2026-11-27-0911-bafb1d07.md) | [Build: walking skeleton](#build-walking-skeleton) |
| Build: immediate execution (#5) | [`b319431a`](docs/prompts/2026-11-27-0935-b319431a.md) | [Build: immediate execution](#build-immediate-execution) |
| Build: full API contract (#8) | [`bca4e311`](docs/prompts/2026-11-27-0940-bca4e311.md) | [Build: full API contract](#build-full-api-contract) |
| Build: Docker image (#14) | [`383673a0`](docs/prompts/2026-11-27-0941-383673a0.md) | [Build: Docker image](#build-docker-image) |
| Build: entry editing (#6) | [`a21f9bde`](docs/prompts/2026-11-27-1006-a21f9bde.md) | [Build: entry editing](#build-entry-editing) |
| Build: service unavailable (#9) | [`6289e825`](docs/prompts/2026-11-27-1006-6289e825.md) | [Build: service unavailable](#build-service-unavailable) |
| Build: CORS and per-request logging (#13) | [`62ca54f5`](docs/prompts/2026-11-27-1007-62ca54f5.md) | [Build: CORS and per-request logging](#build-cors-and-per-request-logging) |
| Build: maths errors (#7) | [`58aa8b9d`](docs/prompts/2026-11-27-1030-58aa8b9d.md) | [Build: maths errors](#build-maths-errors) |

## Setup: prompt capture

Added the `UserPromptSubmit` hook that logs prompts to `docs/prompts/` ([PR #1](https://github.com/NathaEEUD/sezzle-fullstack-calculator/pull/1)). This session ran before the hook existed, so its prompt is not in the log.

## Setup: agent skills

Ran Matt Pocock's skills setup: `AGENTS.md` got an `## Agent skills` section pointing at `docs/agents/` (GitHub issue tracker, default triage labels, single-context domain docs), and the four missing triage labels were created on GitHub. Landed in [PR #2](https://github.com/NathaEEUD/sezzle-fullstack-calculator/pull/2).

````text
/mattpocock-skills:setup-matt-pocock-skills this is a new repo for the assignment in docs/BRIEF.md. AGENTS.md is the agent entry point, don't create a CLAUDE.md. issues live in GitHub, default triage labels, single-context domain docs
````

## Design: grill with docs

Ran Matt Pocock's `grill-with-docs` against the brief over four rounds of questions. The settled language went into [`GLOSSARY.md`](GLOSSARY.md). Four decisions went into [`docs/adr/`](docs/adr/): a single Docker image where the service serves the app, immediate execution with no precedence, percent as a binary operation, and the service owning error copy. The answers overrode the proposed routes and error codes with a single `POST /api/v1/calculate` route and SCREAMING_SNAKE_CASE codes, and removed axe from the automated checks. The session ended with the list of extras beyond the brief, each with its reason.

````text
/mattpocock-skills:grill-with-docs read @docs/BRIEF.md

cover at least:
- calculator behaviour: chaining and precedence, what % means, repeated =, what happens after an error
- where state lives (service or UI) and what a single request carries
- the API contract: routes, versioning, one error envelope, which status and stable code for a bad request vs maths with no answer, and never NaN or Infinity in JSON
- numbers: float64 or decimal, input limits, display rounding
- service design: package boundaries, how errors are typed, how a new operator gets added
- request hardening: unknown fields, body size, wrong method, CORS, timeouts, graceful shutdown, logging
- app design: how components compose, the state model, the API client's shape, the styling approach
- how the UI reaches the API in dev and in Docker, and how the two stay in agreement on the operator list
- dependencies on both sides: standard library or framework
- the test seams for each layer, and what the coverage report is
- the accessibility and mobile baseline

write the glossary as terms get settled. write an ADR only when a decision is hard to reverse, surprising, or a real trade-off. at the end, list everything we kept that the brief doesn't ask for, each with its reason
````

## Setup: agent entry point and standards

Ran Matt Pocock's `writing-for-agents` to turn the grill session's decisions into two files. [`AGENTS.md`](AGENTS.md) is the entry point: the repo and its layout, what to read first, the `make gate` rule, the issue-branch-PR workflow and the README numbers rule, with the Agent skills section kept. [`CODING_STANDARDS.md`](CODING_STANDARDS.md) holds yes/no review checks for the contract, service, app, tests, infrastructure and security, and lists the tools that enforce the rest. A follow-up kept `docker build` out of the gate: CI runs `make gate` and then `docker build`. Landed in [PR #2](https://github.com/NathaEEUD/sezzle-fullstack-calculator/pull/2).

````text
/mattpocock-skills:writing-for-agents write two files from what we just decided:

AGENTS.md, under 60 lines, the entry point:
- what this repo is and its layout
- read GLOSSARY.md, docs/adr/ and CODING_STANDARDS.md before working, and use the glossary's terms in code, tests, issues and PRs
- the one gate: `make gate` runs format check, vet, lint, typecheck, both unit suites with coverage thresholds, and the e2e smoke. CI runs the same command. nothing is done until it passes
- the workflow: one issue, one branch from fresh main, one PR; tests first at the agreed seams; parallel slices only in their own worktree
- the docs rule: numbers in the README come from scripts, never typed by hand
keep the "Agent skills" section the setup skill added.

CODING_STANDARDS.md, what a reviewer checks, taken from our decisions and grouped as: contract, service, app, tests, infrastructure and security. each standard is one line a reviewer can say yes or no to. leave out anything a linter or the compiler already enforces, and list those tools at the end instead.
````

## Spec: to-spec

Ran Matt Pocock's `to-spec` to turn the grill session's decisions (`GLOSSARY.md`, ADRs 0001–0004, `CODING_STANDARDS.md`) into one spec for the whole calculator: problem, solution, 62 user stories, implementation and testing decisions, and what's out of scope. The test seams were confirmed as the ones `CODING_STANDARDS.md` already names, highest first: e2e, `httptest` against `NewHandler`, Testing Library with a fake client, then the pure modules. Five details the grill left open got the conventional choice and are listed in the spec's Further Notes for review. Published as [issue #3](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/3) with `ready-for-agent`.

````text
/mattpocock-skills:to-spec turn the interview into the spec and publish it as a GitHub issue
````

## Plan: to-tickets

Ran Matt Pocock's `to-tickets` to break the [#3](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/3) spec into 12 tracer-bullet tickets. The first is a walking skeleton: `2 + 3 =` shows 5 through the real service, and it also sets up `make gate`, the e2e smoke, coverage and CI. The others add one behaviour each: immediate execution, entry editing, maths errors, the full API contract, service unavailable, power and square root, percent, keyboard and layout, CORS and logging, the Docker image, and the README. The breakdown was approved as proposed. Published as [#4](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/4)–[#15](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/15), sub-issues of #3 labelled `ready-for-agent`, with GitHub's native blocking edges.

A follow-up added an evidence harness to #4 so later slices inherit it. The proposed `make evidence ISSUE=<n>` ran the whole e2e suite, so each slice would have re-recorded every earlier slice's video. It was replaced with four criteria. The target runs only the tests tagged `@issue-<n>` and writes named screenshots and video to `docs/evidence/<n>/`. It fails when `ISSUE` or the tagged tests are missing, and it stays out of `make gate`. The smoke is tagged `@issue-4`, and `AGENTS.md` tells each slice to tag its tests, run the target and link the output in its PR.

The quoted prompts use the numbers they were typed with: the spec was #5 and the walking skeleton #7, which are #3 and #4 here.

````text
/mattpocock-skills:to-tickets #5
````

````text
Add the evidence harness to #7 so every later slice inherits it. Append to #7's acceptance criteria:

* [ ] `make evidence ISSUE=<n>` runs the e2e suite with screenshots and video on, and writes them to `docs/evidence/<n>/`


do you agree with this approach or do you have a better approach?
````

## Build: walking skeleton

Ran Matt Pocock's `implement` on [#4](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/4) in a new branch. The `tdd` seams were proposed from `CODING_STANDARDS.md` and approved as proposed: calc table tests, `httptest` against `NewHandler`, plain reducer tests, the client with a fake `fetch`, Testing Library with a fake client, and the `@issue-4` Playwright smoke on Chromium and 360 px. Each layer went red, then green. The rest of the error-code table was left to #8. Two choices departed from the Vite template: ESLint in place of oxlint, as the standards require, and TypeScript pinned to 6.0, because typescript-eslint doesn't support 7.

The `code-review` skill then ran its Standards and Spec reviews in parallel. Their fixes landed in a second commit:

- a result JSON can't carry gave an empty 200, and is now a 500 envelope;
- the client discarded the envelope message, against ADR-0004;
- the glossary's _Avoid_ terms (`request`, `op`) appeared in code;
- `make evidence` could record a stale server and hid Playwright's errors.

The raw log for this session also holds the two reviewers' reports, at 09:23. The hook captured them because they reached the session as messages, but nobody typed them.

````text
/mattpocock-skills:implement 4 in a new branch
````

````text
log this session in PROMPTS.md and open a PR
````

## Build: immediate execution

Ran Matt Pocock's `implement` on [#5](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/5) in a new branch. The `tdd` seams were the ones `CODING_STANDARDS.md` already names, so they weren't proposed again. Those seams were calc table tests, a `formatForDisplay` table test, plain reducer tests, Testing Library with a fake client, and the `@issue-5` Playwright test on Chromium and 360 px. Each slice went red, then green. The exception was operator replacement and the after-a-result rules: their tests passed on the first run, because the existing reducer already behaved that way.

In-flight keys were left to #9 and the finiteness check to #7.

The `code-review` skill then ran its Standards and Spec reviews in parallel. Their fixes landed in a second commit:

- a calc row expecting `+Inf` was dropped, because it pinned behaviour #7 will change;
- the glossary's _Avoid_ terms (`value`, "chains" on its own) appeared in code and test names;
- the pending operation got its own type.

The Standards review also reported that coverage and evidence weren't committed. That was wrong: they were in the first commit, and the review's diff command excluded them.

Midway through, another session switched the shared checkout to another branch. This session finished in its own worktree, as `AGENTS.md` prescribes for parallel slices.

The raw log for this session also holds the two reviewers' reports, at 09:41. The hook captured them because they reached the session as messages, but nobody typed them.

````text
/mattpocock-skills:implement 5 in a new branch
````

````text
log this session in PROMPTS.md and open a PR
````

## Build: full API contract

Ran Matt Pocock's `implement` on [#8](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/8) in a new branch. The branch was cut from `origin/main` while #5 was still unmerged, so the registry held only `add`. The `tdd` seams were the ones `CODING_STANDARDS.md` already names, so they weren't proposed again: calc table tests, `httptest` against the real `NewHandler` with the logger writing to a buffer, and the `@issue-8` Playwright contract test. Each slice went red, then green: the operations list, every 400 row, 404 and 405 envelopes with the `Allow` header, and panic recovery. The panic test uses a request body that panics when read, so it needs no test-only route. To prove the contract test catches drift, a fake operation was added to `OPERATIONS`, the test failed, and the change was reverted.

The `code-review` skill then ran its Standards and Spec reviews in parallel. Their fixes landed in a second commit:

- the operations `httptest` hard-coded the registry, so adding an operation would have meant an `httpapi` change; it now compares against `calc.Operations()` and checks the order on its own;
- status choice was split between the error constructors and `statusFor`, and now lives only in `statusFor`;
- panic recovery swallowed `http.ErrAbortHandler`, and now re-panics it;
- the glossary's _Avoid_ term `op` appeared in code.

Three findings were left as they are. Unknown fields are still found by matching Go's error text, because `encoding/json` has no typed error for them and a test pins the wording. A panic after a partial write isn't handled. And a `Calculation` type to bundle operation and operands would be a wider refactor than this slice.

After #5 merged, the branch was rebased onto it. The only real conflict was the registry in `calc.go`. The calc operations test then failed as expected and now lists all four operations. Coverage and evidence were regenerated in a third commit.

The raw log for this session also holds the two reviewers' reports, at 09:47. The hook captured them because they reached the session as messages, but nobody typed them.

````text
/mattpocock-skills:implement 8 in a new branch
````

````text
* #5 is already merged, fix the small conflict
* log this session in PROMPTS.md and open a PR
````

## Build: Docker image

Ran Matt Pocock's `implement` on [#14](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/14) in a new branch. The ticket is `ready-for-agent`, so the seam was taken from `CODING_STANDARDS.md` without a check-in: the Playwright suite, pointed at the running image through a new `E2E_BASE_URL`, plus a check that the image's user is `nonroot:nonroot`. `make docker-e2e` went red on the missing `Dockerfile`, then green.

Midway, the gate failed in `httpapi` tests nobody had touched. Another session was building #8 in the same checkout, and switching branches had carried its uncommitted backend work onto this one. The first image build had also included that work, and that build was the only reason an `/api/v1/operations` check passed. The checkout went back to `feat/8-full-api-contract` with #8's changes untouched, and #14 moved to its own worktree, as `AGENTS.md` asks for parallel slices. There, the operations check failed because that route is still #8's, so it was dropped.

The `code-review` skill then ran its Standards and Spec reviews in parallel. Neither found a blocker. Both wrongly said the evidence came from the binary: it was recorded against the image. The fixes they prompted:

- `make evidence ISSUE=<n> DOCKER=1` records evidence against the image, so that path is a Make target;
- the unused port override in `scripts/docker-e2e.sh` is gone;
- the run command is printed once, not repeated in the help text;
- the test says "service", the glossary's term, in place of "API".

After the PR opened, #5 and then #8 merged first. Each time, main was merged into the branch rather than rebased, so the commit the evidence links point at survives. The only conflict both times was in this file, and the gate and `make docker-e2e` were rerun on the merged tree.

The raw log for this session also holds the two reviewers' reports, at 09:46. The hook captured them because they reached the session as messages, but nobody typed them.

````text
/mattpocock-skills:implement 14 in a new branch
````

````text
log this session in PROMPTS.md and open a PR
````

````text
resolve conflicts
````

## Build: entry editing

Ran Matt Pocock's `implement` on [#6](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/6) in a new branch, cut from `origin/main` in its own worktree. The `tdd` seams were the ones the ticket and `CODING_STANDARDS.md` already name, so they weren't proposed again: plain reducer tests and Testing Library with a fake client. An `@issue-6` Playwright test was added so `make evidence` had something to record.

Each slice went red, then green: the decimal point, the second decimal point, `0.` on an empty entry, leading zeros, the 15-significant-digit limit, delete last digit and clear. The test for `.` starting the right operand passed on its first run, because `Number('.5')` is already 0.5, and it was kept as a guard. Three choices the ticket left open were made and pinned by tests:

- the decimal point and zeros before the first non-zero digit don't count toward the limit;
- deleting the only digit leaves `0`, so the operand becomes 0;
- delete does nothing to a result or straight after an operator key.

The worktree had no `node_modules`, so the first test run failed on a missing package until `npm ci` ran in `frontend/` and `e2e/`.

The `code-review` skill then ran its Standards and Spec reviews in parallel. Neither found a violation. Their fixes landed in a second commit:

- the reducer tests' `type` helper became `typeEntry` at file scope, next to `press`;
- the `entry` field now says that `'0'` is a typed zero, distinct from `''`.

The other findings were left as they are. The click loop duplicated across the e2e specs and component tests predates this slice. The Spec review flagged two edge cases as calls for a person: `2 + 3 ⌫ =` sends 2 + 0 while `2 + =` does nothing, and zeros straight after the decimal point can grow an entry without limit.

The hook writes to the main checkout, so the raw log was copied into this branch. It also holds the two reviewers' reports, at 10:11, and the worktree note the app added to the last prompt. The hook captured both, but nobody typed them.

````text
/mattpocock-skills:implement 6 in a new branch
````

````text
log this session in PROMPTS.md and open a PR
````

## Build: service unavailable

Ran Matt Pocock's `implement` on [#9](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/9) in a new branch, in its own worktree. The `tdd` seams were the ones `CODING_STANDARDS.md` already names, so they weren't proposed again. Those seams were a fake `fetch` for the client, plain reducer tests, Testing Library with a fake client, and the `@issue-9` Playwright test on Chromium and 360 px.

The client and reducer slices each went red, then green:

- a 5 s abort covers the body as well as the response;
- on service unavailable, the state from before the keypress is kept and the service alert shows the message until the next keypress;
- keys are ignored while a calculation is in flight.

Two tests passed on their first run because the reducer slice had already made them true: the Testing Library test for in-flight keys, and the e2e test. The in-flight rule lives in the reducer, which the standards say holds every keypad rule, rather than in `useCalculator`, where the issue's wording puts it.

The first `make gate` failed in the new e2e test. Playwright had reused a server on :8787 that another worktree had started, and its build already had #6's clear and delete keys. Once that server stopped, the gate went green.

The `code-review` skill then ran its Standards and Spec reviews in parallel. Neither found a blocker. Their fixes landed in a second commit:

- the only "no envelope" client test had an empty body, so it took the unparseable-body path; a `500 {}` row now covers the fallback message;
- the state field is now `serviceAlert`, after the standards' term;
- `useCalculator` no longer re-exports `KeyEvent`.

Four findings were left as they are:

- The new alert tokens have no dark-mode override; dark mode is #12's.
- The timeout tests use Vitest's fake timers rather than an injected clock.
- The `maths_error` branch keeps its old behaviour; it is #7's to change.
- A `fetch` that ignores the abort signal would still hang. Real `fetch` honours the signal.

After the PR opened, #6 merged first. Main was merged into the branch rather than rebased, so the commit the evidence links point at survives. The source merged cleanly, and #6's new keys (decimal point, delete last digit, clear) are ignored while a calculation is in flight and dismiss the service alert like the others; the reducer tests now say so. The conflicts were in this file and the generated coverage reports, which were regenerated.

The hook wrote this session's raw log into the main checkout, whose branch was `feat/8-full-api-contract`; it was copied into this branch. The log also holds the two reviewers' reports, at 10:11. The hook captured them because they reached the session as messages, but nobody typed them.

````text
/mattpocock-skills:implement 9 in a new branch
````

````text
log this session in PROMPTS.md and open a PR
````

````text
resolve conflicts
````

## Build: CORS and per-request logging

Ran Matt Pocock's `implement` on [#13](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/13) in a new branch, cut from `origin/main` after #8 and #14 had merged. The ticket is `ready-for-agent`, so the seams came from `CODING_STANDARDS.md` with no check-in: `httptest` against the real `NewHandler`, with the logger writing to a buffer, and one `@issue-13` Playwright test. The log line went red, then green. Its first table row tried divide by zero and got a 500, not a 422, because maths errors don't map to 422 yet. That is #7's work, so the row became a bad request. The allowed preflight went red, then green. The disallowed and off-by-default cases passed on their first run, because the middleware already held those branches. Breaking each branch on purpose made them fail. The e2e test has a page on `127.0.0.1` send a calculation to `localhost`, the same server on another origin. It failed when the binary allowed that origin and passed with CORS off. The whole suite also passed against the Docker image (`make docker-e2e`), which shows the image doesn't set `CORS_ALLOWED_ORIGINS`.

The `code-review` skill then ran its Standards and Spec reviews in parallel. Their fixes landed in a second commit:

- `LOG_LEVEL` parsing sat untested in `main.go`, and now lives in `internal/logging` with a test per level;
- a disallowed origin's response had no `Vary: Origin`, so a shared cache could serve it to an allowed origin; every response now carries it while CORS is on;
- the tests repeated the 2 + 3 calculation, and the log test chose its request body from the expected status.

Three findings were left as they are. Request lines log at INFO, so `LOG_LEVEL=warn` turns them off. An allowed preflight gets 204 on any path, because CORS runs before routing. And `WithCORSAllowedOrigins` takes the raw env value, the way `WithStaticDir` does.

After the PR opened, #6 and #9 merged first. Main was merged into the branch rather than rebased, so the commit the evidence links point at survives. Only this file and the generated coverage reports conflicted. The coverage reports were regenerated, and the gate and `make docker-e2e` were rerun on the merged tree.

The raw log for this session also holds the two reviewers' reports, at 10:12. The hook captured them because they reached the session as messages, but nobody typed them. The hook wrote the log into the main checkout, not the worktree, so it was copied here.

````text
/mattpocock-skills:implement 13 in a new branch
````

````text
Log and open PR
````

````text
PR #22 (https://github.com/NathaEEUD/sezzle-fullstack-calculator/pull/22) has merge conflicts with its base branch. Merge the base branch in, resolve the conflicts, and push.
````

## Build: maths errors

Ran Matt Pocock's `implement` on [#7](https://github.com/NathaEEUD/sezzle-fullstack-calculator/issues/7) in a new branch, cut from `origin/main` after #13 had merged. The ticket is `ready-for-agent`, so the `tdd` seams came from the issue's acceptance criteria and `CODING_STANDARDS.md` with no check-in: `calc` table tests, `httptest` against the real `NewHandler`, a fake `fetch` for the client, plain reducer tests, and one `@issue-7` Playwright test on Chromium and 360 px.

Each slice went red, then green:

- `calc`: x ÷ 0 (and ÷ −0) is `DIVISION_BY_ZERO`; one check on every result turns ±Inf into `OVERFLOW`, both with sentinels for `errors.Is`;
- `httpapi`: both codes answer 422 with their exact messages. The old test that got a 500 from `1e308 + 1e308` became the `OVERFLOW` row;
- the client returns a `maths_error` for a 422 with a message, whatever the `code`;
- the reducer shows the message in the display and resets the calculation chain; a digit or the decimal point starts a new entry and clear resets.

The e2e test passed on its first run because the unit slices had already made it true. While the maths error shows, operator keys, equals and delete last digit are ignored: the issue only names digit and clear, and ignoring the rest avoids a surprise `0 + …`. At 320 px the message wraps onto two lines.

The `code-review` skill then ran its Standards and Spec reviews in parallel. Neither found a blocker. Their fixes landed in a second commit:

- `statusFor` looks calc codes up in a `calcStatus` table, like `requestStatus`, instead of a switch;
- the wrapper for operations that can't fail is named `alwaysReal`;
- the client comment now says a 422 with no message counts as service unavailable, since there is nothing to show in the display.

Two findings were left as they are. The finiteness check tests only ±Inf: no current operation can produce NaN, so a NaN branch would be untested; #10 should grow the same check. And with ±Inf stopped in `calc`, nothing reaches `writeJSON`'s encode-failure path through the API any more, so that defensive 500 has no test.

The raw log for this session also holds the two reviewers' reports, at 10:34 and 10:35. The hook captured them because they reached the session as messages, but nobody typed them. The hook wrote the log into the main checkout, not the worktree, so it was copied here.

````text
/mattpocock-skills:implement 7 in a new branch
````

````text
Log and open PR
````
