### Frontend

- [React](https://react.dev/) (18.3.1) — JavaScript-Framework für den Aufbau der Benutzeroberfläche
- [Vite](https://vite.dev/) (6.4.1) — Build-Tool und Entwicklungsserver
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) (5.1.0) — Darstellung und Interaktion der Webkarte sowie Einbindung von GeoServer-Layern
- [react-map-gl](https://visgl.github.io/react-map-gl/) (8.0.1) — React-Wrapper für MapLibre GL JS
- [Recharts](https://recharts.org/) (3.4.1) — Darstellung der Wetterdaten als Diagramme

### Backend

- [FastAPI](https://fastapi.tiangolo.com/) (0.121.3) — Python-Framework für die REST API
- [psycopg2](https://www.psycopg.org/docs/) (2.9.10) — PostgreSQL-Treiber für Python
- [openmeteo-requests](https://pypi.org/projct/openmeteo-requests/) (1.7.5) — Open-Meteo-Client für Python
- [requests-cache](https://requests-cache.readthedocs.io/) (1.3.2) — HTTP-Cache-Schicht für Open-Meteo-Anfragen
- [retry-requests](https://pypi.org/project/retry-requests/) (2.0.0) — Automatische Wiederholung fehlgeschlagener HTTP-Anfragen
- [pandas](https://pandas.pydata.org/) (3.0.2) — Aufbereitung der Wetterdaten als DataFrame
- [python-dotenv](https://pypi.org/project/python-dotenv/) (1.2.2) — Laden der `.env`-Datei mit DB-Zugangsdaten und API-Keys

### Datenhaltung und Geodaten-Dienst

- [PostgreSQL](https://www.postgresql.org/) (17.9) / [PostGIS](https://postgis.net/) (3.5) — Relationale Datenbank mit Geodaten-Erweiterung
- [GeoServer](https://geoserver.org/)(2.28.3) — Geodatenserver, liefert Layer als Vector Tiles
- [Raspberry Pi](https://www.raspberrypi.com/) — Hardware für GeoServer, PostgreSQL und Backend

### Externe Datenquellen

- [Open-Meteo](https://open-meteo.com/) — Wetterprognosen, täglich und stündlich
- [Open-Meteo MeteoSwiss API](https://open-meteo.com/en/docs/meteoswiss-api) — MeteoSwiss ICON Seamless
- [SLF](https://www.slf.ch/) — Schneehöhen-Polygone als GeoJSON
- [Schweiz Tourismus / STNet](https://www.stnet.ch/) — Betriebsstatus, Schneehöhen und Skigebietsinfos
- [OpenStreetMap](https://www.openstreetmap.org/) / [Overpass API](https://overpass-api.de/) — Geodaten für Pisten und Liftanlagen
- [swisstopo Vector Tiles](https://www.swisstopo.admin.ch/en/web-maps-base-map) — Basiskarte der Schweiz
