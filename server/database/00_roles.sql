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

-- Rolle idempotent anlegen (kein Fehler bei Re-Run, Passwort wird aktualisiert)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'skiscopeadm') THEN
        CREATE ROLE skiscopeadm LOGIN PASSWORD :'adm_pw';
    ELSE
        EXECUTE format('ALTER ROLE skiscopeadm WITH LOGIN PASSWORD %L', :'adm_pw');
    END IF;
END
$$;

-- Datenbank anlegen, falls noch nicht vorhanden.
-- (CREATE DATABASE darf nicht in einer Transaktion laufen, deshalb \gexec)
SELECT 'CREATE DATABASE skiscope OWNER skiscopeadm'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'skiscope')
\gexec

\c skiscope

-- Schema gehört der Rolle
ALTER SCHEMA public OWNER TO skiscopeadm;
