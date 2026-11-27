# Calculator

A keypad calculator. A React + TypeScript app sends each calculation to a stateless Go service, which evaluates it and answers in JSON. The assignment is `docs/BRIEF.md`.

## Layout

- `backend/`: Go module, standard library only. `cmd/calculator` reads config and starts the server, `internal/calc` holds the operations, `internal/httpapi` holds routing, decoding and the error envelope.
- `frontend/`: Vite app. A pure calculator reducer, the `useCalculator` hook, the API client and presentational components.
- `e2e/`: Playwright suite with its own `package.json`, run against the real Go binary serving the built app.
- `coverage/`: committed unit-test coverage reports and the generated `SUMMARY.md`.
- `docs/adr/`: design decisions. `docs/agents/`: how the agent skills use this repo.
- `Makefile`: every command. `Dockerfile`: the single image (ADR-0001).

## Before you start

Read `GLOSSARY.md`, the ADRs in `docs/adr/`, and `CODING_STANDARDS.md`. Use the glossary's terms, exactly as defined, in code, tests, issues and PRs: an **operation** is the named function, a **calculation** is one operation applied to its operands, and each term's _Avoid_ list names the synonyms it replaces.

## The gate

`make gate` runs the format check, vet, lint, typecheck, both unit suites with their coverage thresholds, and the e2e smoke. CI runs `make gate`, then `docker build`. If you change the `Dockerfile` or what it copies, also run `make docker` before the PR. Work is done when the gate is **green**; until then it is in progress, and you report the failing output.

## Workflow

1. One issue. Take it from GitHub, or file it first (`docs/agents/issue-tracker.md`).
2. One branch from fresh main: `git fetch origin && git switch -c <type>/<slug> origin/main` (`feat/`, `fix/`, `docs/`, `chore/`).
3. Tests first, at the seam `CODING_STANDARDS.md` names for that layer. See them fail, then make them pass. Tag each e2e test the slice adds with its issue: `test('…', { tag: '@issue-<n>' }, …)`.
4. `make gate` is green.
5. `make evidence ISSUE=<n>` records a screenshot and video of each tagged test into `docs/evidence/<n>/`. Commit that output.
6. One PR, whose body links the evidence and says `Closes #<issue>`.

Parallel slices each get their own worktree (`git worktree add`), one issue per worktree.

## Docs

Every number in the README (coverage, counts, sizes) is pasted from a script's output or linked to a generated file such as `coverage/SUMMARY.md`. When a number changes, rerun the Make target that produces it and commit the result.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `NathaEEUD/sezzle-fullstack-calculator`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
