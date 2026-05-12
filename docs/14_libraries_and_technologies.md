---
layout: default
title: Libraries and Technologies
---

# Libraries and Technologies

## Frontend

- **React** — JavaScript-Framework für den Aufbau der Benutzeroberfläche
- **Vite** — Build-Tool und Entwicklungsserver
- **MapLibre GL JS** — Ermöglicht die dynamische Darstellung und Interaktion der Webkarte sowie die Einbindung von GeoServer-Layern
- **react-map-gl** — React-Wrapper für MapLibre GL JS
- **Recharts** — Darstellung der Wetterdaten als Diagramme

## Backend

- **FastAPI** — Python-Framework für die REST API
- **psycopg2** — PostgreSQL-Treiber für Python
- **openmeteo-requests** — Offizieller Open-Meteo-Client für Python
- **requests-cache** — HTTP-Cache-Schicht (1 h) für Open-Meteo-Anfragen
- **retry-requests** — Automatische Wiederholung fehlgeschlagener HTTP-Anfragen
- **pandas** — Aufbereitung der Wetterdaten als DataFrame
- **python-dotenv** — Laden der `.env`-Datei mit DB-Zugangsdaten und API-Keys

## Datenhaltung und Geodaten-Dienst

- **PostgreSQL / PostGIS** — Relationale Datenbank mit Geodaten-Erweiterung
- **GeoServer** — Geodatenserver, liefert alle Layer als Vector Tiles (MVT)
- **Raspberry Pi** — Hardware auf der GeoServer, PostgreSQL und das Backend laufen

## Externe Datenquellen

- **Open-Meteo** — Wetterprognosen (täglich und stündlich), inkl. Modelle MeteoSwiss ICON Seamless und ECMWF IFS
- **SLF** (Institut für Schnee- und Lawinenforschung) — Schneehöhen-Polygone als GeoJSON
- **STNet / Schweiz Tourismus** — Betriebsstatus von Pisten und Liftanlagen, Schneehöhen je Skigebiet
- **OpenStreetMap / Overpass API** — Geodaten für Pisten und Liftanlagen (einmaliger Import)
- **Swisstopo Vector Tiles** — Basiskarte der Schweiz
