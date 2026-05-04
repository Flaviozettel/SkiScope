# ============================================================
# main.py – FastAPI-Backend für SkiScope
#
# Stellt folgende Endpunkte bereit:
#   GET /skigebiete/top-schnee   → Skigebiet mit höchster Schneehöhe
#   GET /skigebiete              → Alle Skigebiete (Name + Koordinaten)
#   GET /skigebiet?station_id=   → Detaildaten eines Skigebiets
#   GET /schnee                  → Schneehöhen der letzten 7 Tage prüfen/importieren
# ============================================================

import json
import math
from fastapi import FastAPI, BackgroundTasks, HTTPException
import requests
from datetime import date, timedelta
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
from dotenv import load_dotenv
from enum import Enum
import pandas as pd
import openmeteo_requests
import requests_cache
from retry_requests import retry
from datetime import date as date_class, datetime, timezone, timedelta

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# Umgebungsvariablen aus .env laden (DB-Zugangsdaten)
load_dotenv("/home/gisadmin/skiscope/.env")

app = FastAPI()

# ── CORS ─────────────────────────────────────────────────────
# Erlaubt Anfragen vom lokalen Vite-Dev-Server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Nur für Entwicklung!!!!!
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DATENBANKVERBINDUNG ───────────────────────────────────────
DB_PARAMS = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASS"),
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
        SELECT station_id, station_name, schneetiefe_piste_cm
        FROM skigebiete
        WHERE schneetiefe_piste_cm IS NOT NULL
        ORDER BY schneetiefe_piste_cm DESC
        LIMIT 1
    """)

    row = cur.fetchone()
    cur.close()
    conn.close()

    if row:
        return {"station_id": row[0], "station_name": row[1], "schnee_haupt": row[2]}

    return {"error": "Keine Daten"}


# ── ENDPUNKT: Alle Skigebiete ─────────────────────────────────
@app.get("/skigebiete")
def get_all_skigebiete():
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT s.station_id, s.station_name,
               COALESCE(k.anzahl_lifte_offen, 0) AS lifte_offen
        FROM skigebiete s
        LEFT JOIN skigebiete_kennzahlen k USING (station_id)
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"station_id": r[0], "name": r[1], "lifte_offen": r[2]} for r in rows]


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
            lawinengefahr_url, updated_at
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
        "updated_at": row[9] or None,
    }


# ── ENDPUNKT: Schneehöhen prüfen/importieren ─────────────────
@app.get("/schnee")
def get_schnee():
    """Löst den automatischen Import der letzten 7 Tage aus (falls Daten fehlen)."""
    auto_importiere_letzte_woche()
    return {"status": "ok", "range": "last_7_days"}

# -------------------------
# Wetterprognose von DB abfragen und falls nötig von API holen und in DB speichern
# -------------------------


# Open-Meteo Client Setup
cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_MAX_AGE_HOURS = 3

# FIX 2: Klasse umbenannt von wetterprognose_type zu WetterprognoseType (war im Endpoint falsch referenziert)
class WetterprognoseType(str, Enum):
    tag = "tag"
    woche = "woche"

# Hilfsfunktionen
def get_station_coords(station_id: int) -> tuple[float, float]:
    """Holt Latitude und Longitude aus der skigebiet_geom-Tabelle via PostGIS."""
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT ST_Y(centerpoint::geometry), ST_X(centerpoint::geometry)
            FROM skigebiet_geom
            WHERE station_id = %s
            """, (station_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail=f"Station {station_id} nicht gefunden")
        return row[0], row[1]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Fehler beim Abrufen der Koordinaten für Station {station_id}: {e}")
        raise HTTPException(status_code=500, detail="Datenbankfehler")


def _finite_or_none(value):
    """NaN/Inf → None. Sonst würde Pythons json.dumps ungültiges JSON
    (NaN-Literal) erzeugen, an dem JSON.parse im Browser scheitert.
    Lässt Nicht-Floats (int, str, datetime, …) unverändert durch."""
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def is_cache_fresh(aktualisiert: datetime) -> bool:
    """Prüft ob der gecachte Eintrag noch frisch genug ist (< 3 Stunden alt)."""
    if aktualisiert is None:
        return False
    now = datetime.now(timezone.utc)
    # aktualisiert kann timezone-aware (TIMESTAMPTZ) oder naive sein
    if aktualisiert.tzinfo is None:
        aktualisiert = aktualisiert.replace(tzinfo=timezone.utc)
    return (now - aktualisiert) < timedelta(hours=CACHE_MAX_AGE_HOURS)


