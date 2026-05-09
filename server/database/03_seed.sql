-- ============================================================
--  03_seed.sql – Statische Lookup-Daten für SkiScope
--
--  Werden vom Cronjob NICHT berührt. Bei Schema-Änderungen
--  zusammen mit 02_schema.sql aktualisieren.
-- ============================================================

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
