from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
from dotenv import load_dotenv

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
# TOP SCHNEE
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
        return {"station_name": row[0], "schnee_haupt": row[1]}

    return {"error": "Keine Daten"}


# -------------------------
# ALLE SKIGEBIETE (fuer Frontend-Liste)
# -------------------------
@app.get("/skigebiete")
def get_all_skigebiete():
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


# -------------------------
# EINZELNES SKIGEBIET - 3-stufige Fuzzy-Suche
#
# Problem: name_2 im GeoJSON stimmt oft nicht exakt mit station_name in der DB
# Loesung: 3 Stufen von genau nach ungenau
#
# Stufe 3 (pg_trgm) optional aktivieren mit:
#   CREATE EXTENSION IF NOT EXISTS pg_trgm;
# -------------------------
@app.get("/skigebiet")
def get_skigebiet(name_2: str):
    conn = get_db_conn()
    cur = conn.cursor()
    row = None

    # Stufe 1: Exakter Match, case-insensitiv
    # z.B. "Zermatt" -> trifft "Zermatt" oder "zermatt"
    COLS = """
        station_name, anzahl_lifte_offen, anzahl_lifte,
        schneetiefe_piste_cm, km_pisten_gesamt,
        anzahl_blau, anzahl_rot, anzahl_schwarz,
        lawinengefahr_url
    """

    cur.execute(f"""
        SELECT {COLS}
        FROM skigebiete_kennzahlen
        WHERE station_name ILIKE %s
        LIMIT 1
    """, (name_2,))
    row = cur.fetchone()

    if not row:
        cur.execute(f"""
            SELECT {COLS}
            FROM skigebiete_kennzahlen
            WHERE station_name ILIKE %(like_name)s
               OR %(name)s ILIKE '%%' || station_name || '%%'
            LIMIT 1
        """, {"like_name": f"%{name_2}%", "name": name_2})
        row = cur.fetchone()

    if not row:
        try:
            cur.execute(f"""
                SELECT {COLS}
                FROM skigebiete_kennzahlen
                WHERE similarity(station_name, %s) > 0.2
                ORDER BY similarity(station_name, %s) DESC
                LIMIT 1
            """, (name_2, name_2))
            row = cur.fetchone()
        except Exception:
            conn.rollback()

    cur.close()
    conn.close()

    if not row:
        return {"error": f"Kein Skigebiet gefunden fuer: {name_2}"}

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
