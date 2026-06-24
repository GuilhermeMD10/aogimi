#!/usr/bin/env bash
# Apply every numbered migration against $DATABASE_URL in order, with
# ON_ERROR_STOP so a single failure halts the run loudly.
#
# Notes:
#   - Runs from backend/ so 011's \copy from jlptwordslist/ resolves
#     relative to its CSVs.
#   - Skips `reset_user_data.sql` — that's the wipe-and-recreate tool,
#     not part of the numbered chain.
#   - Each migration runs in its own psql invocation; the BEGIN/COMMIT
#     inside the file is what makes it transactional.
#
# Usage:
#   DATABASE_URL='postgresql://…' backend/scripts/migrate.sh

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

# Resolve backend/ as the project root for this script regardless of
# where the user invoked from. 011's \copy path is relative.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

shopt -s nullglob
files=(migrations/*.sql migrations/*.psql)
shopt -u nullglob

# Sort by basename so 000_ runs first, then 001_, 002_, …, 022_.
IFS=$'\n' files=($(printf '%s\n' "${files[@]}" | sort))
unset IFS

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
