"""
Einmaliger Fetch der echten STnet API → speichert die zusammengeführte Response
als lokales Scaffold (Stammdaten-Quelle für den Dummy-Generator).

ACHTUNG: Diese Datei dient NUR zum lokalen, einmaligen Download während die
echte API noch läuft. Das Output-File ist gitignored.

Verwendung:
    export STN_USERNAME="FHNW"
    export STN_API_KEY="<key>"
    cd /Users/manuel/Documents/GitHub/SkiScope/preprocessing/scripts/dummy_data
    python _fetch_scaffold.py
"""
import hashlib
import json
import os
import random
import string
import sys
import time
import datetime
from pathlib import Path

import requests

STN_USERNAME  = os.getenv("STN_USERNAME", "FHNW")
STN_API_KEY   = os.getenv("STN_API_KEY",  "")
STN_BASE_URL  = "http://st.stnet.ch/api/services/wispostations"
STN_PAGE_SIZE = 50
STN_PAUSE_S   = 0.3

OUT_FILE = Path(__file__).parent / "_scaffold_raw.json"


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


def main():
    if not STN_API_KEY:
        print("ERROR: STN_API_KEY nicht gesetzt.", file=sys.stderr)
        sys.exit(1)

    print(f"Fetching from {STN_BASE_URL} as user '{STN_USERNAME}' …")

    all_stations = []
    page = 1
    first_header = None

    while True:
        data = fetch_page(page)
        root = data.get("stations", {})
        header = root.get("header", {})
        if first_header is None:
            first_header = header
        total_pages = int(header.get("totalPages", 1))
        result_size = int(header.get("resultSize", 0))
        batch = root.get("stationsArray", [])
        if isinstance(batch, dict):
            batch = [batch]
        all_stations.extend(batch)
        print(f"  Seite {page:>3}/{total_pages}  -  {len(batch):>3} Stationen  (gesamt: {len(all_stations)}/{result_size})")
        if page >= total_pages:
            break
        page += 1
        time.sleep(STN_PAUSE_S)

    merged = {
        "stations": {
            "header": {**first_header, "totalPages": 1, "page": 1, "size": len(all_stations)},
            "stationsArray": all_stations,
        }
    }

    OUT_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2))
    print(f"\nGespeichert: {OUT_FILE}  ({len(all_stations)} Stationen)")


if __name__ == "__main__":
    main()
