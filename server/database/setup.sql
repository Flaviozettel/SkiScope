--  Dieses Skript erstellt die das (noch nicht!!) vollständige logische Datenbankschema für das Skiscope projekt.
--  Es ist bewusst nicht vollstänidg normalisiert (pragmatische 3NF).
--  Die Daten werden mit den skripts im /preprocessing Ordner importiert.


--  Import-Strategie für die STnet Daten: vollständiger DELETE+INSERT pro Station
--  bei jedem Cronjob-Lauf. Kein Stammdaten/Bewegungsdaten-Split.
--  updated_at: wird vom Cronjob bei jedem Import gesetzt.
--  API liefert zwei unabhängige Datenquellen:
--    api_agg_*   Manuell von Station nachgeführte Aggregatwerte
--    Detailtabellen  Einzelne Pisten/Lifte (nicht alle Stationen)
--  View skigebiete_kennzahlen wählt je Kennzahl:
--    1. api_agg wenn vorhanden (offizielle Stationszahl)
--    2. Sonst selbst aus Detailtabelle aggregieren
--    3. Sonst NULL

-- ============================================================

-- PostGis instalieren

CREATE EXTENSION IF NOT EXISTS postgis;

-- LOOKUP-TABELLEN  (statisch, werden nicht vom Cronjob berührt)

CREATE TABLE strecken_typen (
    typ_id      INTEGER      PRIMARY KEY,
    kategorie   VARCHAR(20)  NOT NULL
                    CHECK (kategorie IN
                        ('piste','lift','langlauf','schlitteln','wandern')),
    bezeichnung TEXT         NOT NULL
);

INSERT INTO strecken_typen VALUES
    (4100, 'piste',      'Keine Angaben'),
    (4101, 'piste',      'Blaue Piste'),
    (4102, 'piste',      'Rote Piste'),
    (4103, 'piste',      'Schwarze Piste'),
    (4104, 'piste',      'Gelbe Piste (unpräpariert)'),
    (4105, 'piste',      'Orange Piste (Skiroute)'),
    (4106, 'piste',      'Blau/rote Piste'),
    (4107, 'piste',      'Rot/schwarze Piste'),
    (4108, 'piste',      'Schwarz/blaue Piste'),
    (4109, 'piste',      'Hochgeschwindigkeits-Piste'),
    (4000, 'lift',       'Keine Angaben'),
    (4001, 'lift',       'Ponylift'),
    (4002, 'lift',       'Skilift'),
    (4004, 'lift',       'Sessellift 2 Personen'),
    (4005, 'lift',       'Sessellift 3 Personen'),
    (4006, 'lift',       'Sessellift 4 Personen'),
    (4008, 'lift',       'Sessellift 6 Personen'),
    (4009, 'lift',       'Sessellift 8 Personen'),
    (4010, 'lift',       'Luftseilbahn'),
    (4011, 'lift',       'Seilbahn'),
    (4013, 'lift',       'Zahnradbahn'),
    (4014, 'lift',       'Kombibahn'),
    (4015, 'lift',       'Dreifachgondel'),
    (4016, 'lift',       'Babylift'),
    (4017, 'lift',       'Zauberteppich'),
    (4018, 'lift',       'Standseilbahn'),
    (4200, 'langlauf',   'Keine Angaben'),
    (4201, 'langlauf',   'Klassisch und Skating'),
    (4202, 'langlauf',   'Skating'),
    (4203, 'langlauf',   'Klassisch'),
    (4204, 'langlauf',   'Hundeloipe Skating'),
    (4205, 'langlauf',   'Hundeloipe klassisch'),
    (4206, 'langlauf',   'Hundeloipe klassisch und Skating'),
    (4400, 'wandern',    'Keine Angabe'),
    (4401, 'wandern',    'Wanderweg'),
    (4402, 'wandern',    'Schneeschuhwandern'),
    (4403, 'wandern',    'Klettersteig'),
    (4405, 'wandern',    'Bergwandern'),
    (4500, 'schlitteln', 'Keine Angaben'),
    (4501, 'schlitteln', 'Schlitteln');


CREATE TABLE strecken_stati (
    status_id   INTEGER      PRIMARY KEY,
    kontext     VARCHAR(20)  NOT NULL
                    CHECK (kontext IN ('piste_langlauf','lift','wandern')),
    bezeichnung TEXT         NOT NULL
);

