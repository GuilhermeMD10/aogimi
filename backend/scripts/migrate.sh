#!/usr/bin/env bash
# Apply every numbered migration against $DATABASE_URL in order, with
# ON_ERROR_STOP so a single failure halts the run loudly.
#
# Notes:
#   - Runs from backend/ so 033's \copy from jlptwordslist/ resolves
#     relative to its CSVs.
#   - Skips `reset_user_data.sql` — that's the wipe-and-recreate tool,
#     not part of the numbered chain.
#   - Each migration runs in its own psql invocation; the BEGIN/COMMIT
#     inside the file is what makes it transactional.
#   - The chain is NOT replay-safe: 021 drops every user-data table and
#     027 resets FSRS state. So the script refuses to run against a DB
#     that already has a `users` table unless told where to start with
#     `--from NNN`, which skips every migration numbered below NNN.
#     A fresh DB (no `users` table) runs the whole chain as before.
#
# Usage:
#   DATABASE_URL='postgresql://…' backend/scripts/migrate.sh              # fresh DB
#   DATABASE_URL='postgresql://…' backend/scripts/migrate.sh --from 033   # existing DB

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

# --from NNN: first migration number to apply (three digits, as in the
# filenames). Required on a DB that already has user data.
from=""
while [ $# -gt 0 ]; do
  case "$1" in
    --from)   from="${2:-}"; shift 2 ;;
    --from=*) from="${1#--from=}"; shift ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done
if [ -n "$from" ] && ! [[ "$from" =~ ^[0-9]{3}$ ]]; then
  echo "--from expects a three-digit migration number, got '$from'" >&2
  exit 1
fi

# Resolve backend/ as the project root for this script regardless of
# where the user invoked from. 033's \copy path is relative.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

# Refuse to replay the chain over live user data. `to_regclass` is NULL
# when the table doesn't exist, so a fresh DB passes without --from.
users_exists="$(psql --set ON_ERROR_STOP=on -Atq "$DATABASE_URL" \
  -c "SELECT to_regclass('public.users') IS NOT NULL")"
if [ "$users_exists" = "t" ] && [ -z "$from" ]; then
  echo "refusing: this database already has a users table, and the chain" >&2
  echo "includes destructive migrations (021 drops user data). Pass" >&2
  echo "--from NNN to apply only migrations numbered NNN and above." >&2
  exit 1
fi

shopt -s nullglob
files=(migrations/*.sql migrations/*.psql)
shopt -u nullglob

# Sort by basename so 000_ runs first, then 001_, 002_, … in order.
IFS=$'\n' files=($(printf '%s\n' "${files[@]}" | sort))
unset IFS

# Drop everything below --from. `10#` forces decimal: a bare 011 would be
# read as octal inside (( )).
if [ -n "$from" ]; then
  kept=()
  for f in "${files[@]}"; do
    num="$(basename "$f")"; num="${num%%_*}"
    [[ "$num" =~ ^[0-9]{3}$ ]] && (( 10#$num < 10#$from )) && continue
    kept+=("$f")
  done
  # bash 3.2 (macOS) trips `set -u` on an empty array expansion.
  files=(${kept[@]+"${kept[@]}"})
fi

echo "Running ${#files[@]} migrations against ${DATABASE_URL%%\?*}"

for f in "${files[@]}"; do
  base="$(basename "$f")"
  # reset_user_data.sql is a separate utility — skip in normal runs.
  if [ "$base" = "reset_user_data.sql" ]; then
    continue
  fi
  echo "→ $base"
  PGOPTIONS='--client-min-messages=warning' \
    psql --set ON_ERROR_STOP=on "$DATABASE_URL" -f "$f"
done

echo "✓ all migrations applied"
