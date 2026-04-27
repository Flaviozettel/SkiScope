"""
generate_dummy.py
=================
Generiert 3 fiktive Hochsaison-Snapshots im STnet-API-Response-Format.

Quelle:  _scaffold_raw.json   (lokales Scaffold mit Stammdaten – .gitignored)
Ziel:    stnet_snapshot_1.json, _2.json, _3.json   (.gitignored)

Snapshots simulieren die Hochsaison 2026:
  1) 28.01.2026 - stabile Verhältnisse, kein Neuschnee
  2) 02.02.2026 - frischer Neuschnee (5-30cm)
  3) 07.02.2026 - mid-season, hart bis sulzig

Strategie pro Station:
  - Stammdaten (id, name, address, slopes/lifts/tracks – Namen, Typ-IDs,
    sortOrder, totalLength, Höhe, etc.) bleiben unverändert.
  - Zeit-variante Felder werden je Snapshot deterministisch (Seed = id*100+idx)
    neu gesetzt.

Operationeller Zustand pro Station basierend auf Höhe + Anzahl Lifte:
  HIGH (alt>=1500m oder >=10 Lifte): immer OPEN (alle grossen offen)
  MID  (alt>=1000m oder >= 5 Lifte): meist OPEN, vereinzelt PARTIAL/CLOSED
  LOW  (sonst):                       häufig CLOSED (Balmberg-Klasse)
"""
import copy
import datetime
import json
import random
import sys
from pathlib import Path

SCAFFOLD = Path(__file__).parent / "_scaffold_raw.json"
OUT_DIR  = Path(__file__).parent

# ────────────────────────────────────────────────────────────
#  ID → textArray Lookups (de + en, andere Sprachen weggelassen)
# ────────────────────────────────────────────────────────────
TEXT_PISTE_LANGLAUF = {
    800: [{"lang":"de","content":"keine Meldung"},   {"lang":"en","content":"no info"}],
    801: [{"lang":"de","content":"gut"},             {"lang":"en","content":"good"}],
    802: [{"lang":"de","content":"gut-fahrbar"},     {"lang":"en","content":"good-fair"}],
    803: [{"lang":"de","content":"fahrbar-gut"},     {"lang":"en","content":"fair-good"}],
    804: [{"lang":"de","content":"fahrbar"},         {"lang":"en","content":"fair"}],
    805: [{"lang":"de","content":"geschlossen"},     {"lang":"en","content":"closed"}],
    806: [{"lang":"de","content":"Saisonschluss"},   {"lang":"en","content":"end season"}],
}
TEXT_LIFT = {
    3000: [{"lang":"de","content":"Keine Angaben"},  {"lang":"en","content":"No information"}],
    3001: [{"lang":"de","content":"Offen"},          {"lang":"en","content":"Open"}],
    3002: [{"lang":"de","content":"In Vorbereitung"},{"lang":"en","content":"In preparation"}],
    3003: [{"lang":"de","content":"Geschlossen"},    {"lang":"en","content":"Closed"}],
}
TEXT_HIKING = {
    1200: [{"lang":"de","content":"keine Meldung"},  {"lang":"en","content":"No notification"}],
    1201: [{"lang":"de","content":"gut"},            {"lang":"en","content":"Good"}],
    1202: [{"lang":"de","content":"begehbar"},       {"lang":"en","content":"Passable"}],
    1203: [{"lang":"de","content":"geschlossen"},    {"lang":"en","content":"Closed"}],
    1204: [{"lang":"de","content":"Saisonschluss"},  {"lang":"en","content":"End of season"}],
}
TEXT_SNOW_COND = {
    900: [{"lang":"de","content":"keine Meldung"},   {"lang":"en","content":"no info"}],
    901: [{"lang":"de","content":"pulver"},          {"lang":"en","content":"powder"}],
    905: [{"lang":"de","content":"hart"},            {"lang":"en","content":"hard"}],
    909: [{"lang":"de","content":"sulz"},            {"lang":"en","content":"spring snow"}],
    913: [{"lang":"de","content":"nass"},            {"lang":"en","content":"wet"}],
}

