#!/bin/sh
# Appends every prompt typed in this repo to docs/prompts/, one file per session.
# It must never block a prompt or add text to the session: no output, always exit 0.
{
  input=$(cat)
  prompt=$(printf '%s' "$input" | jq -r '.prompt // empty')
  session=$(printf '%s' "$input" | jq -r '.session_id // "unknown"' | cut -c1-8)
  root=${CLAUDE_PROJECT_DIR:-$(printf '%s' "$input" | jq -r '.cwd')}
  dir="$root/docs/prompts"

  if [ -n "$prompt" ] && mkdir -p "$dir"; then
    file=$(ls "$dir"/*-"$session".md 2>/dev/null | head -n 1)
    if [ -z "$file" ]; then
      file="$dir/$(date +%Y-%m-%d-%H%M)-$session.md"
      printf '# Session %s\n\nStarted %s on branch `%s`.\n' "$session" "$(date '+%Y-%m-%d %H:%M')" \
        "$(git -C "$root" branch --show-current 2>/dev/null)" > "$file"
    fi
    printf '\n## %s\n\n````text\n%s\n````\n' "$(date +%H:%M:%S)" "$prompt" >> "$file"
  fi
} >/dev/null 2>&1
exit 0
