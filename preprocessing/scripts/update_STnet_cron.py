"""
STNet API → PostgreSQL  (Cronjob-Import)
=========================================
Strategie: vollständiger DELETE+INSERT pro Station bei jedem Lauf.
Kein Stammdaten/Bewegungsdaten-Split – alles wird neu geschrieben.

Jede Station läuft in einer eigenen Transaktion: ein Fehler bei
einer Station rollt nur diese zurück, die anderen sind committed.

Voraussetzungen:
  pip install psycopg2-binary requests

Konfiguration via Umgebungsvariablen:
  STN_USERNAME, STN_API_KEY
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
  LOG_LEVEL  (DEBUG | INFO | WARNING | ERROR)
"""

import hashlib
import random
import string
import datetime
import logging
import os
import sys
import time

import requests
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv("/home/gisadmin/skiscope/.env") # Für Cronjob: absolute Pfadangabe zum .env-File, da Arbeitsverzeichnis nicht definiert ist.

# ══════════════════════════════════════════════════════════════
#  KONFIGURATION
# ══════════════════════════════════════════════════════════════

STN_USERNAME  = os.getenv("STN_USERNAME", "FHNW")
STN_API_KEY   = os.getenv("STN_API_KEY",  "")
STN_BASE_URL  = "http://st.stnet.ch/api/services/wispostations"
STN_PAGE_SIZE = 50
STN_PAUSE_S   = 0.3

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "skigebiete")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ══════════════════════════════════════════════════════════════
#  LOGGING
# ══════════════════════════════════════════════════════════════

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════
#  API-ABRUF
# ══════════════════════════════════════════════════════════════

def _token(length: int = 16) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))

def _ticket(username: str, api_key: str, token: str) -> str:
    date_str = datetime.date.today().strftime("%Y.%m.%d")
    return hashlib.md5(f"{username}:{api_key}:{token}:{date_str}".encode()).hexdigest()

def fetch_page(page: int) -> dict:
    tok = _token()
    params = {
        "stn-username":    STN_USERNAME,
        "stn-token":       tok,
        "stn-ticket":      _ticket(STN_USERNAME, STN_API_KEY, tok),
        "stn-output":      "json",
        "stn-size":        STN_PAGE_SIZE,
        "stn-page":        page,
        "stn-stationType": "full",
    }
    resp = requests.get(STN_BASE_URL, params=params, timeout=60)
    resp.raise_for_status()
    return resp.json()

def fetch_all_stations() -> list[dict]:
    stations, page = [], 1
    while True:
        data        = fetch_page(page)
        root        = data.get("stations", {})
        header      = root.get("header", {})
        total_pages = int(header.get("totalPages", 1))
        result_size = int(header.get("resultSize", 0))
        batch       = root.get("stationsArray", [])
        if isinstance(batch, dict):
            batch = [batch]
        stations.extend(batch)
        log.info("  Seite %3d/%d  –  %3d Stationen  (gesamt: %d/%d)",
                 page, total_pages, len(batch), len(stations), result_size)
        if page >= total_pages:
            break
        page += 1
        time.sleep(STN_PAUSE_S)
    return stations


# ══════════════════════════════════════════════════════════════
#  HILFSFUNKTIONEN
# ══════════════════════════════════════════════════════════════

def _to_list(obj) -> list:
    if obj is None:           return []
    if isinstance(obj, dict): return [obj]
    if isinstance(obj, list): return obj
    return []

def _content(obj):
    if isinstance(obj, dict): return obj.get("content")
    return obj if obj is not None else None

def _num(obj):
    v = _content(obj)
    if v is None or v == "": return None
    try:    return float(v)
    except: return None

def _int(obj):
    v = _num(obj)
    return int(v) if v is not None else None

def _bool(obj):
    v = _content(obj)
    if v is None or v == "": return None
    try:    return bool(int(v))
    except: return bool(v) if v else None

def _ts(obj):
    v = _content(obj) if isinstance(obj, dict) else obj
    return str(v).strip() if v else None

