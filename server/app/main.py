from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
import json
import time
from dotenv import load_dotenv
from geopy.geocoders import Nominatim
import geopandas as gpd
from shapely.geometry import Point

load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB
DB_PARAMS = {
    "host": os.getenv("DB_HOST"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}

def get_db_conn():
    return psycopg2.connect(**DB_PARAMS)

# -------------------------
# CACHE
# -------------------------
CACHE_FILE = "geocode_cache.json"

if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, "r") as f:
            CACHE = json.load(f)
    except:
        CACHE = {}
else:
    CACHE = {}

geolocator = Nominatim(user_agent="skiscope")

# -------------------------
# GEOCODE
# -------------------------
def geocode(name):
    if name in CACHE:
        return CACHE[name]

    try:
        loc = geolocator.geocode(f"{name}, Switzerland", timeout=10)
        time.sleep(1.2)

        if loc:
            result = {"lat": loc.latitude, "lon": loc.longitude}
        else:
            result = {"lat": None, "lon": None}

        CACHE[name] = result
        return result

    except Exception as e:
        print("Geocode error:", name, e)
        return {"lat": None, "lon": None}

# -------------------------
# 1) API: Skigebiete mit Geocoding
# -------------------------
@app.get("/skigebiete")
def get_skigebiete():
    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT station_name
        FROM skigebiete
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    result = []

    for (name,) in rows:
        geo = geocode(name)

        if geo["lat"] is None:
            continue

        result.append({
            "name": name,
            "lat": geo["lat"],
            "lon": geo["lon"],
        })

    return result

# -------------------------
# 2) EXPORT: GeoPackage bauen
# -------------------------
@app.get("/export/gpkg")
def export_gpkg():
    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute("SELECT station_name FROM skigebiete")
    rows = cur.fetchall()

    cur.close()
    conn.close()

    data = []

    for (name,) in rows:
        geo = geocode(name)

        if geo["lat"] is None:
            continue

        data.append({
            "name": name,
            "geometry": Point(geo["lon"], geo["lat"])
        })

    gdf = gpd.GeoDataFrame(data, geometry="geometry", crs="EPSG:4326")

    output_file = "skigebiete.gpkg"
    gdf.to_file(output_file, layer="skigebiete", driver="GPKG")

    # cache speichern
    with open(CACHE_FILE, "w") as f:
        json.dump(CACHE, f)

    return {
        "status": "ok",
        "file": output_file,
        "features": len(data)
    }


# -------------------------
# TOP SCHNEE (Header bleibt)
# -------------------------
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

    row = cur.fetchone()

    cur.close()
    conn.close()

    if row:
        return {
            "station_name": row[0],
            "schnee_haupt": row[1]
        }

    return {"error": "Keine Daten"}