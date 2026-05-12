-- ============================================================
--  00_roles.sql – Rolle + Datenbank für SkiScope
--
--  Wird vom Superuser (postgres) ausgeführt. Passwort wird über
--  eine psql-Variable reingereicht, damit es NICHT im Repo landet:
--
--    psql -U postgres -v adm_pw="$ADM_PW" -f 00_roles.sql
--
--  Im Projekt verwenden wir bewusst eine einzige Rolle für alles
--  (GeoServer, FastAPI-Backend, Schema-Änderungen): skiscopeadm.
-- ============================================================

-- Rolle idempotent anlegen bzw. Passwort aktualisieren.
-- WICHTIG: Wir verwenden hier KEIN DO $$ ... $$, weil psql-Variablen
-- (:'adm_pw') innerhalb von Dollar-Quotes nicht substituiert werden.
-- Stattdessen \gexec: das SELECT baut den fertigen SQL-Befehl als
-- String zusammen (mit korrekt gequotetem Passwort via %L) und \gexec
-- führt das Ergebnis als nächste Anweisung aus.

SELECT format('CREATE ROLE skiscopeadm LOGIN PASSWORD %L', :'adm_pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'skiscopeadm')
\gexec

SELECT format('ALTER ROLE skiscopeadm WITH LOGIN PASSWORD %L', :'adm_pw')
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'skiscopeadm')
\gexec

-- Datenbank anlegen, falls noch nicht vorhanden.
-- (CREATE DATABASE darf nicht in einer Transaktion laufen, deshalb \gexec)
SELECT 'CREATE DATABASE skiscope OWNER skiscopeadm'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'skiscope')
\gexec

\c skiscope

-- Schema gehört der Rolle
ALTER SCHEMA public OWNER TO skiscopeadm;
