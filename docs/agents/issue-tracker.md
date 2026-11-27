# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Make an issue a sub-issue of a parent**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>` afterwards (`gh` 2.94+). Older `gh`: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (database id, as in **Blocking** below). Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Issue status

Work progress is tracked with GitHub's built-in issue status (public preview), not labels or a Projects board. Every new issue starts in Backlog. Triage labels stay as they are: `ready-for-agent` says who can take an issue, and the status says where it is.

| Status | ID | Set when |
| --- | --- | --- |
| Backlog | `IS_kgAC` | the issue is filed |
| Todo | `IS_kgAD` | it's planned next |
| In progress | `IS_kgAE` | a session claims it |
| In review | `IS_kgAI` | its PR is open |
| Done | `IS_kgAF` | its PR is merged and the issue is closed |
| Not planned | `IS_kgAG` | it won't be done |
| Duplicate | `IS_kgAH` | another issue covers it |

The IDs belong to `NathaEEUD/sezzle-fullstack-calculator`. Changing the status can close or reopen the issue, because each status implies an open or closed state.

- **Read the status**: `gh api repos/NathaEEUD/sezzle-fullstack-calculator/issues/<n> --jq .status.name`. `gh issue view` doesn't show it.
- **Set the status**: `gh api graphql -f query='mutation($id:ID!,$s:ID!){updateIssue(input:{id:$id,statusId:$s}){issue{status{name}}}}' -f id="$(gh api repos/NathaEEUD/sezzle-fullstack-calculator/issues/<n> --jq .node_id)" -f s=<status-id>`. It needs a token with the `project` scope: `gh auth refresh -s project`.
- **List the statuses** (if an ID stops working): `gh api graphql -f query='{repository(owner:"NathaEEUD",name:"sezzle-fullstack-calculator"){planningStatuses(first:20){nodes{id name}}}}'`.
- **Claim an issue**: read its status and open blockers (`--jq '.status.name, .issue_dependencies_summary.blocked_by'`). Stop if the status isn't Backlog or Todo, or if any blocker is open. Otherwise set it to In progress before doing anything else.
- **Hand off for review**: once the PR is open, set the issue to In review. Merging a PR whose body says `Closes #<n>` closes the issue. If its status doesn't follow to Done, set it.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (see **Make an issue a sub-issue of a parent**). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