def _time(val):
    if not val: return None
    try:    return str(val).split("T")[1][:8]
    except: return None

def _date(val):
    v = _content(val) if isinstance(val, dict) else val
    return str(v)[:10] if v and len(str(v)) >= 10 else None

def _geom(lat, lon):
    try:
        la = float(lat) if lat not in (None, "", 0, "0") else None
        lo = float(lon) if lon not in (None, "", 0, "0") else None
        if la is not None and lo is not None:
            return la, lo
    except: pass
    return None, None

def _name(val) -> str:
    """Pistennamen können Integer sein (z.B. Samnaun: 5, 9, 40)."""
    return str(val).strip() if val is not None else ""


# ══════════════════════════════════════════════════════════════
#  DATENEXTRAKTION
# ══════════════════════════════════════════════════════════════

def extract_skigebiet(s: dict) -> dict:
    addr = s.get("address",     {}) or {}
    snow = s.get("snow",        {}) or {}
    ski  = s.get("ski",         {}) or {}
    fac  = s.get("facility",    {}) or {}
    info = s.get("info",        {}) or {}
    cc   = s.get("crosscountry",{}) or {}
    hike = s.get("hiking",      {}) or {}
    tob  = s.get("tobogganing", {}) or {}

    return {
        "station_id":   s.get("id"),
        "station_name": s.get("name"),
        "ort":          addr.get("place"),
        "zip":          addr.get("zip"),
        "telefon":      addr.get("phone1"),
        "url":          addr.get("url"),
        "oeffnungszeit":    _time(_content(fac.get("facilityOpeningTime"))),
        "schliessungszeit": _time(_content(fac.get("facilityClosingTime"))),
        # Schnee
        "last_api_update":          _ts(_content(s.get("lastUpdate"))),
        "schneetiefe_tal_cm":       _num(snow.get("depthOfSnowResort")),
        "schneetiefe_piste_cm":     _num(snow.get("depthOfSnowPiste")),
        "neuschnee_cm":             _num(snow.get("freshSnow")),
        "neuschnee_piste_top_cm":   _num(snow.get("freshSnowPisteTop")),
        "letzter_schneefall_tal":   _ts(_content(snow.get("lastSnowfallResort"))),
        "letzter_schneefall_piste": _ts(_content(snow.get("lastSnowfallPiste"))),
        "lawinengefahr_url":        _content(snow.get("avalancheRiskLevel")),
        "pistenzustand":            _content(ski.get("runsCondition")),
        "schnee_haupt":             _content(ski.get("snowConditionMain")),
        "schnee_teilweise":         _content(ski.get("snowConditionPartial")),
        # API-Aggregat Pisten
        "api_agg_anzahl_pisten":              _int(ski.get("numberOfSlopes")),
        "api_agg_km_pisten_gesamt":           _num(ski.get("lengthOfSlopes")),
        "api_agg_km_pisten_offen":            _num(ski.get("lengthOfSlopesOpen")),
        "api_agg_anzahl_talabfahrten":        _int(ski.get("numberOfValleyRuns")),
        "api_agg_anzahl_talabfahrten_offen":  _int(ski.get("numberOfValleyRunsOpen")),
        "api_agg_km_kunstschnee":             _num(ski.get("lengthOfSlopesArtificialSnow")),
        "api_agg_km_flutlicht_pisten":        _num(ski.get("lengthOfSlopesWithFloodlight")),
        # API-Aggregat Lifte
        "api_agg_anzahl_lifte_offen":         _int(fac.get("numberOfOpenFacilities")),
        "api_agg_anzahl_lifte_gesamt":        _int(info.get("numberOfFacilities")),
        "api_agg_anzahl_seilbahnen":          _int(info.get("numberOfCableCarWinter")),
        "api_agg_anzahl_sesselbahnen":        _int(info.get("numberOfChairliftWinter")),
        "api_agg_anzahl_skilifte":            _int(info.get("numberOfSkilift")),
        "api_agg_anzahl_babylifte":           _int(info.get("numberOfBabyLifts")),
        "api_agg_anzahl_foerderband":         _int(info.get("numberOfSnowConveyorBelts")),
        # API-Aggregat Langlauf
        "api_agg_km_klassisch_gesamt":        _num(cc.get("lengthOfClassic")),
        "api_agg_km_klassisch_praepar":       _num(cc.get("lengthOfClassicPrepared")),
        "api_agg_km_skating_gesamt":          _num(cc.get("lengthOfSkating")),
        "api_agg_km_skating_praepar":         _num(cc.get("lengthOfSkatingPrepared")),
        "api_agg_km_flutlicht_langlauf":      _num(cc.get("lengthOfFloodlightTotal")),
        # API-Aggregat Schlitteln
        "api_agg_anzahl_schlittelwege":       _int(tob.get("numberOfTracks")),
        "api_agg_anzahl_schlittelwege_offen": _int(tob.get("numberOfTracksOpen")),
        "api_agg_km_schlitteln":              _num(tob.get("lengthOfTracks")),
        "api_agg_schlitteln_kunstschnee":     _bool(tob.get("hasArtificialSnow")),
        "api_agg_schlitteln_oev":             _bool(tob.get("hasPublicTransport")),
        "api_agg_schlitteln_verleih":         _bool(tob.get("hasRentalPossibility")),
        # API-Aggregat Wandern
        "api_agg_km_winterwandern_praepar":   _num(hike.get("lengthOfWalkingtrailPrepared")),
        "api_agg_km_schneeschuh":             _num(hike.get("lengthOfSnowshoeTrails")),
    }


