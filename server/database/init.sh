#!/usr/bin/env bash
# ============================================================
#  Shell-Skript zum automatischen Aufsetzen der SkiScope-Datenbank
#
#  Reihenfolge:
#    0. Rolle + Datenbank anlegen   (postgres)
#    1. Extensions installieren     (skiscopeadm)
#    2. Schema erzeugen             (skiscopeadm)
#    3. Lookup-Seeds                (skiscopeadm)
#
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${ADM_PW:?bitte ADM_PW setzen}"

PSQL_SUPER=(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -v ON_ERROR_STOP=1)
PSQL_ADM=(psql -h "$PGHOST" -p "$PGPORT" -U skiscopeadm -d skiscope -v ON_ERROR_STOP=1)

echo "→ 1/4  Rolle + DB"
"${PSQL_SUPER[@]}" -v adm_pw="$ADM_PW" -f 00_roles.sql

echo "→ 2/4  Extensions"
PGPASSWORD="$ADM_PW" "${PSQL_ADM[@]}" -f 01_extensions.sql

echo "→ 3/4  Schema"
PGPASSWORD="$ADM_PW" "${PSQL_ADM[@]}" -f 02_schema.sql

echo "→ 4/4  Seeds"
PGPASSWORD="$ADM_PW" "${PSQL_ADM[@]}" -f 03_seed.sql

echo "✓ SkiScope-Datenbank ist bereit."
echo "  Geometrien anschliessend mit 'import_static_geom.sql' importieren."