# API-Fetch: Tagesdaten (woche)
def fetch_tagesdaten_from_api(station_id: int, lat: float, lon: float) -> list[dict]:
    """
    Holt tägliche Wetterdaten von Open-Meteo für 14 Tage.
    Gibt eine Liste von Dicts zurück, je eines pro Tag.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": [
            "weather_code", "temperature_2m_max", "temperature_2m_min",
            "sunrise", "sunset", "uv_index_max", "snowfall_sum",
            "rain_sum", "sunshine_duration", "wind_speed_10m_mean"
        ],
        "timezone": "Europe/Berlin",
        "forecast_days": 14,
    }
    responses = openmeteo.weather_api(OPEN_METEO_URL, params=params)
    response = responses[0]

    daily = response.Daily()
    # Time() ist echter UTC-Timestamp; KEIN Offset addieren. tag wird über
    # tz_convert nach Berlin in das richtige Lokaldatum überführt.
    dates = pd.date_range(
        start=pd.to_datetime(daily.Time(), unit="s", utc=True),
        end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=daily.Interval()),
        inclusive="left"
    )

    results = []
    for i, d in enumerate(dates):
        results.append({
            "station_id": station_id,
            "tag": d.tz_convert("Europe/Berlin").date(),
            "daily_wetter_code_wmo": float(daily.Variables(0).ValuesAsNumpy()[i]),
            "daily_temperature_2m_max": float(daily.Variables(1).ValuesAsNumpy()[i]),
            "daily_temperature_2m_min": float(daily.Variables(2).ValuesAsNumpy()[i]),
            "daily_sunrise": datetime.fromtimestamp(int(daily.Variables(3).ValuesInt64AsNumpy()[i]), tz=timezone.utc),
            "daily_sunset": datetime.fromtimestamp(int(daily.Variables(4).ValuesInt64AsNumpy()[i]), tz=timezone.utc),
            "daily_uv_index_max": float(daily.Variables(5).ValuesAsNumpy()[i]),
            "daily_snowfall_sum": float(daily.Variables(6).ValuesAsNumpy()[i]),
            "daily_rain_sum": float(daily.Variables(7).ValuesAsNumpy()[i]),
            "daily_sunshine_duration": float(daily.Variables(8).ValuesAsNumpy()[i]),
            "daily_wind_speed_10m_mean": float(daily.Variables(9).ValuesAsNumpy()[i]),
        })
    return results



# API-Fetch: Stundendaten (tag)
def fetch_stundendaten_from_api(station_id: int, lat: float, lon: float, target_date: date_class) -> list[dict]:
    """
    Holt stündliche Wetterdaten für einen bestimmten Tag.
    Strategie: MeteoSwiss (7 Tage, genauer) + ECMWF (15 Tage, Fallback).
    """

    hourly_vars = [
        "temperature_2m", "relative_humidity_2m", "apparent_temperature",
        "precipitation", "rain", "wind_speed_10m", "wind_gusts_10m",
        "snowfall", "snow_depth", "cloud_cover", "cloud_cover_low",
        "cloud_cover_mid", "cloud_cover_high", "snowfall_height", "sunshine_duration"
    ]

    # FIX 4: used_vars Parameter hinzugefügt, damit ECMWF-Indizes korrekt sind
    # FIX 5: KEIN UtcOffsetSeconds mehr addieren — Time() ist bereits ein echter
    # UTC-Unix-Timestamp. Vorher wurde das Resultat als UTC getaggt, repräsentierte
    # aber Berlin-Wandzeit → TIMESTAMPTZ-Speicherung verschob alles um den Offset
    # in die Zukunft, sodass `zeitpunkt::date` in der Cache-Query falsche Tage
    # traf und z. B. nur 2 statt 24 Zeilen lieferte.
    def parse_hourly(response, used_vars: list[str], model_name: str) -> pd.DataFrame:
        hourly = response.Hourly()
        dates = pd.date_range(
            start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
            end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
            freq=pd.Timedelta(seconds=hourly.Interval()),
            inclusive="left"
        )
        df = pd.DataFrame({"zeitpunkt": dates})
        for idx, var in enumerate(used_vars):
            df[var] = hourly.Variables(idx).ValuesAsNumpy()
        df["wetter_modell"] = model_name
        return df

    ecmwf_vars = [v for v in hourly_vars if v != "snowfall_height"]  # FIX 4: ECMWF-Variablenliste

    # Call 1: MeteoSwiss – genauer, 7 Tage
    params_good = {
        "latitude": lat, "longitude": lon,
        "hourly": hourly_vars,
        "models": "meteoswiss_icon_seamless",
        "timezone": "Europe/Berlin",
        "forecast_days": 7,
    }
    # Call 2: ECMWF – weniger genau, 15 Tage (Fallback)
    params_ecmwf = {
        "latitude": lat, "longitude": lon,
        "hourly": ecmwf_vars,  # FIX 4: ecmwf_vars statt inline-Filter
        "models": "ecmwf_ifs",
        "timezone": "Europe/Berlin",
        "forecast_days": 15,
    }

    resp_good = openmeteo.weather_api(OPEN_METEO_URL, params=params_good)[0]
    resp_ecmwf = openmeteo.weather_api(OPEN_METEO_URL, params=params_ecmwf)[0]

    df_good = parse_hourly(resp_good, hourly_vars, "meteoswiss_icon_seamless")   # FIX 4: used_vars übergeben
    df_ecmwf = parse_hourly(resp_ecmwf, ecmwf_vars, "ecmwf_ifs")                # FIX 4: used_vars übergeben

    # Per-Zelle mergen: MeteoSwiss bevorzugen, ECMWF füllt einzelne NaN-Lücken.
    # Vorher row-level (dropna how="all"): sobald MeteoSwiss EINE nicht-NaN-Spalte
    # hatte, blieb die ganze Zeile MeteoSwiss → andere Felder blieben NaN, obwohl
    # ECMWF Werte gehabt hätte. Resultat: Tage mit nur 1 brauchbarer Stunde.
    combined = (
        df_good.set_index("zeitpunkt")
        .combine_first(df_ecmwf.set_index("zeitpunkt"))
        .reset_index()
        .sort_values("zeitpunkt")
        .reset_index(drop=True)
    )

    # Nur die Stunden des gewünschten Tages – target_date ist Berlin-lokal,
    # combined["zeitpunkt"] ist echte UTC, also explizit nach Berlin konvertieren
    combined["tag"] = combined["zeitpunkt"].dt.tz_convert("Europe/Berlin").dt.date
    day_df = combined[combined["tag"] == target_date]

    results = []
    for _, row in day_df.iterrows():
        results.append({
            "station_id": station_id,
            "zeitpunkt": row["zeitpunkt"].to_pydatetime(),
            "typ": row["wetter_modell"],
            "temperatur_2m": row.get("temperature_2m"),
            "relative_luftfeuchtigkeit_2m": row.get("relative_humidity_2m"),
            "gefuehlte_temperatur": row.get("apparent_temperature"),
            "niederschlag": row.get("precipitation"),
            "regen": row.get("rain"),
            "wind_geschwindigkeit_10m": row.get("wind_speed_10m"),
            "wind_boehen_10m": row.get("wind_gusts_10m"),
            "schneefall": row.get("snowfall"),
            "schnee_tiefe": row.get("snow_depth"),
            "bewoelkung_cover": row.get("cloud_cover"),
            "bewoelkung_tief": row.get("cloud_cover_low"),
            "bewoelkung_mittel": row.get("cloud_cover_mid"),
            "bewoelkung_hoch": row.get("cloud_cover_high"),
            "schneefall_hoehe": row.get("snowfall_height"),
            "sonnenscheindauer": row.get("sunshine_duration"),
            "wetter_modell": row["wetter_modell"],
        })
    return results


# -------------------------
# DB-Speicher-Funktionen (als BackgroundTask)
# -------------------------

def save_tagesdaten_to_db(data: list[dict]):
    """Speichert tägliche Wetterdaten per UPSERT in wetter_skigebiet_d."""
    conn = get_db_conn()
    cur = conn.cursor()
    for row in data:
        row = {k: _finite_or_none(v) for k, v in row.items()}
        cur.execute("""
            INSERT INTO wetter_skigebiet_d (
                station_id, tag, aktualisiert,
                daily_wetter_code_wmo, daily_temperature_2m_max, daily_temperature_2m_min,
                daily_sunrise, daily_sunset, daily_uv_index_max,
                daily_snowfall_sum, daily_rain_sum, daily_sunshine_duration,
                daily_wind_speed_10m_mean
            ) VALUES (
                %(station_id)s, %(tag)s, now(),
                %(daily_wetter_code_wmo)s, %(daily_temperature_2m_max)s, %(daily_temperature_2m_min)s,
                %(daily_sunrise)s, %(daily_sunset)s, %(daily_uv_index_max)s,
                %(daily_snowfall_sum)s, %(daily_rain_sum)s, %(daily_sunshine_duration)s,
                %(daily_wind_speed_10m_mean)s
            )
            ON CONFLICT (station_id, tag) DO UPDATE SET
                aktualisiert              = now(),
                daily_wetter_code_wmo     = EXCLUDED.daily_wetter_code_wmo,
                daily_temperature_2m_max  = EXCLUDED.daily_temperature_2m_max,
                daily_temperature_2m_min  = EXCLUDED.daily_temperature_2m_min,
                daily_sunrise             = EXCLUDED.daily_sunrise,
                daily_sunset              = EXCLUDED.daily_sunset,
                daily_uv_index_max        = EXCLUDED.daily_uv_index_max,
                daily_snowfall_sum        = EXCLUDED.daily_snowfall_sum,
                daily_rain_sum            = EXCLUDED.daily_rain_sum,
                daily_sunshine_duration   = EXCLUDED.daily_sunshine_duration,
                daily_wind_speed_10m_mean = EXCLUDED.daily_wind_speed_10m_mean
        """, row)
    conn.commit()
    cur.close()
    conn.close()


def save_stundendaten_to_db(data: list[dict]):
    """Speichert stündliche Wetterdaten per UPSERT in wetter_skigebiet_h."""
    conn = get_db_conn()
    cur = conn.cursor()
    for row in data:
        row = {k: _finite_or_none(v) for k, v in row.items()}
        cur.execute("""
            INSERT INTO wetter_skigebiet_h (
                station_id, zeitpunkt,
                temperatur_2m, relative_luftfeuchtigkeit_2m, gefuehlte_temperatur,
                niederschlag, regen, wind_geschwindigkeit_10m, wind_boehen_10m,
                schneefall, schnee_tiefe, bewoelkung_cover, bewoelkung_tief,
                bewoelkung_mittel, bewoelkung_hoch, schneefall_hoehe,
                sonnenscheindauer, wetter_modell
            ) VALUES (
                %(station_id)s, %(zeitpunkt)s,
                %(temperatur_2m)s, %(relative_luftfeuchtigkeit_2m)s, %(gefuehlte_temperatur)s,
                %(niederschlag)s, %(regen)s, %(wind_geschwindigkeit_10m)s, %(wind_boehen_10m)s,
                %(schneefall)s, %(schnee_tiefe)s, %(bewoelkung_cover)s, %(bewoelkung_tief)s,
                %(bewoelkung_mittel)s, %(bewoelkung_hoch)s, %(schneefall_hoehe)s,
                %(sonnenscheindauer)s, %(wetter_modell)s
            )
            ON CONFLICT (station_id, zeitpunkt) DO UPDATE SET
                temperatur_2m               = EXCLUDED.temperatur_2m,
                relative_luftfeuchtigkeit_2m = EXCLUDED.relative_luftfeuchtigkeit_2m,
                gefuehlte_temperatur        = EXCLUDED.gefuehlte_temperatur,
                niederschlag                = EXCLUDED.niederschlag,
                regen                       = EXCLUDED.regen,
                wind_geschwindigkeit_10m    = EXCLUDED.wind_geschwindigkeit_10m,
                wind_boehen_10m             = EXCLUDED.wind_boehen_10m,
                schneefall                  = EXCLUDED.schneefall,
                schnee_tiefe                = EXCLUDED.schnee_tiefe,
                bewoelkung_cover            = EXCLUDED.bewoelkung_cover,
                bewoelkung_tief             = EXCLUDED.bewoelkung_tief,
                bewoelkung_mittel           = EXCLUDED.bewoelkung_mittel,
                bewoelkung_hoch             = EXCLUDED.bewoelkung_hoch,
                schneefall_hoehe            = EXCLUDED.schneefall_hoehe,
                sonnenscheindauer           = EXCLUDED.sonnenscheindauer,
                wetter_modell               = EXCLUDED.wetter_modell
        """, row)
    conn.commit()
    cur.close()
    conn.close()


# -------------------------
# Endpoint
# -------------------------

@app.get("/skigebiet/wetterprognose")
def get_wetterprognose(
    station_id: int,
    type: WetterprognoseType,
    date_str: str | None = None,  # FIX 3: 'date' umbenannt, kein startup-evaluierter Default mehr
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # FIX 3: target_date korrekt aus date_str ableiten
    target_date = date_class.fromisoformat(date_str) if date_str else date_class.today()

    # --- WOCHE: Tägliche Zusammenfassung ---
    if type == WetterprognoseType.woche:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                tag, aktualisiert,
                daily_wetter_code_wmo, daily_temperature_2m_max, daily_temperature_2m_min,
                daily_sunrise, daily_sunset, daily_uv_index_max,
                daily_snowfall_sum, daily_rain_sum, daily_sunshine_duration,
                daily_wind_speed_10m_mean
            FROM wetter_skigebiet_d
            WHERE station_id = %s AND tag >= %s
            ORDER BY tag ASC
        """, (station_id, target_date))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Cache-Check: Gibt es Daten und sind sie frisch genug?
        if rows and is_cache_fresh(rows[0][1]):  # rows[0][1] = aktualisiert
            return [
                {
                    "tag": r[0].isoformat(),
                    "daily_wetter_code_wmo": _finite_or_none(r[2]),
                    "daily_temperature_2m_max": _finite_or_none(r[3]),
                    "daily_temperature_2m_min": _finite_or_none(r[4]),
                    "daily_sunrise": r[5].isoformat() if r[5] else None,
                    "daily_sunset": r[6].isoformat() if r[6] else None,
                    "daily_uv_index_max": _finite_or_none(r[7]),
                    "daily_snowfall_sum": _finite_or_none(r[8]),
                    "daily_rain_sum": _finite_or_none(r[9]),
                    "daily_sunshine_duration": _finite_or_none(r[10]),
                    "daily_wind_speed_10m_mean": _finite_or_none(r[11]),
                }
                for r in rows
            ]

        # Cache leer oder veraltet → API fetchen
        lat, lon = get_station_coords(station_id)
        data = fetch_tagesdaten_from_api(station_id, lat, lon)

        # Sofort antworten, DB-Speicherung im Hintergrund
        background_tasks.add_task(save_tagesdaten_to_db, data)
        return [
            {
                "tag": d["tag"].isoformat(),
                "daily_wetter_code_wmo": _finite_or_none(d["daily_wetter_code_wmo"]),
                "daily_temperature_2m_max": _finite_or_none(d["daily_temperature_2m_max"]),
                "daily_temperature_2m_min": _finite_or_none(d["daily_temperature_2m_min"]),
                "daily_sunrise": d["daily_sunrise"].isoformat() if d["daily_sunrise"] else None,
                "daily_sunset": d["daily_sunset"].isoformat() if d["daily_sunset"] else None,
                "daily_uv_index_max": _finite_or_none(d["daily_uv_index_max"]),
                "daily_snowfall_sum": _finite_or_none(d["daily_snowfall_sum"]),
                "daily_rain_sum": _finite_or_none(d["daily_rain_sum"]),
                "daily_sunshine_duration": _finite_or_none(d["daily_sunshine_duration"]),
                "daily_wind_speed_10m_mean": _finite_or_none(d["daily_wind_speed_10m_mean"]),
            }
            for d in data if d["tag"] >= target_date
        ]

    # --- TAG: Stündliche Detaildaten ---
    elif type == WetterprognoseType.tag:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                zeitpunkt,
                temperatur_2m, relative_luftfeuchtigkeit_2m, gefuehlte_temperatur,
                niederschlag, regen, wind_geschwindigkeit_10m, wind_boehen_10m,
                schneefall, schnee_tiefe, bewoelkung_cover, bewoelkung_tief,
                bewoelkung_mittel, bewoelkung_hoch, schneefall_hoehe,
                sonnenscheindauer, wetter_modell
            FROM wetter_skigebiet_h
            WHERE station_id = %s
              AND (zeitpunkt AT TIME ZONE 'Europe/Berlin')::date = %s
            ORDER BY zeitpunkt ASC
        """, (station_id, target_date))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Cache-Check: Stundendaten haben kein eigenes `aktualisiert`,
        # daher: frisch wenn der älteste Eintrag des Tages < 3h alt ist
        if rows:
            oldest_zeitpunkt = rows[0][0]
            if oldest_zeitpunkt.tzinfo is None:
                oldest_zeitpunkt = oldest_zeitpunkt.replace(tzinfo=timezone.utc)
            if is_cache_fresh(oldest_zeitpunkt):
                return [
                    {
                        "zeitpunkt": r[0].isoformat(),
                        "temperatur_2m": _finite_or_none(r[1]),
                        "relative_luftfeuchtigkeit_2m": _finite_or_none(r[2]),
                        "gefuehlte_temperatur": _finite_or_none(r[3]),
                        "niederschlag": _finite_or_none(r[4]),
                        "regen": _finite_or_none(r[5]),
                        "wind_geschwindigkeit_10m": _finite_or_none(r[6]),
                        "wind_boehen_10m": _finite_or_none(r[7]),
                        "schneefall": _finite_or_none(r[8]),
                        "schnee_tiefe": _finite_or_none(r[9]),
                        "bewoelkung_cover": _finite_or_none(r[10]),
                        "bewoelkung_tief": _finite_or_none(r[11]),
                        "bewoelkung_mittel": _finite_or_none(r[12]),
                        "bewoelkung_hoch": _finite_or_none(r[13]),
                        "schneefall_hoehe": _finite_or_none(r[14]),
                        "sonnenscheindauer": _finite_or_none(r[15]),
                        "wetter_modell": r[16],
                    }
                    for r in rows
                ]

        # Cache leer oder veraltet → API fetchen
        lat, lon = get_station_coords(station_id)
        data = fetch_stundendaten_from_api(station_id, lat, lon, target_date)

        background_tasks.add_task(save_stundendaten_to_db, data)
        return [
            {
                "zeitpunkt": d["zeitpunkt"].isoformat(),
                "temperatur_2m": _finite_or_none(d["temperatur_2m"]),
                "relative_luftfeuchtigkeit_2m": _finite_or_none(d["relative_luftfeuchtigkeit_2m"]),
                "gefuehlte_temperatur": _finite_or_none(d["gefuehlte_temperatur"]),
                "niederschlag": _finite_or_none(d["niederschlag"]),
                "regen": _finite_or_none(d["regen"]),
                "wind_geschwindigkeit_10m": _finite_or_none(d["wind_geschwindigkeit_10m"]),
                "wind_boehen_10m": _finite_or_none(d["wind_boehen_10m"]),
                "schneefall": _finite_or_none(d["schneefall"]),
                "schnee_tiefe": _finite_or_none(d["schnee_tiefe"]),
                "bewoelkung_cover": _finite_or_none(d["bewoelkung_cover"]),
                "bewoelkung_tief": _finite_or_none(d["bewoelkung_tief"]),
                "bewoelkung_mittel": _finite_or_none(d["bewoelkung_mittel"]),
                "bewoelkung_hoch": _finite_or_none(d["bewoelkung_hoch"]),
                "schneefall_hoehe": _finite_or_none(d["schneefall_hoehe"]),
                "sonnenscheindauer": _finite_or_none(d["sonnenscheindauer"]),
                "wetter_modell": d["wetter_modell"],
            }
            for d in data
        ]