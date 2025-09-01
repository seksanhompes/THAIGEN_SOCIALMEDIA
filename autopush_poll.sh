#!/data/data/com.termux/files/usr/bin/bash
set -e
BRANCH="${1:-main}"
INTERVAL_SEC=60
MIN_GAP_SEC=120
last=0
echo "Auto-push (polling) on '$BRANCH'"
while true; do
  CHANGES="$(git status --porcelain || true)"
  if [ -n "$CHANGES" ]; then
    now=$(date +%s); gap=$((now-last))
    [ $gap -lt $MIN_GAP_SEC ] && sleep $((MIN_GAP_SEC-gap))
    git pull --rebase --autostash || git rebase --abort
    git add -A
    ts=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    git commit -m "chore: auto-commit from mobile ($ts)" || true
    git push origin "$BRANCH" && last=$(date +%s)
    echo "pushed @ $(date)"
  fi
  sleep "$INTERVAL_SEC"
done
