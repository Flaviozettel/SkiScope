---
layout: default
title: Getting Started
---

# Getting Started

Diese Anleitung beschreibt, wie SkiScope auf einem \*\*frisch aufgesetzten
Raspberry Pi mit Raspberry Pi OS
komplett von Null aufgesetzt wird.

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

Die Anleitung gliedert sich in fünf Abschnitte:

1. [System vorbereiten](#1-system-vorbereiten)
2. [Datenbank aufsetzen](#2-datenbank-aufsetzen)
3. [Backend installieren](#3-backend-installieren)
4. [Frontend installieren](#4-frontend-installieren)
5. [Cronjobs für laufende Daten](#5-cronjobs-für-laufende-daten)

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
git clone https://github.com/314a/GDI_Project.git SkiScope
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
ADM_PW='dein_pw' sudo -u postgres ./init.sh
```

Das Skript legt Rolle `skiscopeadm` und die Datenbank `skiscope` an. Weiter werden PostGIS-Extension,
alle Tabellen, Indizes, Views und die Lookup-Daten angelegt.

### Statische OSM-Geometrien importieren

```bash
PGPASSWORD='dein_pw' \
  psql -h localhost -U skiscopeadm -d skiscope \
       -f ~/skiscope/SkiScope/server/database/import_static_geom.sql
```

### Test

```bash
PGPASSWORD='dein_pw' \
  psql -h localhost -U skiscopeadm -d skiscope \
       -c "SELECT count(*) FROM skigebiet_geom;"
```

Wenn eine Zahl > 0 zurückkommt, ist die DB bereit.

---

## 3. Geoserver aufsetzen

Todo

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
DB_PASSWORD=dein_pw

# Wird zusätzlich von den Preprocessing-Skripten erwartet (gleiche Rolle):
DB_PASS=dein_pw

# Für den STnet-Cronjob:
STN_USERNAME=dein_stnet_username
STN_API_KEY=dein_stnet_api_key
LOG_LEVEL=INFO
EOF

chmod 600 ~/skiscope/.env
```

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

### Backend als Systemd-Service (Produktivbetrieb)

```bash
sudo tee /etc/systemd/system/skiscope-backend.service > /dev/null <<'EOF'
[Unit]
Description=SkiScope FastAPI Backend
After=network.target postgresql.service

[Service]
User=gisadmin
WorkingDirectory=/home/gisadmin/skiscope/SkiScope/server
ExecStart=/home/gisadmin/skiscope/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now skiscope-backend
systemctl status skiscope-backend --no-pager
```

> Falls dein User nicht `gisadmin` heisst: `User=` und alle Pfade
> entsprechend anpassen.

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

### Für Produktion bauen

falls Zeit bleibt

## 5. Cronjobs für laufende Daten

Die statischen Geometrien sind fertig — die **dynamischen** Daten
(Schneehöhen, Pisten- und Liftstati, Wetter) müssen regelmässig nachgezogen
werden. Dazu liegen Skripte in `preprocessing/scripts/`.

### Manueller Testlauf

```bash
cd ~/skiscope/SkiScope
source ~/skiscope/.venv/bin/activate
python preprocessing/scripts/update_STnet_cron.py
```

Wenn das ohne Fehler durchläuft, sind die Skigebiete gefüllt.

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
