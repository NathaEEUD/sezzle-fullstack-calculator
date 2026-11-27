# Prompts

Every prompt typed in this repo is captured by a `UserPromptSubmit` hook ([`.claude/hooks/log-prompt.sh`](.claude/hooks/log-prompt.sh)); the raw log is in [`docs/prompts/`](docs/prompts/), one file per session.

## Workflow

| Stage | Session | Prompt |
| --- | --- | --- |
| Setup: prompt capture | — | [Setup: prompt capture](#setup-prompt-capture) |

## Setup: prompt capture

Added the `UserPromptSubmit` hook that logs prompts to `docs/prompts/`. This session ran before the hook existed, so its prompt is not in the log.
