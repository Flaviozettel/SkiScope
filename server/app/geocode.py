import pandas as pd
from geopy.geocoders import Nominatim
import time
import json
import os
import geopandas as gpd
from shapely.geometry import Point

# -------------------------
# CONFIG
# -------------------------
INPUT_CSV = "skigebiete_csv.csv"
OUTPUT_GPKG = "skigebiete_geocoded.gpkg"
CACHE_FILE = "geocode_cache.json"

# -------------------------
# CACHE LOAD
# -------------------------
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, "r") as f:
            CACHE = json.load(f)
    except:
        CACHE = {}
else:
    CACHE = {}

# -------------------------
# GEOCODER
# -------------------------
geolocator = Nominatim(user_agent="skiscope")

def geocode(row):
    name = row["station_name"]
    country = row["Land"]

    key = f"{name}_{country}".lower()

    if key in CACHE:
        return CACHE[key]

    try:
        query = f"{name}, {country}"
        loc = geolocator.geocode(query, timeout=10)

        time.sleep(1.2)  # Rate Limit Schutz (wichtig!)

        if loc:
            result = {
                "lat": loc.latitude,
                "lon": loc.longitude
            }
        else:
            result = {
                "lat": None,
                "lon": None
            }

        CACHE[key] = result
        return result

    except Exception as e:
        print("Geocode error:", name, e)
        return {"lat": None, "lon": None}

# -------------------------
# LOAD CSV
# -------------------------
df = pd.read_csv(INPUT_CSV)

# Pflicht-Spalten Check
required_cols = ["station_name", "Land"]
for col in required_cols:
    if col not in df.columns:
        raise ValueError(f"CSV fehlt Spalte: {col}")

# -------------------------
# GEOCODING LOOP
# -------------------------
lats = []
lons = []

for _, row in df.iterrows():
    geo = geocode(row)

    lats.append(geo["lat"])
    lons.append(geo["lon"])

# -------------------------
# ADD RESULTS
# -------------------------
df["lat"] = lats
df["lon"] = lons

# entferne fehlerhafte Einträge
df = df.dropna(subset=["lat", "lon"])

# -------------------------
# GEOMETRY BUILD
# -------------------------
df["geometry"] = df.apply(
    lambda r: Point(r["lon"], r["lat"]),
    axis=1
)

# -------------------------
# GEO DATAFRAME
# -------------------------
gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:4326")

# -------------------------
# SAVE GEOPACKAGE
# -------------------------
gdf.to_file(OUTPUT_GPKG, layer="skigebiete", driver="GPKG")

print(f"Fertig ✅ GeoPackage erstellt: {OUTPUT_GPKG}")

# -------------------------
# SAVE CACHE
# -------------------------
with open(CACHE_FILE, "w") as f:
    json.dump(CACHE, f, indent=2)

print("Cache gespeichert ✅")