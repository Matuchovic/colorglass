#!/usr/bin/env bash
# Aplikuje migrace (a volitelně seed) na čistý PostgreSQL – pro CI a DB testy mimo Supabase.
# Použití: DATABASE_URL=postgres://postgres@localhost:5432/lena_test scripts/db-apply-plain.sh [--seed]
set -euo pipefail
: "${DATABASE_URL:?Nastavte DATABASE_URL}"
cd "$(dirname "$0")/.."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/plain-postgres-bootstrap.sql
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
if [[ "${1:-}" == "--seed" ]]; then
  echo "→ supabase/seed.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
fi
echo "Hotovo."