def extract_pisten(s: dict) -> list[dict]:
    rows = []
    for sl in _to_list((s.get("ski", {}) or {}).get("slopesArray")):
        inf = sl.get("info", {}) or {}
        rows.append({
            "station_id":      s.get("id"),
            "piste_name":      _name(sl.get("name")),   # int möglich (Samnaun)
            "typ_id":          (inf.get("type")      or {}).get("id"),
            "status_id":       (inf.get("condition") or {}).get("id"),
            "laenge_m_gesamt": _num(inf.get("totalLength")),
            "laenge_m_heute":  _num(inf.get("totalLengthToday")),
            "sort_order":      inf.get("sortOrder"),
        })
    return rows


def extract_lifte(s: dict) -> list[dict]:
    rows = []
    for li in _to_list((s.get("liftInfo", {}) or {}).get("liftsArray")):
        inf = li.get("info", {}) or {}
        rows.append({
            "station_id": s.get("id"),
            "lift_name":  _name(li.get("name")),
            "typ_id":     (inf.get("type")   or {}).get("id"),
            "status_id":  (inf.get("status") or {}).get("id"),  # Lifte: 'status' statt 'condition'
            "sort_order": inf.get("sortOrder"),
        })
    return rows


def extract_langlauf(s: dict) -> list[dict]:
    rows = []
    for tr in _to_list((s.get("crosscountry", {}) or {}).get("tracksArray")):
        inf = tr.get("info", {}) or {}
        lat, lon = _geom(_content(inf.get("latitude")), _content(inf.get("longitude")))
        rows.append({
            "station_id":          s.get("id"),
            "loipe_name":          _name(tr.get("name")),
            "typ_id":              (inf.get("type")      or {}).get("id"),
            "status_id":           (inf.get("condition") or {}).get("id"),
            "laenge_m_gesamt":     _num(inf.get("totalLength")),
            "laenge_m_heute":      _num(inf.get("totalLengthToday")),
            "letzte_praeparation": _date(inf.get("lastPreparation")),
            "lat": lat, "lon": lon,
            "sort_order":          inf.get("sortOrder"),
        })
    return rows


