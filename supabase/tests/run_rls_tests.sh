#!/usr/bin/env bash
# Spin up a throwaway Postgres, apply the migration against a minimal Supabase-auth
# shim, and run the RLS / business-rule assertions in rls_test.sql.
# Exits non-zero if any assertion fails (psql ON_ERROR_STOP).
set -euo pipefail

PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@17/bin}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG="$ROOT/supabase/migrations/0001_init.sql"
TEST="$ROOT/supabase/tests/rls_test.sql"

TMP="$(mktemp -d /tmp/watchpoint-rls-XXXXXX)"
PGDATA="$TMP/data"
PORT=55999

"$PGBIN/initdb" -D "$PGDATA" --no-locale -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$PGDATA" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start >/dev/null

cleanup() {
  "$PGBIN/pg_ctl" -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

PSQL="$PGBIN/psql -h $TMP -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -X -q"

echo "--- creating Supabase auth shim ---"
$PSQL <<'SQL'
create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  aud text,
  role text
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create role authenticated nologin;
create publication supabase_realtime;
SQL

echo "--- applying migration ---"
$PSQL -f "$MIG" >/dev/null

echo "--- running RLS / business-rule tests ---"
$PSQL -f "$TEST"

echo "--- OK ---"
