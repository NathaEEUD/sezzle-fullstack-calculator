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
