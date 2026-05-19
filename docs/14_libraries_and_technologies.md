### Frontend

- [React](https://react.dev/) — JavaScript-Framework für den Aufbau der Benutzeroberfläche
- [Vite](https://vite.dev/) — Build-Tool und Entwicklungsserver
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) — Darstellung und Interaktion der Webkarte sowie Einbindung von GeoServer-Layern
- [react-map-gl](https://visgl.github.io/react-map-gl/) — React-Wrapper für MapLibre GL JS
- [Recharts](https://recharts.org/) — Darstellung der Wetterdaten als Diagramme

### Backend

- [FastAPI](https://fastapi.tiangolo.com/) — Python-Framework für die REST API
- [psycopg2](https://www.psycopg.org/docs/) — PostgreSQL-Treiber für Python
- [openmeteo-requests](https://pypi.org/project/openmeteo-requests/) — Open-Meteo-Client für Python
- [requests-cache](https://requests-cache.readthedocs.io/) — HTTP-Cache-Schicht für Open-Meteo-Anfragen
- [retry-requests](https://pypi.org/project/retry-requests/) — Automatische Wiederholung fehlgeschlagener HTTP-Anfragen
- [pandas](https://pandas.pydata.org/) — Aufbereitung der Wetterdaten als DataFrame
- [python-dotenv](https://pypi.org/project/python-dotenv/) — Laden der `.env`-Datei mit DB-Zugangsdaten und API-Keys

### Datenhaltung und Geodaten-Dienst

- [PostgreSQL](https://www.postgresql.org/) / [PostGIS](https://postgis.net/) — Relationale Datenbank mit Geodaten-Erweiterung
- [GeoServer](https://geoserver.org/) — Geodatenserver, liefert Layer als Vector Tiles
- [Raspberry Pi](https://www.raspberrypi.com/) — Hardware für GeoServer, PostgreSQL und Backend

### Externe Datenquellen

- [Open-Meteo](https://open-meteo.com/) — Wetterprognosen, täglich und stündlich
- [Open-Meteo MeteoSwiss API](https://open-meteo.com/en/docs/meteoswiss-api) — MeteoSwiss ICON Seamless
- [SLF](https://www.slf.ch/) — Schneehöhen-Polygone als GeoJSON
- [Schweiz Tourismus / STNet](https://www.stnet.ch/) — Betriebsstatus, Schneehöhen und Skigebietsinfos
- [OpenStreetMap](https://www.openstreetmap.org/) / [Overpass API](https://overpass-api.de/) — Geodaten für Pisten und Liftanlagen
- [swisstopo Vector Tiles](https://www.swisstopo.admin.ch/en/web-maps-base-map) — Basiskarte der Schweiz