INSERT INTO strecken_stati VALUES
    (800,  'piste_langlauf', 'Keine Meldung'),
    (801,  'piste_langlauf', 'Gut'),
    (802,  'piste_langlauf', 'Gut-fahrbar'),
    (803,  'piste_langlauf', 'Fahrbar-gut'),
    (804,  'piste_langlauf', 'Fahrbar'),
    (805,  'piste_langlauf', 'Geschlossen'),
    (806,  'piste_langlauf', 'Saisonschluss'),
    (807,  'piste_langlauf', 'Auf Anfrage'),
    (3000, 'lift',           'Keine Angaben'),
    (3001, 'lift',           'Offen'),
    (3002, 'lift',           'In Vorbereitung'),
    (3003, 'lift',           'Geschlossen'),
    (1200, 'wandern',        'Keine Meldung'),
    (1201, 'wandern',        'Gut'),
    (1202, 'wandern',        'Begehbar'),
    (1203, 'wandern',        'Geschlossen'),
    (1204, 'wandern',        'Saisonschluss');


-- ============================================================
--  skigebiete
-- ============================================================
CREATE TABLE skigebiete (
    station_id                INTEGER      PRIMARY KEY,
    updated_at                TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Kontakt / Stammdaten
    station_name              TEXT         NOT NULL,
    ort                       TEXT,
    zip                       VARCHAR(10),
    telefon                   VARCHAR(50),
    url                       TEXT,
    oeffnungszeit             TIME,
    schliessungszeit          TIME,

    -- Schneemessung
    last_api_update           TIMESTAMPTZ,
    schneetiefe_tal_cm        NUMERIC(6,1),
    schneetiefe_piste_cm      NUMERIC(6,1),
    neuschnee_cm              NUMERIC(6,1),
    neuschnee_piste_top_cm    NUMERIC(6,1),
    letzter_schneefall_tal    TIMESTAMPTZ,
    letzter_schneefall_piste  TIMESTAMPTZ,
    lawinengefahr_url         TEXT,
    pistenzustand             TEXT,
    schnee_haupt              TEXT,
    schnee_teilweise          TEXT,

    -- API-Aggregat Pisten
    api_agg_anzahl_pisten             SMALLINT,
    api_agg_km_pisten_gesamt          NUMERIC(8,1),
    api_agg_km_pisten_offen           NUMERIC(8,1),
    api_agg_anzahl_talabfahrten       SMALLINT,
    api_agg_anzahl_talabfahrten_offen SMALLINT,
    api_agg_km_kunstschnee            NUMERIC(8,1),
    api_agg_km_flutlicht_pisten       NUMERIC(8,1),

    -- API-Aggregat Lifte (einzige Liftquelle, kein Detailarray)
    api_agg_anzahl_lifte_offen        SMALLINT,
    api_agg_anzahl_lifte_gesamt       SMALLINT,
    api_agg_anzahl_seilbahnen         SMALLINT,
    api_agg_anzahl_sesselbahnen       SMALLINT,
    api_agg_anzahl_skilifte           SMALLINT,
    api_agg_anzahl_babylifte          SMALLINT,
    api_agg_anzahl_foerderband        SMALLINT,

    -- API-Aggregat Langlauf
    api_agg_km_klassisch_gesamt       NUMERIC(8,1),
    api_agg_km_klassisch_praepar      NUMERIC(8,1),
    api_agg_km_skating_gesamt         NUMERIC(8,1),
    api_agg_km_skating_praepar        NUMERIC(8,1),
    api_agg_km_flutlicht_langlauf     NUMERIC(8,1),

    -- API-Aggregat Schlitteln
    api_agg_anzahl_schlittelwege       SMALLINT,
    api_agg_anzahl_schlittelwege_offen SMALLINT,
    api_agg_km_schlitteln              NUMERIC(8,1),
    api_agg_schlitteln_kunstschnee     BOOLEAN,
    api_agg_schlitteln_oev             BOOLEAN,
    api_agg_schlitteln_verleih         BOOLEAN,

    -- API-Aggregat Winterwandern
    api_agg_km_winterwandern_praepar  NUMERIC(8,1),
    api_agg_km_schneeschuh            NUMERIC(8,1)
);


-- ============================================================
--  DETAILTABELLEN
-- ============================================================