def extract_schlittelwege(s: dict) -> list[dict]:
    rows = []
    for ru in _to_list((s.get("tobogganing", {}) or {}).get("runsArray")):
        inf = ru.get("info", {}) or {}
        lat, lon = _geom(_content(inf.get("latitude")), _content(inf.get("longitude")))
        desc = ru.get("description")
        if isinstance(desc, dict):
            texts = _to_list(desc.get("textArray", []))
            desc = next((t.get("content","") for t in texts if t.get("lang") == "de"), None)
        rows.append({
            "station_id":          s.get("id"),
            "weg_name":            _name(ru.get("name")),
            "beschreibung":        desc,
            "typ_id":              (inf.get("type")      or {}).get("id"),
            "status_id":           (inf.get("condition") or {}).get("id"),
            "laenge_m_gesamt":     _num(inf.get("totalLength")),
            "laenge_m_heute":      _num(inf.get("totalLengthToday")),
            "letzte_praeparation": _date(inf.get("lastPreparation")),
            "lat": lat, "lon": lon,
            "sort_order":          inf.get("sortOrder"),
        })
    return rows


def extract_winterwandern(s: dict) -> list[dict]:
    rows = []
    for tr in _to_list((s.get("hiking", {}) or {}).get("trailsArray")):
        inf = tr.get("info", {}) or {}
        rows.append({
            "station_id":      s.get("id"),
            "weg_name":        _name(tr.get("name")),
            "typ_id":          (inf.get("type")      or {}).get("id"),
            "status_id":       (inf.get("condition") or {}).get("id"),
            "laenge_m_gesamt": _num(inf.get("totalLength")),
            "laenge_m_heute":  _num(inf.get("totalLengthToday")),
            "sort_order":      inf.get("sortOrder"),
        })
    return rows


# ══════════════════════════════════════════════════════════════
#  SQL
# ══════════════════════════════════════════════════════════════

