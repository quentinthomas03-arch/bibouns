#!/usr/bin/env bash
# Lance les migrations + tests de sécurité sur une base PostgreSQL jetable.
# - En CI : DATABASE_URL est fourni (service postgres).
# - En local : démarre un cluster temporaire si les binaires sont présents.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" ]]; then
  PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
  TMP=$(mktemp -d)
  trap 'su postgres -c "$PGBIN/pg_ctl -D $TMP/data stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
  chown postgres "$TMP"
  su postgres -c "$PGBIN/initdb -D $TMP/data -A trust -U postgres" >/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $TMP/data -o '-p 54329 -k $TMP' -l $TMP/log start -w" >/dev/null
  DATABASE_URL="postgresql://postgres@localhost:54329/postgres?host=$TMP"
fi

run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }
run -f tests/db/supabase-stub.sql 2>/dev/null
for f in supabase/migrations/*.sql; do echo "→ migration $f"; run -f "$f" >/dev/null; done
run -t -A -f tests/db/security.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  /  /" | grep -v "^$"