CREATE TABLE pisten (
    piste_id        SERIAL       PRIMARY KEY,
    station_id      INTEGER      NOT NULL REFERENCES skigebiete(station_id),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    piste_name      TEXT         NOT NULL,
    typ_id          INTEGER      REFERENCES strecken_typen(typ_id),
    status_id       INTEGER      REFERENCES strecken_stati(status_id),
    laenge_m_gesamt NUMERIC(8,1),
    laenge_m_heute  NUMERIC(8,1),
    sort_order      SMALLINT
);

CREATE TABLE lifte (
    lift_id    SERIAL       PRIMARY KEY,
    station_id INTEGER      NOT NULL REFERENCES skigebiete(station_id),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    lift_name  TEXT         NOT NULL,
    typ_id     INTEGER      REFERENCES strecken_typen(typ_id),
    status_id  INTEGER      REFERENCES strecken_stati(status_id),
    sort_order SMALLINT
);

CREATE TABLE langlauf (
    loipe_id            SERIAL       PRIMARY KEY,
    station_id          INTEGER      NOT NULL REFERENCES skigebiete(station_id),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    loipe_name          TEXT         NOT NULL,
    typ_id              INTEGER      REFERENCES strecken_typen(typ_id),
    status_id           INTEGER      REFERENCES strecken_stati(status_id),
    laenge_m_gesamt     NUMERIC(8,1),
    laenge_m_heute      NUMERIC(8,1),
    letzte_praeparation DATE,
    geom                GEOMETRY(Point, 4326),
    sort_order          SMALLINT
);

CREATE TABLE schlittelwege (
    weg_id              SERIAL       PRIMARY KEY,
    station_id          INTEGER      NOT NULL REFERENCES skigebiete(station_id),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    weg_name            TEXT         NOT NULL,
    beschreibung        TEXT,
    typ_id              INTEGER      REFERENCES strecken_typen(typ_id),
    status_id           INTEGER      REFERENCES strecken_stati(status_id),
    laenge_m_gesamt     NUMERIC(8,1),
    laenge_m_heute      NUMERIC(8,1),
    letzte_praeparation DATE,
    geom                GEOMETRY(Point, 4326),
    sort_order          SMALLINT
);

CREATE TABLE winterwandern (
    weg_id          SERIAL       PRIMARY KEY,
    station_id      INTEGER      NOT NULL REFERENCES skigebiete(station_id),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    weg_name        TEXT         NOT NULL,
    typ_id          INTEGER      REFERENCES strecken_typen(typ_id),
    status_id       INTEGER      REFERENCES strecken_stati(status_id),
    laenge_m_gesamt NUMERIC(8,1),
    laenge_m_heute  NUMERIC(8,1),
    sort_order      SMALLINT
);


-- Hier Werte die im frontend dann nicht verwendet werden löschen umd die Datenbank schlank zu halten.
CREATE TABLE wetter_skigebiet (
    station_id                      INTEGER      REFERENCES skigebiete(station_id),
    zeitpunkt                       TIMESTAMPTZ  NOT NULL,
    typ                             VARCHAR(20)  NOT NULL,
    temperatur_2m                   NUMERIC(5,1),
    realtive_luftfeuchtigkeit_2m    NUMERIC(5,1),
    gefuehlte_temperatur            NUMERIC(5,1),
    niederschlag                    NUMERIC(5,1),
    regen                           NUMERIC(5,1),
    wind_geschwindigkeit_10m        NUMERIC(5,1),
    wind_boehen_10m                 NUMERIC(5,1),
    schneefall                      NUMERIC(5,1),
    schnee_tiefe                    NUMERIC(5,1),
    wetter_code_wmo                 NUMERIC(5,1),
    bewoelkung_cover                NUMERIC(5,1),
    bewoelkung_tief                 NUMERIC(5,1),
    bewoelkung_mittel               NUMERIC(5,1),
    bewoelkung_hoch                 NUMERIC(5,1),
    schneefall_hoehe                NUMERIC(5,1),
    sonnenscheindauer               NUMERIC(5,1),
    wetter_modell                   VARCHAR(20),
    PRIMARY KEY (station_id, datum)
)