SQL_UPSERT_SKIGEBIET = """
INSERT INTO skigebiete (
    station_id, updated_at, station_name, ort, zip, telefon, url,
    oeffnungszeit, schliessungszeit,
    last_api_update,
    schneetiefe_tal_cm, schneetiefe_piste_cm, neuschnee_cm, neuschnee_piste_top_cm,
    letzter_schneefall_tal, letzter_schneefall_piste, lawinengefahr_url,
    pistenzustand, schnee_haupt, schnee_teilweise,
    api_agg_anzahl_pisten, api_agg_km_pisten_gesamt, api_agg_km_pisten_offen,
    api_agg_anzahl_talabfahrten, api_agg_anzahl_talabfahrten_offen,
    api_agg_km_kunstschnee, api_agg_km_flutlicht_pisten,
    api_agg_anzahl_lifte_offen, api_agg_anzahl_lifte_gesamt,
    api_agg_anzahl_seilbahnen, api_agg_anzahl_sesselbahnen,
    api_agg_anzahl_skilifte, api_agg_anzahl_babylifte, api_agg_anzahl_foerderband,
    api_agg_km_klassisch_gesamt, api_agg_km_klassisch_praepar,
    api_agg_km_skating_gesamt, api_agg_km_skating_praepar, api_agg_km_flutlicht_langlauf,
    api_agg_anzahl_schlittelwege, api_agg_anzahl_schlittelwege_offen,
    api_agg_km_schlitteln, api_agg_schlitteln_kunstschnee,
    api_agg_schlitteln_oev, api_agg_schlitteln_verleih,
    api_agg_km_winterwandern_praepar, api_agg_km_schneeschuh
) VALUES (
    %(station_id)s, now(), %(station_name)s, %(ort)s, %(zip)s, %(telefon)s, %(url)s,
    %(oeffnungszeit)s, %(schliessungszeit)s,
    %(last_api_update)s,
    %(schneetiefe_tal_cm)s, %(schneetiefe_piste_cm)s, %(neuschnee_cm)s, %(neuschnee_piste_top_cm)s,
    %(letzter_schneefall_tal)s, %(letzter_schneefall_piste)s, %(lawinengefahr_url)s,
    %(pistenzustand)s, %(schnee_haupt)s, %(schnee_teilweise)s,
    %(api_agg_anzahl_pisten)s, %(api_agg_km_pisten_gesamt)s, %(api_agg_km_pisten_offen)s,
    %(api_agg_anzahl_talabfahrten)s, %(api_agg_anzahl_talabfahrten_offen)s,
    %(api_agg_km_kunstschnee)s, %(api_agg_km_flutlicht_pisten)s,
    %(api_agg_anzahl_lifte_offen)s, %(api_agg_anzahl_lifte_gesamt)s,
    %(api_agg_anzahl_seilbahnen)s, %(api_agg_anzahl_sesselbahnen)s,
    %(api_agg_anzahl_skilifte)s, %(api_agg_anzahl_babylifte)s, %(api_agg_anzahl_foerderband)s,
    %(api_agg_km_klassisch_gesamt)s, %(api_agg_km_klassisch_praepar)s,
    %(api_agg_km_skating_gesamt)s, %(api_agg_km_skating_praepar)s, %(api_agg_km_flutlicht_langlauf)s,
    %(api_agg_anzahl_schlittelwege)s, %(api_agg_anzahl_schlittelwege_offen)s,
    %(api_agg_km_schlitteln)s, %(api_agg_schlitteln_kunstschnee)s,
    %(api_agg_schlitteln_oev)s, %(api_agg_schlitteln_verleih)s,
    %(api_agg_km_winterwandern_praepar)s, %(api_agg_km_schneeschuh)s
)
ON CONFLICT (station_id) DO UPDATE SET
    updated_at                        = now(),
    station_name                      = EXCLUDED.station_name,
    ort                               = EXCLUDED.ort,
    zip                               = EXCLUDED.zip,
    telefon                           = EXCLUDED.telefon,
    url                               = EXCLUDED.url,
    oeffnungszeit                     = EXCLUDED.oeffnungszeit,
    schliessungszeit                  = EXCLUDED.schliessungszeit,
    last_api_update                   = EXCLUDED.last_api_update,
    schneetiefe_tal_cm                = EXCLUDED.schneetiefe_tal_cm,
    schneetiefe_piste_cm              = EXCLUDED.schneetiefe_piste_cm,
    neuschnee_cm                      = EXCLUDED.neuschnee_cm,
    neuschnee_piste_top_cm            = EXCLUDED.neuschnee_piste_top_cm,
    letzter_schneefall_tal            = EXCLUDED.letzter_schneefall_tal,
    letzter_schneefall_piste          = EXCLUDED.letzter_schneefall_piste,
    lawinengefahr_url                 = EXCLUDED.lawinengefahr_url,
    pistenzustand                     = EXCLUDED.pistenzustand,
    schnee_haupt                      = EXCLUDED.schnee_haupt,
    schnee_teilweise                  = EXCLUDED.schnee_teilweise,
    api_agg_anzahl_pisten             = EXCLUDED.api_agg_anzahl_pisten,
    api_agg_km_pisten_gesamt          = EXCLUDED.api_agg_km_pisten_gesamt,
    api_agg_km_pisten_offen           = EXCLUDED.api_agg_km_pisten_offen,
    api_agg_anzahl_talabfahrten       = EXCLUDED.api_agg_anzahl_talabfahrten,
    api_agg_anzahl_talabfahrten_offen = EXCLUDED.api_agg_anzahl_talabfahrten_offen,
    api_agg_km_kunstschnee            = EXCLUDED.api_agg_km_kunstschnee,
    api_agg_km_flutlicht_pisten       = EXCLUDED.api_agg_km_flutlicht_pisten,
    api_agg_anzahl_lifte_offen        = EXCLUDED.api_agg_anzahl_lifte_offen,
    api_agg_anzahl_lifte_gesamt       = EXCLUDED.api_agg_anzahl_lifte_gesamt,
    api_agg_anzahl_seilbahnen         = EXCLUDED.api_agg_anzahl_seilbahnen,
    api_agg_anzahl_sesselbahnen       = EXCLUDED.api_agg_anzahl_sesselbahnen,
    api_agg_anzahl_skilifte           = EXCLUDED.api_agg_anzahl_skilifte,
    api_agg_anzahl_babylifte          = EXCLUDED.api_agg_anzahl_babylifte,
    api_agg_anzahl_foerderband        = EXCLUDED.api_agg_anzahl_foerderband,
    api_agg_km_klassisch_gesamt       = EXCLUDED.api_agg_km_klassisch_gesamt,
    api_agg_km_klassisch_praepar      = EXCLUDED.api_agg_km_klassisch_praepar,
    api_agg_km_skating_gesamt         = EXCLUDED.api_agg_km_skating_gesamt,
    api_agg_km_skating_praepar        = EXCLUDED.api_agg_km_skating_praepar,
    api_agg_km_flutlicht_langlauf     = EXCLUDED.api_agg_km_flutlicht_langlauf,
    api_agg_anzahl_schlittelwege      = EXCLUDED.api_agg_anzahl_schlittelwege,
    api_agg_anzahl_schlittelwege_offen= EXCLUDED.api_agg_anzahl_schlittelwege_offen,
    api_agg_km_schlitteln             = EXCLUDED.api_agg_km_schlitteln,
    api_agg_schlitteln_kunstschnee    = EXCLUDED.api_agg_schlitteln_kunstschnee,
    api_agg_schlitteln_oev            = EXCLUDED.api_agg_schlitteln_oev,
    api_agg_schlitteln_verleih        = EXCLUDED.api_agg_schlitteln_verleih,
    api_agg_km_winterwandern_praepar  = EXCLUDED.api_agg_km_winterwandern_praepar,
    api_agg_km_schneeschuh            = EXCLUDED.api_agg_km_schneeschuh;
"""

