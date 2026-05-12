# SkiScope

Webanwendung für die Planung von Wintersportausflügen in Schweizer Skigebieten. Zeigt aktuelle Schneehöhen, Pisten-/Liftstatus und Wetterprognosen für nahezu alle Skigebiete der Schweiz auf einer interaktiven Karte.

Entwickelt im Rahmen des Moduls **4230 Geoinformatik und Raumanalyse (FHNW)** von *Schiefermüller, Hubler und Zettel* als Geodateninfrastruktur (GDI).

**Dokumentation (GitHub Pages):** <https://314a.github.io/GDI_Project/>

---

## Tech-Stack

- **Frontend:** React, Vite, MapLibre GL JS, Recharts
- **Backend:** FastAPI (Python), psycopg2
- **Datenhaltung:** PostgreSQL mit PostGIS
- **Geodaten-Dienst:** GeoServer (Vector Tiles / MVT)
- **Hosting:** Raspberry Pi

Vollständige Auflistung: siehe [Libraries and Technologies](https://314a.github.io/GDI_Project/libraries_and_technologies.html) auf der GitHub Page.

---

## Repository klonen

```bash
git clone https://github.com/314a/GDI_Project.git SkiScope
cd SkiScope
```

## Quick Start (lokal)

> Vollständige Anleitung inkl. Datenbank, GeoServer-Setup und Cronjobs auf einem Raspberry Pi: siehe **[Getting Started](https://314a.github.io/GDI_Project/getting_started.html)** auf der GitHub Page.

**Frontend**

```bash
cd client
npm install
npm run dev
```

**Backend**

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r app/requirements.txt
uvicorn app.main:app --reload
```

API-Dokumentation (Swagger UI): <http://localhost:8000/docs>

Voraussetzungen für den Quick Start: Node.js ≥ 22, Python ≥ 3.10, eine erreichbare PostgreSQL-/PostGIS-Instanz sowie eine `.env`-Datei mit DB-Zugangsdaten (Details siehe Getting Started).

---

## Repository-Struktur

```
SkiScope/
├── client/          React-/Vite-Frontend (MapLibre)
├── server/
│   ├── app/         FastAPI-Backend
│   └── database/    SQL-Schema + Init-Skripte
├── geoserver/       GeoServer data_dir + Vector-Tiles-Extension
├── preprocessing/   Cron-Skripte für laufende Datenimporte
└── docs/            GitHub-Pages-Quellen (Jekyll)
```

---

## Vergleich Mapping-Libraries

Eine Gegenüberstellung von MapLibre und OpenLayers, die der Wahl von MapLibre zugrunde lag, findet sich in [client/map_libraries_comparisons.md](client/map_libraries_comparisons.md).