-- ============================================================
--  INDIZES (diese sind zwingend nötig um den VIEW performant zu machen.
-- ============================================================

CREATE INDEX ON pisten        (station_id);
CREATE INDEX ON pisten        (typ_id);
CREATE INDEX ON pisten        (status_id);

CREATE INDEX ON lifte         (station_id);
CREATE INDEX ON lifte         (typ_id);
CREATE INDEX ON lifte         (status_id);

CREATE INDEX ON langlauf      (station_id);
CREATE INDEX ON langlauf      (typ_id);
CREATE INDEX ON langlauf      (status_id);
CREATE INDEX ON langlauf      USING GIST (geom);

CREATE INDEX ON schlittelwege (station_id);
CREATE INDEX ON schlittelwege (status_id);
CREATE INDEX ON schlittelwege USING GIST (geom);

CREATE INDEX ON winterwandern (station_id);
CREATE INDEX ON winterwandern (typ_id);
CREATE INDEX ON winterwandern (status_id);


-- ============================================================
--  VIEW: skigebiete_kennzahlen
-- Problematik: API liefert zum einen aggregierte Kennzahlen auf den Stationen,
-- zum anderen Detaildaten wie einzelne Pisten und Lifte die mit den Stationen verknüpft sind.
-- Es gibt aber keine Garantie, dass die API-Aggregate immer gepflegt sind, oder dass es immer Detaildaten gibt.
-- Deshlab ist ein Fallback nötig, um fehlende aggregatsdaten selber aus den Detaildaten zu berechnen. 
--Es gibt aber auch Fälle, wo weder Aggregat- noch Detaildaten vorhanden sind.
--
--  Priorität je Kennzahl:
--    1. api_agg IS NOT NULL  →  api_agg            (quelle = 'api_agg')
--    2. api_agg IS NULL, Detail vorhanden           (quelle = 'detail_aggregiert')
--    3. Beides fehlt         →  NULL               (quelle = 'keine_daten')
--
--  Lifte: immer api_agg (kein Detailarray in der API).
--  Pistenfarben / Loipenanzahl: immer aus Detail, da api_agg
--  diese Aufschlüsselung nicht enthält.
-- ============================================================
CREATE VIEW skigebiete_kennzahlen AS
WITH
detail_pisten AS (
    SELECT
        station_id,
        COUNT(*)                                                          AS anzahl_pisten,
        COUNT(*) FILTER (WHERE status_id IN (801,802,803,804))            AS anzahl_pisten_offen,
        SUM(laenge_m_gesamt)                                              AS m_pisten_gesamt,
        SUM(laenge_m_heute) FILTER (WHERE status_id IN (801,802,803,804)) AS m_pisten_offen,
        COUNT(*) FILTER (WHERE typ_id = 4101)                             AS anzahl_blau,
        COUNT(*) FILTER (WHERE typ_id = 4102)                             AS anzahl_rot,
        COUNT(*) FILTER (WHERE typ_id = 4103)                             AS anzahl_schwarz
    FROM pisten
    GROUP BY station_id
),
detail_langlauf AS (
    SELECT
        station_id,
        COUNT(*)             AS anzahl_loipen,
        SUM(laenge_m_gesamt) AS m_langlauf_gesamt,
        SUM(laenge_m_heute)  AS m_langlauf_offen
    FROM langlauf
    GROUP BY station_id
),
detail_schlittel AS (
    SELECT
        station_id,
        COUNT(*)                                                   AS anzahl_schlittelwege,
        COUNT(*) FILTER (WHERE status_id IN (801,802,803,804))     AS anzahl_schlittelwege_offen
    FROM schlittelwege
    GROUP BY station_id
),
detail_wandern AS (
    SELECT
        station_id,
        COUNT(*)             AS anzahl_wanderwege,
        SUM(laenge_m_gesamt) AS m_wandern_gesamt
    FROM winterwandern
    GROUP BY station_id
)
SELECT
    sg.station_id,
    sg.station_name,
    sg.updated_at,

    -- ── Pisten ───────────────────────────────────────────────
    CASE
        WHEN sg.api_agg_km_pisten_gesamt IS NOT NULL THEN 'api_agg'
        WHEN dp.station_id               IS NOT NULL THEN 'detail_aggregiert'
        ELSE 'keine_daten'
    END                                                              AS quelle_pisten,

    COALESCE(sg.api_agg_anzahl_pisten, dp.anzahl_pisten)            AS anzahl_pisten,
    dp.anzahl_pisten_offen,   -- nur aus Detail verfügbar

    CASE
        WHEN sg.api_agg_km_pisten_gesamt IS NOT NULL
             THEN ROUND(sg.api_agg_km_pisten_gesamt / 1000.0, 1)
        WHEN dp.station_id IS NOT NULL
             THEN ROUND(dp.m_pisten_gesamt / 1000.0, 1)
    END                                                              AS km_pisten_gesamt,

    CASE
        WHEN sg.api_agg_km_pisten_offen IS NOT NULL
             THEN ROUND(sg.api_agg_km_pisten_offen / 1000.0, 1)
        WHEN dp.station_id IS NOT NULL
             THEN ROUND(dp.m_pisten_offen / 1000.0, 1)
    END                                                              AS km_pisten_offen,

    -- Farbaufteilung: nur aus Detail (api_agg kennt keine Farben)
    dp.anzahl_blau,
    dp.anzahl_rot,
    dp.anzahl_schwarz,

    -- ── Lifte ────────────────────────────────────────────────
    -- Kein Detailarray → immer api_agg
    CASE
        WHEN sg.api_agg_anzahl_lifte_gesamt IS NOT NULL THEN 'api_agg'
        ELSE 'keine_daten'
    END                                                              AS quelle_lifte,
    sg.api_agg_anzahl_lifte_gesamt                                   AS anzahl_lifte,
    sg.api_agg_anzahl_lifte_offen                                    AS anzahl_lifte_offen,
    sg.api_agg_anzahl_seilbahnen,
    sg.api_agg_anzahl_sesselbahnen,
    sg.api_agg_anzahl_skilifte,
    sg.api_agg_anzahl_babylifte,

    -- ── Langlauf ─────────────────────────────────────────────
    CASE
        WHEN sg.api_agg_km_klassisch_praepar IS NOT NULL THEN 'api_agg'
        WHEN dll.station_id                  IS NOT NULL THEN 'detail_aggregiert'
        ELSE 'keine_daten'
    END                                                              AS quelle_langlauf,

    dll.anzahl_loipen,   -- nur aus Detail verfügbar

    CASE
        WHEN sg.api_agg_km_klassisch_praepar IS NOT NULL
             THEN ROUND(sg.api_agg_km_klassisch_praepar / 1000.0, 1)
        WHEN dll.station_id IS NOT NULL
             THEN ROUND(dll.m_langlauf_gesamt / 1000.0, 1)
    END                                                              AS km_langlauf_klassisch,

    CASE
        WHEN sg.api_agg_km_skating_praepar IS NOT NULL
             THEN ROUND(sg.api_agg_km_skating_praepar / 1000.0, 1)
        WHEN dll.station_id IS NOT NULL
             THEN ROUND(dll.m_langlauf_offen / 1000.0, 1)
    END                                                              AS km_langlauf_skating,

    -- ── Schlitteln ───────────────────────────────────────────
    CASE
        WHEN sg.api_agg_anzahl_schlittelwege IS NOT NULL THEN 'api_agg'
        WHEN ds.station_id                   IS NOT NULL THEN 'detail_aggregiert'
        ELSE 'keine_daten'
    END                                                              AS quelle_schlitteln,

    COALESCE(sg.api_agg_anzahl_schlittelwege,        ds.anzahl_schlittelwege)        AS anzahl_schlittelwege,
    COALESCE(sg.api_agg_anzahl_schlittelwege_offen,  ds.anzahl_schlittelwege_offen)  AS anzahl_schlittelwege_offen,

    -- ── Winterwandern ─────────────────────────────────────────
    CASE
        WHEN sg.api_agg_km_winterwandern_praepar IS NOT NULL THEN 'api_agg'
        WHEN dw.station_id                       IS NOT NULL THEN 'detail_aggregiert'
        ELSE 'keine_daten'
    END                                                              AS quelle_wandern,

    dw.anzahl_wanderwege,   -- nur aus Detail verfügbar

    CASE
        WHEN sg.api_agg_km_winterwandern_praepar IS NOT NULL
             THEN ROUND(sg.api_agg_km_winterwandern_praepar / 1000.0, 1)
        WHEN dw.station_id IS NOT NULL
             THEN ROUND(dw.m_wandern_gesamt / 1000.0, 1)
    END                                                              AS km_winterwandern,

    -- ── Schnee ───────────────────────────────────────────────
    sg.schneetiefe_tal_cm,
    sg.schneetiefe_piste_cm,
    sg.neuschnee_cm,
    sg.lawinengefahr_url,
    sg.last_api_update

FROM skigebiete sg
LEFT JOIN detail_pisten    dp  ON dp.station_id  = sg.station_id
LEFT JOIN detail_langlauf  dll ON dll.station_id = sg.station_id
LEFT JOIN detail_schlittel ds  ON ds.station_id  = sg.station_id
LEFT JOIN detail_wandern   dw  ON dw.station_id  = sg.station_id;