SQL_INSERT_PISTE = """
INSERT INTO pisten (station_id, updated_at, piste_name, typ_id, status_id,
                    laenge_m_gesamt, laenge_m_heute, sort_order)
VALUES (%(station_id)s, now(), %(piste_name)s, %(typ_id)s, %(status_id)s,
        %(laenge_m_gesamt)s, %(laenge_m_heute)s, %(sort_order)s);
"""

SQL_INSERT_LIFT = """
INSERT INTO lifte (station_id, updated_at, lift_name, typ_id, status_id, sort_order)
VALUES (%(station_id)s, now(), %(lift_name)s, %(typ_id)s, %(status_id)s, %(sort_order)s);
"""

SQL_INSERT_LANGLAUF = """
INSERT INTO langlauf (station_id, updated_at, loipe_name, typ_id, status_id,
                      laenge_m_gesamt, laenge_m_heute, letzte_praeparation,
                      geom, sort_order)
VALUES (%(station_id)s, now(), %(loipe_name)s, %(typ_id)s, %(status_id)s,
        %(laenge_m_gesamt)s, %(laenge_m_heute)s, %(letzte_praeparation)s,
        CASE WHEN %(lon)s IS NOT NULL AND %(lat)s IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326)
             ELSE NULL END,
        %(sort_order)s);
"""

SQL_INSERT_SCHLITTELWEG = """
INSERT INTO schlittelwege (station_id, updated_at, weg_name, beschreibung,
                           typ_id, status_id, laenge_m_gesamt, laenge_m_heute,
                           letzte_praeparation, geom, sort_order)
VALUES (%(station_id)s, now(), %(weg_name)s, %(beschreibung)s,
        %(typ_id)s, %(status_id)s, %(laenge_m_gesamt)s, %(laenge_m_heute)s,
        %(letzte_praeparation)s,
        CASE WHEN %(lon)s IS NOT NULL AND %(lat)s IS NOT NULL
             THEN ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326)
             ELSE NULL END,
        %(sort_order)s);
"""

