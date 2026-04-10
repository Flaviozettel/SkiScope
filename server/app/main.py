from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Zum Zurücksenden von Dateien (z. B. PNG)
from fastapi.responses import FileResponse
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

from datetime import date, timedelta


def auto_importiere_letzte_woche():
    heute = date.today()

    for i in range(7):
        datum = (heute - timedelta(days=i)).isoformat()

        conn = get_db_conn()
        cur = conn.cursor()

        cur.execute(
            "SELECT count(*) FROM schneehoehen WHERE datum = %s",
            (datum,)
        )
        count = cur.fetchone()[0]

        cur.close()
        conn.close()

        if count == 0:
            print(f"Lade Daten für {datum}...")

            url = f"https://snow-maps-hs.slf.ch/public/hs/map/HS1D-v2/{datum}/geojson"

            try:
                antwort = requests.get(url, timeout=30)
                antwort.raise_for_status()
                data = antwort.json()

                importiere_schnee_in_db(datum, data)

            except Exception as e:
                print(f"Fehler bei {datum}: {e}")

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
            ON CONFLICT (datum, value) DO NOTHING
        """, (
            datum,
            feature["properties"]["value"],
            feature["properties"]["fill"],
            json.dumps(geom)
        ))

    conn.commit()
    cur.close()
    conn.close()


@app.get("/schnee")
def get_schnee():
    auto_importiere_letzte_woche()
    return {"status": "ok", "range": "last_7_days"}

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

@app.get("/skigebiete/top-schnee")
def get_top_schnee():
    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT station_name, schneetiefe_piste_cm
        FROM skigebiete
        WHERE schneetiefe_piste_cm IS NOT NULL
        ORDER BY schneetiefe_piste_cm DESC
        LIMIT 1
    """)

    result = cur.fetchone()

    cur.close()
    conn.close()

    if result:
        return {
            "station_name": result[0],
            "schnee_haupt": result[1]
        }
    else:
        return {"error": "Keine Daten gefunden"}
    
