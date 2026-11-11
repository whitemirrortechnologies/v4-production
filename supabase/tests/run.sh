#!/usr/bin/env bash
# Runs the migration + seed + end-to-end checks on a throwaway local Postgres DB.
# Usage: PGUSER=postgres bash supabase/tests/run.sh      (needs psql, createdb, dropdb)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${V4_TEST_DB:-v4test}
dropdb --if-exists "$DB"
createdb "$DB"
for r in anon authenticated service_role; do psql -q -X -d postgres -c "drop role if exists $r" >/dev/null 2>&1 || true; done
run() { psql -q -X -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }
run supabase/tests/supabase_shim.sql
run supabase/migrations/20261111000000_init.sql 2>&1 | grep -v "pg_cron not set up" || true
run supabase/seed.sql
run supabase/seed.sql   # seed must be re-runnable
run supabase/tests/e2e.sql 2>&1 | grep -E "NOTICE|ERROR|PASSED|DETAIL|CONTEXT"
