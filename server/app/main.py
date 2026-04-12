# ============================================================
# main.py – FastAPI-Backend für SkiScope
#
# Stellt folgende Endpunkte bereit:
#   GET /skigebiete/top-schnee   → Skigebiet mit höchster Schneehöhe
#   GET /skigebiete              → Alle Skigebiete (Name + Koordinaten)
#   GET /skigebiet?station_id=   → Detaildaten eines Skigebiets
#   GET /schnee                  → Schneehöhen der letzten 7 Tage prüfen/importieren
#   GET /schnee/import?datum=    → Schneehöhen für ein bestimmtes Datum importieren
# ============================================================

import json
import requests
from datetime import date, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
from dotenv import load_dotenv

# Umgebungsvariablen aus .env laden (DB-Zugangsdaten)
load_dotenv()

app = FastAPI()

# ── CORS ─────────────────────────────────────────────────────
# Erlaubt Anfragen vom lokalen Vite-Dev-Server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DATENBANKVERBINDUNG ───────────────────────────────────────
DB_PARAMS = {
    "host": os.getenv("DB_HOST"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}

def get_db_conn():
    """Öffnet und gibt eine neue PostgreSQL-Verbindung zurück."""
    return psycopg2.connect(**DB_PARAMS)


# ── ENDPUNKT: Top-Schneehöhe ──────────────────────────────────
@app.get("/skigebiete/top-schnee")
def get_top_schnee():
    """Gibt das Skigebiet mit der höchsten Pistengeschneehöhe zurück."""
    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT station_name, schneetiefe_piste_cm
        FROM skigebiete
        WHERE schneetiefe_piste_cm IS NOT NULL
        ORDER BY schneetiefe_piste_cm DESC
        LIMIT 1
    """)

    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {"station_name": row[0], "schnee_haupt": row[1]}

    return {"error": "Keine Daten"}


# ── ENDPUNKT: Alle Skigebiete ─────────────────────────────────
@app.get("/skigebiete")
def get_all_skigebiete():
    """Gibt alle Skigebiete mit Name und Koordinaten zurück (für die Karte)."""
    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT station_name, lon, lat
        FROM skigebiete
        WHERE lon IS NOT NULL AND lat IS NOT NULL
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [{"name": row[0], "lon": row[1], "lat": row[2]} for row in rows]


# ── HILFSFUNKTION: Letzte 7 Tage automatisch importieren ──────
def auto_importiere_letzte_woche():
    """
    Prüft die letzten 7 Tage und importiert fehlende Schneehöhen-Daten
    vom SLF-API (Swiss Institute for Snow and Avalanche Research).
    """
    heute = date.today()

    for i in range(7):
        datum = (heute - timedelta(days=i)).isoformat()

        # Prüfen ob Daten für diesen Tag bereits in der DB vorhanden sind
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


# ── HILFSFUNKTION: GeoJSON-Daten in DB speichern ─────────────
def importiere_schnee_in_db(datum, data):
    """
    Speichert Schneehöhen-GeoJSON-Features als PostGIS-Geometrien in der DB.
    Polygon-Geometrien werden automatisch in MultiPolygon konvertiert
    damit der Typ konsistent bleibt.
    """
    datum = date.fromisoformat(datum)

    conn = get_db_conn()
    cur = conn.cursor()

    for feature in data["features"]:
        geom_type = feature["geometry"]["type"]

        # Polygon → MultiPolygon normalisieren
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


# ── ENDPUNKT: Einzelnes Skigebiet ─────────────────────────────
@app.get("/skigebiet")
def get_skigebiet(station_id: int):
    """
    Gibt Detaildaten eines Skigebiets anhand der station_id zurück:
    Liftanzahl, Schneehöhe, Pistenkilometer (blau/rot/schwarz) und Lawinenlink.
    """
    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            station_name, anzahl_lifte_offen, anzahl_lifte,
            schneetiefe_piste_cm, km_pisten_gesamt,
            anzahl_blau, anzahl_rot, anzahl_schwarz,
            lawinengefahr_url
        FROM skigebiete_kennzahlen
        WHERE station_id = %s
        LIMIT 1
    """, (station_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return {"error": f"Kein Skigebiet gefunden fuer ID: {station_id}"}

    return {
        "name": row[0],
        "lifte_offen": row[1],
        "lifte_total": row[2],
        "schnee": round(row[3] or 0),
        "km_total": row[4] or 0,
        "km_blau": row[5] or 0,
        "km_rot": row[6] or 0,
        "km_schwarz": row[7] or 0,
        "lawinengefahr_url": row[8] or None,
    }


# ── ENDPUNKT: Schneehöhen prüfen/importieren ─────────────────
@app.get("/schnee")
def get_schnee():
    """Löst den automatischen Import der letzten 7 Tage aus (falls Daten fehlen)."""
    auto_importiere_letzte_woche()
    return {"status": "ok", "range": "last_7_days"}


# ── ENDPUNKT: Manueller Import für ein bestimmtes Datum ───────
@app.get("/schnee/import")
def importiere_schnee(datum: str = None):
    """
    Importiert Schneehöhen-Daten für ein bestimmtes Datum direkt vom SLF-API.
    Erwartet datum im Format YYYY-MM-DD als Query-Parameter.
    """
    url = f"https://snow-maps-hs.slf.ch/public/hs/map/HS1D-v2/{datum}/geojson"

    antwort = requests.get(url, timeout=30)
    antwort.raise_for_status()

    data = antwort.json()
    importiere_schnee_in_db(datum, data)

    return {"status": "ok", "datum": datum, "features": len(data["features"])}