def make_status(table: dict, status_id: int) -> dict:
    return {"id": status_id, "textArray": list(table.get(status_id, []))}

# ────────────────────────────────────────────────────────────
#  Snapshot-Konfigurationen
# ────────────────────────────────────────────────────────────
SNAPSHOTS = [
    {
        "name": "stnet_snapshot_1.json",
        "date": datetime.date(2026, 1, 28),  # Mi, stabil
        "label": "Stabil sonnig",
        "fresh_snow_range": (0, 0),
        "fresh_snow_top_range": (0, 0),
        "last_snowfall_offset_days": 4,
        "main_cond_weights": {905: 0.30, 901: 0.40, 909: 0.15, 900: 0.15},
        "lift_in_prep_pct": 0.0,
        "operational_bonus": 0.0,
    },
    {
        "name": "stnet_snapshot_2.json",
        "date": datetime.date(2026, 2, 2),   # Mo, nach Neuschnee am Wochenende
        "label": "Frischer Neuschnee",
        "fresh_snow_range": (8, 22),
        "fresh_snow_top_range": (12, 35),
        "last_snowfall_offset_days": 0,
        "main_cond_weights": {901: 0.70, 909: 0.10, 905: 0.10, 900: 0.10},
        "lift_in_prep_pct": 0.10,
        "operational_bonus": 0.0,
    },
    {
        "name": "stnet_snapshot_3.json",
        "date": datetime.date(2026, 2, 7),   # Sa, mid-season warm
        "label": "Mid-season",
        "fresh_snow_range": (0, 0),
        "fresh_snow_top_range": (0, 0),
        "last_snowfall_offset_days": 5,
        "main_cond_weights": {905: 0.50, 909: 0.30, 901: 0.10, 900: 0.10},
        "lift_in_prep_pct": 0.0,
        "operational_bonus": -0.03,
    },
]

# ────────────────────────────────────────────────────────────
#  Hilfsfunktionen
# ────────────────────────────────────────────────────────────

def fmt_iso_winter(dt: datetime.datetime) -> str:
    """ISO-String mit fixer CET-Offset (+01:00) – Hochsaison ist immer Winterzeit."""
    return dt.strftime("%Y-%m-%dT%H:%M:%S") + ".000+01:00"

def fmt_iso_date(d: datetime.date) -> str:
    return d.strftime("%Y-%m-%dT00:00:00") + ".000+01:00"

def get_altitude(s: dict) -> int | None:
    h = (s.get("info") or {}).get("heightOfSnowMeasurementResort")
    if isinstance(h, dict):
        v = h.get("content")
        if isinstance(v, (int, float)) and v > 0:
            return int(v)
    return None

def get_n_facilities(s: dict) -> int:
    nf = (s.get("info") or {}).get("numberOfFacilities")
    if isinstance(nf, dict):
        v = nf.get("content")
        if isinstance(v, (int, float)):
            return int(v)
    return 0

def classify(alt: int | None, n_fac: int) -> str:
    """HIGH (snow-secure / big), MID, LOW (klein + tief, z.B. Balmberg)."""
    if (alt is not None and alt >= 1500) or n_fac >= 10:
        return "HIGH"
    if (alt is not None and alt >= 1300) or n_fac >= 8:
        return "MID"
    return "LOW"

# (OPEN, PARTIAL, CLOSED)
STATE_WEIGHTS = {
    "HIGH": (1.00, 0.00, 0.00),
    "MID":  (0.70, 0.25, 0.05),
    "LOW":  (0.20, 0.30, 0.50),
}

def pick_station_state(rng: random.Random, band: str, op_bonus: float) -> str:
    w_open, w_partial, w_closed = STATE_WEIGHTS[band]
    # op_bonus: + verschiebt Richtung CLOSED, - Richtung OPEN
    w_open    = max(0.0, w_open   - op_bonus)
    w_closed  = min(1.0, w_closed + op_bonus)
    total = w_open + w_partial + w_closed
    r = rng.random() * total
    if r < w_open:               return "OPEN"
    if r < w_open + w_partial:   return "PARTIAL"
    return "CLOSED"

