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