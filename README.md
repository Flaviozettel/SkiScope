# SkiScope

Webanwendung für die Planung von Wintersportausflügen in Schweizer Skigebieten. Zeigt aktuelle Schneehöhen, Pisten-/Liftstatus und Wetterprognosen für nahezu alle Skigebiete der Schweiz auf einer interaktiven Karte.

Entwickelt im Rahmen des Moduls **4230 Geoinformatik und Raumanalyse (FHNW)** von _Schiefermüller, Hubler und Zettel_ als Geodateninfrastruktur (GDI).

**Dokumentation (GitHub Pages):** <https://flaviozettel.github.io/SkiScope/>

---

## Tech-Stack

- **Frontend:** React, Vite, MapLibre GL JS, Recharts
- **Backend:** FastAPI (Python), psycopg2
- **Datenhaltung:** PostgreSQL mit PostGIS
- **Geodaten-Dienst:** GeoServer (Vector Tiles / MVT)
- **Hosting:** Raspberry Pi

Vollständige Auflistung: siehe [Libraries and Technologies](https://flaviozettel.github.io/SkiScope/libraries_and_technologies.html) auf der GitHub Page.

---

## Repository klonen

```bash
git clone https://github.com/Flaviozettel/SkiScope.git SkiScope
cd SkiScope
```

## Quick Start (lokal)

> Vollständige Anleitung inkl. Datenbank, GeoServer-Setup und Cronjobs auf einem Raspberry Pi: siehe **[Getting Started](https://flaviozettel.github.io/SkiScope/getting_started.html)** auf der GitHub Page.

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

## KI-Nutzung

Beim Aufbau dieser Geodateninfrastruktur (GDI) wurden die KI-Assistenten **Claude (Anthropic)**, **ChatGPT (OpenAI)** und **GitHub Copilot** gezielt eingesetzt.

Die Nutzung gliedert sich in folgende Kernbereiche:

### 1. Code-Effizienz & UI-Styling

- **GitHub Copilot:** Einsatz als intelligentes Auto-Complete-Werkzeug zur Beschleunigung von repetitivem Code.
- **CSS & Komponenten-Design:** Unterstützung bei der Gestaltung und dem CSS-Styling von UI-Elementen.

### 2. Debugging, Erklärungen, Brainstorming

- **Fehleranalyse:** Beschleunigung der Fehlersuche (Debugging)
- **Syntax- & Funktionserklärungen:** Einholen und Erklärungen zu spezifischen Bibliotheks-Funktionem
- **Alternative Lösungsansätze:** Nutzung der Tools als "Brainstorming-Partner" zur Ideenfindung und zum Einholen alternativer Lösungswege bei komplexen technischen Problemen.

### 3. Dokumentation

- **Sprachliche Überarbeitung:** Stilistische Optimierung, Rechtschreibprüfung und Strukturierung der GitHub-Page sowie der Reflexion.

## Abgrenzung der Eigenleistung

Es wurde kein Code ungeprüft übernommen. Alle KI-generierten Vorschläge wurden vom Team getestet und auf die spezifische Systemumgebung angepasst oder gegebenenfalls verworfen.

Die inhaltliche, konzeptionelle und architektonische Aufbau lag zu jedem Zeitpunkt vollständig beim Projektteam. Folgende Kernkomponenten sind besonders als Eigenleistungen hervorzuheben:

- **Systemarchitektur & GDI-Pipeline:** Die Konzeption und das Deployment der gesamten Pipeline – von der PostgreSQL/PostGIS-Datenhaltung über die Vector-Tile-Generierung (MVT) im GeoServer bis hin zur API-Bereitstellung via FastAPI.
- **Datenmodellierung & Preprocessing:** Das Design des relationalen Datenmodells für die Schweizer Skigebiete sowie die Logik der automatisierten Import- und Cron-Skripte.
- **Projektmanagement:** Die Planung des Projekts, das Festlegen von Prioritäten sowie das Zusammenführen und Konfigurieren aller einzelnen Komponenten auf dem Raspberry Pi, damit das Gesamtsystem läuft.
