from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Zum Zurücksenden von Dateien (z. B. PNG)
from fastapi.responses import FileResponse
# Für externe Programme (GDAL) ausführen
import subprocess
# HTTP Requests (API Calls)
import requests
# Datei- und Systemoperationen
import os
from datetime import date, timedelta, datetime
# PostgreSQL Verbindung
import psycopg2
import json

#Import Secrets aus .env Datei
from dotenv import load_dotenv
import os

load_dotenv()

# Entwicklungsmodus → immer neu generieren
DEV_MODE = True

# Datei für Rohdaten
RAW_FILE = "raw.geojson"

# Farbskala für Schneehöhen (für PNG Rendering)
COLOR_RAMP = """\
nv  0   0   0   0
0   0   0   0   0
1   210 240 255 100 
10  160 210 240 140
20  100 180 230 170
40  70  140 210 190
80  40  100 180 210
120 20  60  150 220
200 240 248 255 230
300 255 255 255 240
"""

# Datenbank-Verbindungsdaten
DB_PARAMS = {
    "host": os.getenv("DB_HOST"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD")
}


# Funktion: Verbindung zur DB herstellen
def get_db_conn():
    return psycopg2.connect(**DB_PARAMS)


# FastAPI App erstellen
app = FastAPI()

# CORS konfigurieren (welche Frontends dürfen zugreifen)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://projektarbeit-git-main-melanies-projects-3f1f17b6.vercel.app"
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# Funktion: berechnet Bounding Box aus GeoJSON
def bbox_aus_geojson(datum):
    url = f"https://snow-maps-hs.slf.ch/public/hs/map/HS1D-v2/{datum}/geojson"
    antwort = requests.get(url, timeout=30)
    data = antwort.json()

    alle_coords = []

    # rekursive Funktion um alle Koordinaten zu flatten. flatten macht aus [[lon, lat], [lon, lat]] → [lon, lat]
    def flatten(c):
        if isinstance(c[0], list):
            for sub in c:
                flatten(sub)
        else:
            alle_coords.append(c)

    # durch alle Features gehen
    for feature in data["features"]:
        flatten(feature["geometry"]["coordinates"])

    # min/max bestimmen
    lons = [c[0] for c in alle_coords]
    lats = [c[1] for c in alle_coords]

    return min(lats), min(lons), max(lats), max(lons)


# Funktion: speichert Schneehöhen in DB
def importiere_schnee_in_db(datum, data):
    from datetime import date

    datum = date.fromisoformat(datum)

    conn = get_db_conn()
    cur = conn.cursor()

    for feature in data["features"]:
        geom_type = feature["geometry"]["type"]

        # Polygon → MultiPolygon
        if geom_type == "Polygon":
            geom = {
                "type": "MultiPolygon",
                "coordinates": [feature["geometry"]["coordinates"]]
            }
        else:
            geom = feature["geometry"]

        cur.execute("""
            INSERT INTO schneehoehen (datum, value, fill, geom)
            VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
        """, (
            datum,
            feature["properties"]["value"],
            feature["properties"]["fill"],
            json.dumps(geom)
        ))

    conn.commit()
    cur.close()
    conn.close()


# Funktion: importiert Daten automatisch, falls nicht vorhanden
def auto_importiere_wenn_noetig(datum):
    conn = get_db_conn()
    cur = conn.cursor()

    # prüfen ob Daten existieren
    cur.execute("SELECT count(*) FROM schneehoehen WHERE datum = %s", (datum,))
    count = cur.fetchone()[0]

    cur.close()
    conn.close()

    # wenn keine Daten → importieren
    if count == 0:
        url = f"https://snow-maps-hs.slf.ch/public/hs/map/HS1D-v2/{datum}/geojson"

        try:
            antwort = requests.get(url, timeout=30)
            antwort.raise_for_status()
            data = antwort.json()
            importiere_schnee_in_db(datum, data)
        except Exception as e:
            print(f"Import fehlgeschlagen für {datum}: {e}")


# API Endpoint: Bounding Box liefern
@app.get("/schnee/bounds")
def get_bounds(datum: str = None):

    # Daten ggf. automatisch importieren
    auto_importiere_wenn_noetig(datum)

    bbox = bbox_aus_geojson(datum)

    # Rückgabe als zwei Punkte (unten links / oben rechts)
    return {
        "bounds": [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]]
        ]
    }


# API Endpoint: Daten für ein Datum importieren
@app.get("/schnee/import")
def importiere_schnee(datum: str = None):

    url = f"https://snow-maps-hs.slf.ch/public/hs/map/HS1D-v2/{datum}/geojson"

    antwort = requests.get(url, timeout=30)
    antwort.raise_for_status()

    data = antwort.json()

    # in DB speichern
    importiere_schnee_in_db(datum, data)

    return {"status": "ok", "datum": datum, "features": len(data["features"])}