SQL_INSERT_WINTERWANDERN = """
INSERT INTO winterwandern (station_id, updated_at, weg_name, typ_id, status_id,
                           laenge_m_gesamt, laenge_m_heute, sort_order)
VALUES (%(station_id)s, now(), %(weg_name)s, %(typ_id)s, %(status_id)s,
        %(laenge_m_gesamt)s, %(laenge_m_heute)s, %(sort_order)s);
"""


# ══════════════════════════════════════════════════════════════
#  DB-SCHREIBEN
# ══════════════════════════════════════════════════════════════

def upsert_station(cur, station: dict) -> dict:
    """
    Schreibt eine Station vollständig neu:
      1. skigebiete: UPSERT (ON CONFLICT DO UPDATE)
      2. Detailtabellen: DELETE alle Zeilen der Station, dann INSERT
    Läuft innerhalb der Transaktion des Aufrufers.
    """
    sid = station.get("id")

    # skigebiete UPSERT
    cur.execute(SQL_UPSERT_SKIGEBIET, extract_skigebiet(station))

    # Detailtabellen: DELETE + INSERT
    stats = {}
    for table, rows, sql in [
        ("pisten",        extract_pisten(station),        SQL_INSERT_PISTE),
        ("lifte",         extract_lifte(station),         SQL_INSERT_LIFT),
        ("langlauf",      extract_langlauf(station),      SQL_INSERT_LANGLAUF),
        ("schlittelwege", extract_schlittelwege(station), SQL_INSERT_SCHLITTELWEG),
        ("winterwandern", extract_winterwandern(station), SQL_INSERT_WINTERWANDERN),
    ]:
        cur.execute(f"DELETE FROM {table} WHERE station_id = %s", (sid,))
        if rows:
            psycopg2.extras.execute_batch(cur, sql, rows, page_size=200)
        stats[table] = len(rows)

    return stats


# ══════════════════════════════════════════════════════════════
#  HAUPTPROGRAMM
# ══════════════════════════════════════════════════════════════

def main():
    log.info("=" * 60)
    log.info("  STNet → PostgreSQL  |  %s", datetime.datetime.now().isoformat())
    log.info("=" * 60)

    if not STN_API_KEY:
        log.error("STN_API_KEY nicht gesetzt.")
        sys.exit(1)

    log.info("Lade Stationen von STNet API …")
    try:
        stations = fetch_all_stations()
    except requests.HTTPError as e:
        log.error("HTTP-Fehler %s: %s", e.response.status_code, e.response.text[:300])
        sys.exit(1)
    except requests.RequestException as e:
        log.error("Verbindungsfehler: %s", e)
        sys.exit(1)
    log.info("%d Stationen geladen.", len(stations))

    log.info("Verbinde mit PostgreSQL %s:%s/%s …", DB_HOST, DB_PORT, DB_NAME)
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
            user=DB_USER, password=DB_PASS, connect_timeout=10,
        )
    except psycopg2.OperationalError as e:
        log.error("DB-Verbindung fehlgeschlagen: %s", e)
        sys.exit(1)

    conn.autocommit = False
    total  = {t: 0 for t in ("pisten","lifte","langlauf","schlittelwege","winterwandern")}
    errors = 0

    for s in stations:
        sid, sname = s.get("id", "?"), s.get("name", "?")
        try:
            with conn.cursor() as cur:
                stats = upsert_station(cur, s)
            conn.commit()
            for t, n in stats.items():
                total[t] += n
            log.debug("  ✓  %s (%s)  %s", sid, sname,
                      "  ".join(f"{t}={n}" for t, n in stats.items()))
        except Exception as e:
            conn.rollback()
            errors += 1
            log.warning("  ✗  Station %s (%s) übersprungen: %s", sid, sname, e)

    conn.close()

    log.info("-" * 60)
    log.info("Import abgeschlossen:")
    log.info("  Stationen: %d  (Fehler: %d)", len(stations), errors)
    for table, count in total.items():
        log.info("  %-20s: %d", table, count)
    log.info("=" * 60)

    if errors:
        sys.exit(2)


if __name__ == "__main__":
    main()