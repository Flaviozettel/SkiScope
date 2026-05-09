# SkiScope Datenbank

Postgres + PostGIS. Schema und Setup sind in nummerierte SQL-Dateien aufgesplittet,
damit sie reproduzierbar in der richtigen Reihenfolge laufen.

## Dateien

| Datei                    | Zweck                                                             | Wer führt aus      |
| ------------------------ | ----------------------------------------------------------------- | ------------------ |
| `00_roles.sql`           | Rolle + DB anlegen                                                | Postgres-Superuser |
| `01_extensions.sql`      | `CREATE EXTENSION postgis`                                        | `skiscopeadm`      |
| `02_schema.sql`          | Tabellen, Indizes, View                                           | `skiscopeadm`      |
| `03_seed.sql`            | Lookup-Daten (`strecken_typen`, `strecken_stati`)                 | `skiscopeadm`      |
| `import_static_geom.sql` | Statische Geometrie-Daten (gross)                                 | `skiscopeadm`      |
| `init.sh`                | Bootstrap-Wrapper, ruft die SQLs in der richtigen Reihenfolge auf | du                 |

## Rollem

Es wäre sauberer verschiedene Rollen anzulege, dies bei Gelegenheit noch umsetzten.

## Setup

Voraussetzung: lokal installiertes Postgres mit PostGIS, erreichbar als
Superuser `postgres` (Default).

```bash
cd server/database
ADM_PW=… ./init.sh
```

Anschliessend statische OSM Geometrien importieren:

```bash
PGPASSWORD="$ADM_PW" psql -U skiscopeadm -d skiscope -f import_static_geom.sql
```

## Anschluss durchs Backend

`server/app/.env` setzt `DB_USER=skiscopeadm` und das Passwort identisch zu
`ADM_PW`.