def snow_depth_for(alt: int | None, rng: random.Random) -> tuple[int, int]:
    a = alt if alt is not None else 700
    if a >= 1800: tal = rng.randint(100, 160); piste_add = rng.randint(40, 80)
    elif a >= 1500: tal = rng.randint(70, 120); piste_add = rng.randint(35, 70)
    elif a >= 1200: tal = rng.randint(45, 90);  piste_add = rng.randint(30, 60)
    elif a >= 900:  tal = rng.randint(25, 60);  piste_add = rng.randint(25, 50)
    else:           tal = rng.randint(8, 35);   piste_add = rng.randint(15, 40)
    return tal, tal + piste_add

def pick_status_for_piste(rng: random.Random, state: str) -> int:
    if state == "CLOSED":  return 805
    if state == "PARTIAL": return rng.choices([801,802,803,804,805], weights=[0.15,0.20,0.15,0.10,0.40])[0]
    return rng.choices([801,802,803,804,805],     weights=[0.55,0.20,0.10,0.05,0.10])[0]

def pick_status_for_lift(rng: random.Random, state: str, in_prep_pct: float) -> int:
    if state == "CLOSED": return 3003
    if state == "PARTIAL" and rng.random() < 0.40: return 3003
    if rng.random() < in_prep_pct: return 3002
    return 3001 if rng.random() > 0.05 else 3003

def pick_status_for_loipe(rng: random.Random, state: str) -> int:
    if state == "CLOSED":  return 805
    if state == "PARTIAL": return rng.choices([801,802,805], weights=[0.20,0.15,0.65])[0]
    return rng.choices([801,802,805],            weights=[0.70,0.10,0.20])[0]

def pick_status_for_schlittel(rng: random.Random, state: str) -> int:
    if state == "CLOSED":  return 805
    if state == "PARTIAL": return rng.choices([801,805], weights=[0.30,0.70])[0]
    return rng.choices([801,802,805],            weights=[0.55,0.15,0.30])[0]

def pick_status_for_hike(rng: random.Random, state: str) -> int:
    if state == "CLOSED":  return 1203
    if state == "PARTIAL": return rng.choices([1201,1202,1203], weights=[0.20,0.30,0.50])[0]
    return rng.choices([1201,1202,1203],         weights=[0.65,0.25,0.10])[0]

def pick_runs_condition(rng: random.Random, state: str) -> int:
    if state == "CLOSED":  return 805
    if state == "PARTIAL": return rng.choices([801,802,803,804], weights=[0.15,0.30,0.30,0.25])[0]
    return rng.choices([801,802,803],            weights=[0.65,0.25,0.10])[0]

def pick_snow_condition(rng: random.Random, weights: dict) -> int:
    return rng.choices(list(weights.keys()), weights=list(weights.values()))[0]

def update_content(d: dict, key: str, value):
    """Setzt d[key]['content']=value, wenn d[key] ein Dict mit 'content' ist.
    Lässt 'unit' unverändert. Tut nichts, wenn das Feld fehlt."""
    cur = d.get(key)
    if isinstance(cur, dict) and "content" in cur:
        cur["content"] = value

def set_content(d: dict, key: str, value, unit: str | None = None):
    """Wie update_content, legt das Feld aber an, wenn es fehlt."""
    cur = d.get(key)
    if isinstance(cur, dict):
        cur["content"] = value
    else:
        d[key] = {"content": value} if unit is None else {"unit": unit, "content": value}

def get_content(d: dict, key: str):
    cur = (d or {}).get(key)
    if isinstance(cur, dict): return cur.get("content")
    return cur

def as_list(v):
    if v is None: return []
    if isinstance(v, dict): return [v]
    if isinstance(v, list): return v
    return []

# ────────────────────────────────────────────────────────────
#  Snapshot-Generator
# ────────────────────────────────────────────────────────────

