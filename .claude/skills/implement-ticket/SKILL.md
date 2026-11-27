---
name: implement-ticket
description: Implement one ticket from claim to an open PR with proof for every acceptance criterion. Pass the issue number.
disable-model-invocation: true
---

Implement the ticket whose issue number is `$ARGUMENTS`, from **claim** to an open PR, then hand it back to me. One run is one ticket.

`AGENTS.md`, `CODING_STANDARDS.md`, `GLOSSARY.md` and `docs/adr/` are the rules for the code. When the ticket contradicts any of them, stop and ask me which one wins.

## Steps

1. **Claim.** Read the ticket in full (body and comments) and state its title. Then claim it as the **Issue status** section of `docs/agents/issue-tracker.md` says: it must be in Backlog or Todo with no open blocker, and claiming sets it to In progress. If the ticket fails that check, report why and stop. Done when the ticket reads In progress.
2. **Worktree.** Work in a worktree of your own, on a branch from freshly fetched `origin/main` named `<type>/<n>-<slug>`, with the type chosen as `AGENTS.md` says. Before the first change, note the `coverage/SUMMARY.md` lines on `origin/main` as the coverage _before_ ("none" if the file doesn't exist).
3. **Seams.** Call the Skill tool with `tdd`. Map every acceptance criterion to the seam that will prove it, using the seams `CODING_STANDARDS.md` names. Send me that map and wait for my ok. Done when I've approved the map.
4. **Red, then green.** Work through the map one criterion at a time: show each new test going _red_, then make it _green_. A criterion no test can prove (for example "`go.mod` has no `require` lines") gets the command that shows it instead.
5. **Gate.** Run `make gate`. If it won't go green, stop and show me the failing output. The ticket stays In progress and no PR is opened. Done when it's green.
6. **Proof.** Collect proof for every acceptance criterion into `docs/evidence/<n>/`, as **Proof** below describes, and commit it. Done when every criterion has a proof file or a named test.
7. **PR.** Push, then write the body with the `pr` skill. In its Evidence section, put an acceptance checklist where each box links to its proof: a test name, a screenshot or a curl transcript. Embed the screenshots from `https://raw.githubusercontent.com/NathaEEUD/sezzle-fullstack-calculator/<pushed head sha>/docs/evidence/<n>/<file>` and link the video. A criterion only CI can prove ("green in CI") stays unchecked and is marked pending. The body ends with `Closes #<n>`.
8. **Hand back.** Set the ticket to In review, as `issue-tracker.md` says. Report the PR number and end the run there: review, merge and the next ticket are mine.

## Proof

Everything goes under `docs/evidence/<n>/`. Write in each file the command that produced it.

- **Tests**: `tests.md` maps each acceptance criterion to the test that proves it (or the command, with its output). Below the map goes the tail of the `make gate` output.
- **UI behaviour**, when the ticket adds e2e tests: run `make evidence ISSUE=<n>`. That gives a screenshot of each acceptance scenario's end state, plus the video of the run.
- **API behaviour**, when the ticket adds a route or an error row: run the binary and record `curl -si` transcripts (the command and the full response), one for each route or row.
- **Docker**, when the ticket changes the `Dockerfile` or what it copies: run `make docker`, then `docker run`, and record the same curl and screenshot against the container.
- **Coverage**: `coverage.md` holds the before lines from step 2 and the after lines from the regenerated `coverage/SUMMARY.md`.
