# SkiScope

Webanwendung für die Planung von Wintersportausflügen in Schweizer Skigebieten. Zeigt aktuelle Schneehöhen, Pisten-/Liftstatus und Wetterprognosen für nahezu alle Skigebiete der Schweiz auf einer interaktiven Karte.

Entwickelt im Rahmen des Geomatik-Bachelorstudiums an der Fachhochschule Nordwestschweiz von _Schiefermüller, Hubler und Zettel_ und als Geodateninfrastruktur (GDI) aufgebaut.

**Dokumentation (GitHub Pages):** <https://flaviozettel.github.io/SkiScope/>

---

## Preprocessing - Aufbereitung Geodaten

Die Datenaufbereitung der Skipisten und Skilifte erfolgte in mehreren Schritten. Zunächst wurden die Geometrien über [Overpass turbo](https://overpass-turbo.eu/) mit folgenden Befehlen als GeoJSON bezogen:

#### Skigebiete (Fläche)

```
[out:json][timeout:180];

{{geocodeArea:Switzerland}}->.searchArea; 

(
  way["landuse"="winter_sports"](area.searchArea);
  relation["landuse"="winter_sports"](area.searchArea);
);

out geom;
```

#### Pisten

```
[out:json][timeout:180];

{{geocodeArea:Switzerland}}->.searchArea; 

(
  way["piste:type"="downhill"](area.searchArea);
  relation["piste:type"="downhill"](area.searchArea);

  way["piste:type"="snowpark"](area.searchArea);
  relation["piste:type"="snowpark"](area.searchArea);

  way["piste:type"="freeride"](area.searchArea);
  relation["piste:type"="freeride"](area.searchArea);

  way["piste:type"="backcountry"](area.searchArea);
  relation["piste:type"="backcountry"](area.searchArea);

  way["piste:type"="ski_jump"](area.searchArea);
  relation["piste:type"="ski_jump"](area.searchArea);
);

out geom;
```

#### Lifte

```
[out:json][timeout:180];

{{geocodeArea:Switzerland}}->.searchArea; 

(
  way["aerialway"](area.searchArea);
  relation["aerialway"](area.searchArea);

  way["railway"="funicular"](area.searchArea);
  relation["railway"="funicular"](area.searchArea);

  way["railway"="incline"](area.searchArea);
  relation["railway"="incline"](area.searchArea);
);

out geom;
```

"geocodeArea" ist eine Hilfsfunktion in overpass turbo, die es erlaubt ein Gebiet anhand eines Namens zu suchen. Das Suchgebiet wird dabei in die Variable .searchArea gespeichert. Diese Fläche dient anschliessend als räumliche Begrenzung der Abfrage.

In einem zweiten Schritt wurden die Wetterstationen von [OpenMeteo](https://open-meteo.com/) als CSV-Datei in QGIS importiert und mittels dem Plugin [all_geocoders_at_once](https://github.com/TrueSpearmint/all_geocoders_at_once) und dem Geocoder-Service Esri (ArcGis, ohne API-Key) geocodiert. Es konnten circa 85% aller Stationen geocodiert werden. Die restlichen Stationen, die nicht geocodiert werden konnten, wurden manuell ergänzt. Es wurde zudem kontrolliert, dass alle Stationen innerhalb einer Fläche "landuse"="winter_sports" liegen. Dies um im folgenden, dritten, Schritt die Stations-ID auf die Skigebiete und später auf die Pisten und Lifte zu übertragen.

Im letzten Schritt wurde ein SQL-Dump aus QGIS erzeugt, womit die Geodaten in die PostgreSQL PostGIS Datenbank geladen wurden.

---

## Tech-Stack

- **Frontend:** React, Vite, MapLibre GL JS, Recharts
- **Backend:** FastAPI (Python), psycopg2
- **Datenhaltung:** PostgreSQL mit PostGIS
- **Geodaten-Dienst:** GeoServer (Vector Tiles / MVT)
- **Hosting:** plattformunabhängig (Linux, macOS, Windows). Unser Referenz-Setup läuft auf einem Raspberry Pi.

Vollständige Auflistung: siehe [Libraries and Technologies](https://flaviozettel.github.io/SkiScope/architektur_gdi.html#libraries_and_technologies) auf der GitHub Page.

---

## Systemanforderungen

SkiScope wurde von uns auf einem Raspberry Pi unter Raspberry Pi OS entwickelt und getestet. Die Anwendung läuft genauso auf jedem anderen Linux-Server, auf macOS oder unter Windows. Die Installationsanleitung verwendet `apt`-Befehle, weil unser Setup ein Debian-basiertes System ist. Auf anderen Plattformen sind die Schritte identisch, lediglich der Paket-Manager (zum Beispiel `brew` auf macOS) und einzelne Pfadkonventionen ändern sich.

Folgende Versionen haben wir im Projekt getestet. Die aufgeführten Stände sind als Referenz zu verstehen, die Anwendung läuft erfahrungsgemäss auch mit aktuelleren Versionen.

| Komponente               | Getestet mit |
| ------------------------ | ------------ |
| Python                   | 3.10         |
| Node.js                  | 22.14.0      |
| PostgreSQL               | 17.9         |
| PostGIS                  | 3.5          |
| GeoServer                | 2.28.3       |
| Java JRE (für GeoServer) | 21           |
| Browser                  | Brave        |

---

## Installation

Eine vollständige Schritt-für-Schritt-Anleitung findest Du auf der GitHub Page unter **[Getting Started](https://flaviozettel.github.io/SkiScope/getting_started.html)**.

---

## System starten

Sobald die Installation abgeschlossen und die Datenbank befüllt ist, wird das System mit drei parallel laufenden Prozessen hochgefahren. Jeder Befehl gehört in ein eigenes Terminal, damit die Logs einzeln mitgelesen werden können.

### GeoServer

```bash
cd /usr/share/geoserver/bin
sudo sh startup.sh
```

Webinterface erreichbar unter `http://<hostname-oder-ip>:8080/geoserver/web`.

### Backend

```bash
cd ~/skiscope/SkiScope/server
source ~/skiscope/.venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger-UI erreichbar unter `http://<hostname-oder-ip>:8000/docs`.

### Frontend

```bash
cd ~/skiscope/SkiScope/client
npm run dev -- --host
```

Die Anwendung ist anschliessend unter `http://<hostname-oder-ip>:5173` aufrufbar.

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

- **GitHub Copilot:** Einsatz als intelligentes Auto-Complete-Werkzeug beim Schreiben von repetitivem Code.
- **CSS & Komponenten-Design:** Unterstützung bei der Gestaltung und dem CSS-Styling von UI-Elementen.

### 2. Debugging, Erklärungen, Brainstorming

- **Fehleranalyse:** Beschleunigung der Fehlersuche (Debugging)
- **Syntax- & Funktionserklärungen:** Einholen und Erklärungen zu spezifischen Bibliotheks-Funktionem
- **Alternative Lösungsansätze:** Nutzung der Tools als "Brainstorming-Partner" zur Ideenfindung und zum Einholen alternativer Lösungswege bei komplexen technischen Problemen.

### 3. Dokumentation

- **Sprachliche Überarbeitung:** Stilistische Optimierung, Rechtschreibprüfung und Strukturierung der GitHub-Page sowie der Reflexion.

## Abgrenzung der Eigenleistung

Es wurde kein Code ungeprüft übernommen. Alle KI-generierten Vorschläge wurden vom Team getestet und auf die spezifische Systemumgebung angepasst oder gegebenenfalls verworfen.

Die inhaltlichen Entscheidungen, die Systemarchitektur sowie die Projektplanung und Umsetzung erfolgten jedoch eigenständig durch das Team.
Folgende Kernkomponenten sind besonders als Eigenleistungen hervorzuheben:

- **Systemarchitektur & GDI-Pipeline:** Die Entwicklung und Erstellung der gesamten Datenpipeline, von der PostgreSQL/PostGIS-Datenhaltung über die Vector-Tile-Generierung (MVT) im GeoServer bis hin zur API-Bereitstellung via FastAPI.
- **Datenmodellierung & Preprocessing:** Das Design des relationalen Datenmodells für die Schweizer Skigebiete sowie die Logik der automatisierten Import- und Cron-Skripte.
- **Projektmanagement:** Die Planung des Projekts, das Festlegen von Prioritäten sowie das Zusammenführen und Konfigurieren aller einzelnen Komponenten auf dem Raspberry Pi, damit das Gesamtsystem läuft.