def build_snapshot(stations_template: list, snap_idx: int, snap_cfg: dict) -> dict:
    snap_date = snap_cfg["date"]
    out_stations = []
    counts = {"OPEN": 0, "PARTIAL": 0, "CLOSED": 0}

    for s_orig in stations_template:
        s = copy.deepcopy(s_orig)
        sid = s.get("id", 0) or 0
        rng = random.Random(sid * 100 + snap_idx)
        alt = get_altitude(s)
        n_fac = get_n_facilities(s)
        band = classify(alt, n_fac)
        state = pick_station_state(rng, band, snap_cfg["operational_bonus"])
        counts[state] += 1

        # ── Schneetiefen ──────────────────────────────────────
        tal, piste = snow_depth_for(alt, rng)
        if state == "CLOSED":
            tal   = max(0, int(tal   * rng.uniform(0.0, 0.4)))
            piste = max(0, int(piste * rng.uniform(0.0, 0.5)))
        elif state == "PARTIAL":
            tal   = int(tal   * rng.uniform(0.5, 1.0))
            piste = int(piste * rng.uniform(0.6, 1.0))

        # Neuschnee: skaliert nach Höhe (tieflagen weniger)
        scale = 1.0 if (alt or 0) >= 1500 else (0.7 if (alt or 0) >= 1000 else 0.4)
        flo, fhi = snap_cfg["fresh_snow_range"]
        ftlo, fthi = snap_cfg["fresh_snow_top_range"]
        fresh     = int(rng.randint(flo, fhi)   * scale) if fhi  > 0 else 0
        fresh_top = int(rng.randint(ftlo, fthi) * scale) if fthi > 0 else 0

        snow = s.setdefault("snow", {})
        set_content(snow, "depthOfSnowResort", tal,       unit="cm")
        set_content(snow, "depthOfSnowPiste", piste,      unit="cm")
        set_content(snow, "freshSnow", fresh,             unit="cm")
        set_content(snow, "freshSnowPisteTop", fresh_top, unit="cm")

        last_sf = snap_date - datetime.timedelta(days=snap_cfg["last_snowfall_offset_days"])
        if state == "CLOSED" and rng.random() < 0.5:
            last_sf -= datetime.timedelta(days=rng.randint(7, 21))
        snow["lastSnowfallResort"] = {"content": fmt_iso_date(last_sf)}
        snow["lastSnowfallPiste"]  = {"content": fmt_iso_date(last_sf)}

        # Reports leeren (Originaltexte beziehen sich auf reale Daten)
        if isinstance(snow.get("reportSnow"), dict):
            snow["reportSnow"] = {"textArray": []}

        # ── Ski-Aggregat ──────────────────────────────────────
        ski = s.setdefault("ski", {})
        cond_main_id    = pick_snow_condition(rng, snap_cfg["main_cond_weights"]) if state != "CLOSED" else 900
        cond_partial_id = pick_snow_condition(rng, snap_cfg["main_cond_weights"]) if state != "CLOSED" else 900
        ski["snowConditionMain"]    = make_status(TEXT_SNOW_COND, cond_main_id)
        ski["snowConditionPartial"] = make_status(TEXT_SNOW_COND, cond_partial_id)
        ski["runsCondition"]        = make_status(TEXT_PISTE_LANGLAUF, pick_runs_condition(rng, state))

        # slopesArray: jede Piste neu durchsetzen
        open_length_m   = 0
        n_slopes_detail = 0
        n_slopes_open   = 0
        for sl in as_list(ski.get("slopesArray")):
            if not isinstance(sl, dict): continue
            n_slopes_detail += 1
            inf = sl.setdefault("info", {})
            piste_status = pick_status_for_piste(rng, state)
            inf["condition"] = make_status(TEXT_PISTE_LANGLAUF, piste_status)
            tlen = get_content(inf, "totalLength")
            tlen = int(tlen) if isinstance(tlen, (int, float)) else 0
            today = tlen if piste_status in (801, 802, 803, 804) else 0
            update_content(inf, "totalLengthToday", today)
            if today > 0:
                n_slopes_open += 1
            open_length_m += today

        # Wenn slopesArray leer (z.B. Zermatt, Verbier, LAAX, Davos) →
        # lengthOfSlopesOpen basierend auf state-Anteil von lengthOfSlopes setzen.
        total_len = get_content(ski, "lengthOfSlopes")
        if n_slopes_detail == 0 and isinstance(total_len, (int, float)) and total_len > 0:
            if state == "CLOSED":
                open_pct = 0.0
            elif state == "PARTIAL":
                open_pct = rng.uniform(0.40, 0.65)
            else:
                open_pct = rng.uniform(0.85, 0.98)
            open_length_m = int(total_len * open_pct)
        set_content(ski, "lengthOfSlopesOpen", open_length_m, unit="m")

        # Talabfahrten-Aggregat
        nvr = get_content(ski, "numberOfValleyRuns")
        if isinstance(nvr, (int, float)) and nvr > 0:
            nvr = int(nvr)
            if state == "OPEN":
                # Bei tiefen "grossen" Stationen häufiger Talabfahrt-Probleme
                if alt is not None and alt < 1300 and rng.random() < 0.50:
                    closed_n = rng.randint(1, max(1, nvr // 2))
                elif rng.random() < 0.30:
                    closed_n = rng.randint(1, min(2, nvr))
                else:
                    closed_n = 0
                update_content(ski, "numberOfValleyRunsOpen", max(0, nvr - closed_n))
            elif state == "PARTIAL":
                update_content(ski, "numberOfValleyRunsOpen", rng.randint(0, max(0, nvr // 2)))
            else:
                update_content(ski, "numberOfValleyRunsOpen", 0)

        # ── Facility / Lifte ─────────────────────────────────
        fac = s.setdefault("facility", {})
        n_lifts_detail = 0
        n_open_lifts   = 0
        for li in as_list((s.get("liftInfo") or {}).get("liftsArray")):
            if not isinstance(li, dict): continue
            n_lifts_detail += 1
            inf = li.setdefault("info", {})
            stid = pick_status_for_lift(rng, state, snap_cfg["lift_in_prep_pct"])
            inf["status"] = make_status(TEXT_LIFT, stid)
            if stid == 3001:
                n_open_lifts += 1
        # Wenn liftsArray leer → numberOfOpenFacilities aus numberOfFacilities ableiten
        if n_lifts_detail == 0 and n_fac > 0:
            if state == "CLOSED":
                n_open_lifts = 0
            elif state == "PARTIAL":
                n_open_lifts = int(n_fac * rng.uniform(0.40, 0.70))
            else:
                # OPEN: bei Hochsaison fast alle, in Snap 2 paar in Vorbereitung
                n_open_lifts = int(n_fac * rng.uniform(0.92, 1.0))
                in_prep_n    = int(n_fac * snap_cfg["lift_in_prep_pct"])
                n_open_lifts = max(0, n_open_lifts - in_prep_n)
        set_content(fac, "numberOfOpenFacilities", n_open_lifts)
        set_content(ski, "numberOfOpenFacilities", n_open_lifts)

        if isinstance(fac.get("reportFacility"), dict):
            fac["reportFacility"] = {"textArray": []}

        # ── Crosscountry ─────────────────────────────────────
        for tr in as_list((s.get("crosscountry") or {}).get("tracksArray")):
            if not isinstance(tr, dict): continue
            inf = tr.setdefault("info", {})
            sid_l = pick_status_for_loipe(rng, state)
            inf["condition"] = make_status(TEXT_PISTE_LANGLAUF, sid_l)
            tlen = get_content(inf, "totalLength")
            tlen = int(tlen) if isinstance(tlen, (int, float)) else 0
            today = tlen if sid_l in (801, 802, 803, 804) else 0
            update_content(inf, "totalLengthToday", today)
            if isinstance(inf.get("lastPreparation"), dict) and sid_l in (801, 802, 803, 804):
                prep = snap_date if rng.random() < 0.7 else snap_date - datetime.timedelta(days=1)
                inf["lastPreparation"] = {"content": fmt_iso_date(prep)}

        # ── Tobogganing ──────────────────────────────────────
        for ru in as_list((s.get("tobogganing") or {}).get("runsArray")):
            if not isinstance(ru, dict): continue
            inf = ru.setdefault("info", {})
            sid_t = pick_status_for_schlittel(rng, state)
            inf["condition"] = make_status(TEXT_PISTE_LANGLAUF, sid_t)
            tlen = get_content(inf, "totalLength")
            tlen = int(tlen) if isinstance(tlen, (int, float)) else 0
            today = tlen if sid_t in (801, 802, 803, 804) else 0
            update_content(inf, "totalLengthToday", today)
            if isinstance(inf.get("lastPreparation"), dict) and sid_t in (801, 802, 803, 804):
                prep = snap_date if rng.random() < 0.7 else snap_date - datetime.timedelta(days=1)
                inf["lastPreparation"] = {"content": fmt_iso_date(prep)}

        # ── Hiking ───────────────────────────────────────────
        for tr in as_list((s.get("hiking") or {}).get("trailsArray")):
            if not isinstance(tr, dict): continue
            inf = tr.setdefault("info", {})
            sid_h = pick_status_for_hike(rng, state)
            inf["condition"] = make_status(TEXT_HIKING, sid_h)
            tlen = get_content(inf, "totalLength")
            tlen = int(tlen) if isinstance(tlen, (int, float)) else 0
            today = tlen if sid_h in (1201, 1202) else 0
            update_content(inf, "totalLengthToday", today)

        # ── lastUpdate ───────────────────────────────────────
        upd = datetime.datetime.combine(
            snap_date,
            datetime.time(rng.randint(6, 8), rng.randint(0, 59), rng.randint(0, 59)),
        )
        s["lastUpdate"] = {"content": fmt_iso_winter(upd)}

        out_stations.append(s)

    print(f"  States: OPEN={counts['OPEN']}  PARTIAL={counts['PARTIAL']}  CLOSED={counts['CLOSED']}")

    return {
        "stations": {
            "header": {
                "resultSize":     len(out_stations),
                "pageSize":       len(out_stations),
                "resultsInPage":  len(out_stations),
                "totalPages":     1,
                "currentPage":    1,
                "page":           1,
                "size":           len(out_stations),
            },
            "stationsArray": out_stations,
        }
    }


def main():
    if not SCAFFOLD.exists():
        print(f"FEHLT: {SCAFFOLD}\nBitte zuerst _fetch_scaffold.py ausführen.", file=sys.stderr)
        sys.exit(1)

    raw = json.loads(SCAFFOLD.read_text())
    template = raw["stations"]["stationsArray"]
    print(f"Geladen: {len(template)} Stationen aus _scaffold_raw.json\n")

    for idx, cfg in enumerate(SNAPSHOTS):
        print(f"Snapshot {idx+1}/{len(SNAPSHOTS)}  ({cfg['label']}, {cfg['date']})")
        snap = build_snapshot(template, idx, cfg)
        out_path = OUT_DIR / cfg["name"]
        out_path.write_text(json.dumps(snap, ensure_ascii=False, indent=2))

        # Aggregat-Statistik
        n_open_lifts = 0
        n_open_pisten = 0
        for st in snap["stations"]["stationsArray"]:
            for li in as_list((st.get("liftInfo") or {}).get("liftsArray")):
                if isinstance(li, dict) and ((li.get("info") or {}).get("status") or {}).get("id") == 3001:
                    n_open_lifts += 1
            for sl in as_list((st.get("ski") or {}).get("slopesArray")):
                if isinstance(sl, dict) and ((sl.get("info") or {}).get("condition") or {}).get("id") in (801,802,803,804):
                    n_open_pisten += 1
        size_mb = out_path.stat().st_size / 1024 / 1024
        print(f"  → {out_path.name}  ({size_mb:.1f} MB)  offene_lifte={n_open_lifts}  offene_pisten={n_open_pisten}\n")

    print("Fertig.")


if __name__ == "__main__":
    main()
