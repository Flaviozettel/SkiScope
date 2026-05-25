---
layout: default
title: Getting Started
---

# Getting Started

Diese Anleitung beschreibt, wie SkiScope aufgesetzt wird. Eine Übersicht über die geprüften Versionen findest Du im Abschnitt [Systemanforderungen](#systemanforderungen). Die Befehle um eine fertige Installation zu starten befinden sich unter [System starten](#system-starten).

## Systemanforderungen

SkiScope wurde von uns auf einem Raspberry Pi unter Raspberry Pi OS entwickelt und getestet. Die Anwendung ist aber bewusst systemunabhängig aufgebaut und läuft genauso auf jedem anderen Linux-Server, auf macOS oder unter Windows. Die folgende Anleitung verwendet `apt`-Befehle, weil unser Setup ein Debian-basiertes System ist. Auf anderen Plattformen sind die Schritte identisch, lediglich der Paket-Manager (zum Beispiel `brew` auf macOS) und einzelne Pfadkonventionen ändern sich.

Folgende Versionen haben wir im Projekt getestet. Die aufgeführten Stände sind als Referenz zu verstehen, die Anwendung läuft erfahrungsgemäss auch mit aktuelleren Versionen.

| Komponente               | Getestet mit |
| ------------------------ | ------------ |
| Python                   | 3.10         |
| Node.js                  | 22.14.0      |
| PostgreSQL               | 17.9         |
| PostGIS                  | 3.5          |
| GeoServer                | 2.26.2       |
| Java JRE (für GeoServer) | 21           |
| Browser                  | Brave        |

## Verzeichnisstruktur

Wir benutzen einen Parent-Ordner `~/skiscope/`, in dem das geklonte Repo,
das Python-venv und die `.env` nebeneinander liegen. So bleiben venv und
`.env` aus dem Repo draussen und können nicht versehentlich committed
werden.

```
/home/gisadmin/skiscope/
├── .env                    ← Umgebungsvariablen, Secrets
├── .venv/                  ← virtuelle Python-Umgebung
└── SkiScope/               ← das Git-Repo
    ├── client/
    ├── server/
    ├── preprocessing/
    └── docs/
```

> **`gisadmin`** ist der von uns benutzte Pi-User. Wenn du einen anderen
> User benutzt, musst du den Pfad an mehreren Stellen anpassen — siehe
> Kasten weiter unten zum Thema _hartkodierter `.env`-Pfad_.

Die eigentliche Installation gliedert sich in sechs Abschnitte:

1. [System vorbereiten](#1-system-vorbereiten)
2. [Datenbank aufsetzen](#2-datenbank-aufsetzen)
3. [Geoserver aufsetzen](#3-geoserver-aufsetzen)
4. [Backend installieren](#4-backend-installieren)
5. [Frontend installieren](#5-frontend-installieren)
6. [Cronjobs für laufende Daten](#6-cronjobs-für-laufende-daten)

Sobald alles installiert und befüllt ist, beschreibt der Abschnitt [System starten](#system-starten), wie die drei Komponenten im laufenden Betrieb hochgefahren werden.

---

## 1. System vorbereiten

### Pakete aktualisieren

```bash
sudo apt update
sudo apt -y upgrade
```

### Grundpakete installieren

Wir brauchen Git, einen Python-Stack, Node.js und PostgreSQL inklusive PostGIS.

```bash
sudo apt -y install \
    git curl ca-certificates build-essential \
    python3 python3-venv python3-pip \
    postgresql postgresql-contrib postgis
```

### Node.js installieren (getestet mit v22)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs
node -v
npm -v
```

### PostgreSQL prüfen und starten

```bash
sudo systemctl enable --now postgresql
systemctl status postgresql --no-pager
```

Ergebnis: PostgreSQL läuft, Port 5432 ist offen.

### Parent-Ordner anlegen und Repository klonen

```bash
mkdir -p ~/skiscope
cd ~/skiscope
git clone https://github.com/flaviozettel/SkiScope.git SkiScope
```

Das Repo liegt jetzt unter `~/skiscope/SkiScope/`.

---

## 2. Datenbank aufsetzen

Standardmässig erlaubt PostgreSQL auf Debian/Raspbian dem Linux-User
`postgres` per Peer-Authentication den Login. Das Init-Skript läuft also
einfach unter `sudo -u postgres`.

```bash
cd ~/skiscope/SkiScope/server/database
chmod +x init.sh
sudo -u postgres ADM_PW='dein_pw' ./init.sh
```

Das Skript legt Rolle `skiscopeadm` und die Datenbank `skiscope` an. Weiter werden PostGIS-Extension,
alle Tabellen, Indizes, Views und die Lookup-Daten angelegt.

> **Hinweis:** Die Tabelle `skigebiete` ist nach `init.sh` noch leer. Sie wird im
> [Schritt 6 (Cronjobs)](#6-cronjobs-für-laufende-daten) durch den ersten
> STnet-Lauf gefüllt. Erst danach lassen sich die statischen OSM-Geometrien
> importieren — die haben Foreign Keys auf `skigebiete.station_id`.

### Test

```bash
PGPASSWORD='dein_pw' \
  psql -h localhost -U skiscopeadm -d skiscope \
       -c "SELECT count(*) FROM strecken_typen;"
```

Wenn eine Zahl > 0 zurückkommt, ist das Schema bereit.

---

## 3. Geoserver aufsetzen

### Java installieren

GeoServer benötigt Java. Prüfen ob bereits vorhanden:

    java -version

Falls nicht:

    sudo apt -y install default-jre

### GeoServer installieren

    wget https://sourceforge.net/projects/geoserver/files/GeoServer/2.26.2/geoserver-2.26.2-bin.zip
    sudo unzip geoserver-2.26.2-bin.zip -d /usr/share/geoserver
    cd /usr/share/geoserver/
    sudo chmod 777 data_dir
    echo "export GEOSERVER_HOME=/usr/share/geoserver" >> ~/.profile
    . ~/.profile
    sudo chown -R gisadmin /usr/share/geoserver/

### Vector Tiles Extension installieren

    cp ~/skiscope/SkiScope/geoserver/vectortiles-extension/*.jar \
      /usr/share/geoserver/webapps/geoserver/WEB-INF/lib/

### CORS aktivieren

    sudo nano /usr/share/geoserver/webapps/geoserver/WEB-INF/web.xml

Den auskommentierten CORS-Filter-Block einkommentieren (suche nach `cross-origin`).
Sicherstellen dass folgender Wert gesetzt ist:

    <param-name>allowedOrigins</param-name>
    <param-value>*</param-value>

Datei speichern mit `CTRL+O`, beenden mit `CTRL+X`.

### data_dir einspielen

Anstatt alle Layer manuell zu konfigurieren, wird der vorkonfigurierte
`data_dir` aus dem Repo verwendet:

    rm -rf /usr/share/geoserver/data_dir
    unzip ~/skiscope/SkiScope/geoserver/data_dir.zip \
      -d /usr/share/geoserver/

Datenbankverbindung anpassen:

    nano /usr/share/geoserver/data_dir/workspaces/skiscope/DB_skiscope/datastore.xml

Die folgenden Werte eintragen:

    <string key="host">localhost</string>
    <string key="port">5432</string>
    <string key="database">skiscope</string>
    <string key="user">skiscopeadm</string>
    <string key="passwd">dein_pw</string>

### Vorgefertigte GeoServer-Konfiguration

Der nun eingespielte `data_dir` enthält bereits die vollständige GeoServer-Konfiguration des Projekts. Dazu gehören:

- der Workspace `skiscope`
- alle benötigten PostGIS- und GeoPackage-Stores
- die publizierten Layer
- Tile-Caching-Einstellungen für Mapbox Vector Tiles (MVT)

Dadurch entfällt die manuelle Konfiguration der Layer im GeoServer-Webinterface weitgehend.

### GeoServer starten

    cd /usr/share/geoserver/bin
    sudo sh startup.sh

Im Browser prüfen:

    http://<pi-hostname-oder-ip>:8080/geoserver/web

Login: `admin / geoserver` — **Passwort nach erstem Login ändern.**

## 4. Backend installieren

### `.env` anlegen

> **ggf Hardkodierten Pfad anpassen!**
> Sowohl `server/app/main.py` als auch `preprocessing/scripts/update_STnet_cron.py`
> laden die `.env` über
> `load_dotenv("/home/gisadmin/skiscope/.env")`. Wenn dein Pi-User nicht `gisadmin`
> heisst, musst du diesen Pfad in beiden Dateien anpassen, sonst findet
> kein Skript seine Konfiguration.

```bash
cat > ~/skiscope/.env <<'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skiscope
DB_USER=skiscopeadm
DB_PASS=dein_pw

# Für den STnet-Cronjob:
STN_USERNAME=dein_stnet_username
STN_API_KEY=dein_stnet_api_key
LOG_LEVEL=INFO
EOF

chmod 600 ~/skiscope/.env
```

> Backend und Preprocessing lesen das DB-Passwort beide aus der Variable `DB_PASS`.

### Virtuelle Python-Umgebung

Wir legen das
venv im Parent-Ordner an, neben dem Repo:

```bash
cd ~/skiscope
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r SkiScope/server/app/requirements.txt
```

### Backend starten (Entwicklungsmodus)

```bash
cd ~/skiscope/SkiScope/server
source ~/skiscope/.venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Im Browser auf einem anderen Gerät im selben Netz öffnen:

```
http://<pi-hostname-oder-ip>:8000/docs
```

Wenn die Swagger-UI erscheint, läuft das Backend.

---

## 5. Frontend installieren

```bash
cd ~/skiscope/SkiScope/client
npm install
```

### Im Entwicklungsmodus starten

```bash
npm run dev -- --host
```

`--host` macht den Vite-Dev-Server im LAN erreichbar. Default-Port ist 5173:

```
http://<pi-hostname-oder-ip>:5173
```

## 6. Cronjobs für laufende Daten

Die statischen Geometrien sind fertig — die **dynamischen** Daten
(Schneehöhen, Pisten- und Liftstati, Wetter) müssen regelmässig nachgezogen
werden. Dazu liegen Skripte in `preprocessing/scripts/`.

### Erstlauf: Skigebiete in die DB schreiben

Dieser Schritt füllt die noch leere `skigebiete`-Tabelle. Erst **danach** können
die statischen OSM-Geometrien importiert werden, weil deren Foreign Keys auf
`skigebiete.station_id` zeigen.

```bash
cd ~/skiscope/SkiScope
source ~/skiscope/.venv/bin/activate
python preprocessing/scripts/update_STnet_cron.py
```

Verifizieren, dass Skigebiete vorhanden sind:

```bash
PGPASSWORD='dein_pw' psql -h localhost -U skiscopeadm -d skiscope \
  -c "SELECT count(*) FROM skigebiete;"
```

Erwartete Grössenordnung: ≈ 211 Skigebiete.

### Statische OSM-Geometrien importieren

Jetzt können die vorbereiteten Pisten- und Lift-Geometrien geladen werden:

```bash
PGPASSWORD='dein_pw' \
  psql -h localhost -U skiscopeadm -d skiscope \
       -f ~/skiscope/SkiScope/server/database/import_static_geom.sql
```

Test:

```bash
PGPASSWORD='dein_pw' psql -h localhost -U skiscopeadm -d skiscope \
  -c "SELECT count(*) FROM pisten_geom_multipolygon;"
```

Wenn eine Zahl > 0 zurückkommt, sind die Geometrien drin.

### Log-Ordner anlegen

```bash
mkdir -p ~/skiscope/SkiScope/preprocessing/logs
```

> Die Logs landen bewusst im Repo-Ordner, **werden aber nicht mit
> committet** (siehe `.gitignore`-Eintrag `logs/`).

### Cron einrichten

```bash
crontab -e
```

Folgende Zeile anhängen — sie läuft alle zwei Stunden zur vollen Stunde:

```cron
0 */2 * * * cd /home/gisadmin/skiscope/SkiScope/preprocessing/scripts && /home/gisadmin/skiscope/.venv/bin/python /home/gisadmin/skiscope/SkiScope/preprocessing/scripts/update_STnet_cron.py >> /home/gisadmin/skiscope/SkiScope/preprocessing/logs/update_STnet_cron.log 2>&1
```

> **Wichtig:** Cron expandiert weder `~` noch `$USER`. Alle Pfade müssen
> absolut hingeschrieben werden. Wenn dein Pi-User nicht `gisadmin` heisst,
> die drei `/home/gisadmin/...`-Vorkommen ersetzen.

### Cronjobs prüfen

```bash
crontab -l
```

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
