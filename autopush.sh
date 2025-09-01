#!/usr/bin/env bash
set -euo pipefail
BRANCH="${1:-main}"
EXCLUDES="(.git|node_modules|dist|build|out|.next)"
QUIET_SEC="${QUIET_SEC:-10}"
MIN_GAP_SEC="${MIN_GAP_SEC:-120}"
last=0
echo "Auto-push on '$BRANCH'"
if command -v inotifywait >/dev/null 2>&1; then
  MODE=inotify; echo "Mode: inotify"
else
  MODE=poll; echo "Mode: poll"
fi
while true; do
  if [ "$MODE" = "inotify" ]; then
    inotifywait -r -e modify,create,delete,move --exclude "$EXCLUDES" -q .
    while inotifywait -r -t "$QUIET_SEC" -e modify,create,delete,move --exclude "$EXCLUDES" -q .; do : ; done
  else
    sleep 60
    CHANGES="$(git status --porcelain || true)"
    [ -z "$CHANGES" ] && continue
  fi
now=$(date +%s); gap=$((now-last))
  [ $gap -lt $MIN_GAP_SEC ] && sleep $((MIN_GAP_SEC-gap))
git pull --rebase --autostash || git rebase --abort
  git add -A
  if git diff --cached --quiet; then
    continue
  fi
  ts=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  git commit -m "chore: auto-commit from mobile ($ts)" || true
  git push origin "$BRANCH" && last=$(date +%s)
  echo "pushed at $(date)"
done
