// ============================================================
// MainArea.jsx – Hauptbereich mit Wochenleiste und Karte
//
// Zeigt eine 7-Tage-Auswahl, lädt Schneehöhen- und
// Skigebiets-Daten vom Backend und stellt diese auf einer
// interaktiven MapLibre-Karte dar. Klick auf ein Skigebiet
// öffnet ein Popup mit Detailinformationen.
// ============================================================

import { useState, useEffect } from "react";
import Map, { Source, Layer, Marker, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useRef } from "react";
import maplibregl from "maplibre-gl";
import { createScratLayer } from "./scratLayer";


// GeoServer-Basis-URL (lokales Netzwerk)
const GEOSERVER =
  "http://192.168.4.228:8080/geoserver/skiscope/ows?service=WMS&version=1.1.1&request=GetMap";

// API-Basis-URL (Backend)
const API_BASE = "http://192.168.4.228:8000";

// Hilfsfunktion: Erstellt ein Array mit 7 aufeinanderfolgenden Tagen ab startDatum
function generiereWoche(startDatum) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDatum);
    d.setDate(d.getDate() + i);

    return {
      datum: d.toISOString().split("T")[0], // ISO-Format für API-Aufrufe
      dayShort: i === 0 ? null : d.toLocaleDateString("de-CH", { weekday: "short" }).toUpperCase(),
      date: d.toLocaleDateString("de-CH", { day: "numeric", month: "short" }),
      icon: "❄️",
    };
  });
}

// MapLibre-Kartenstil: heller OpenStreetMap-Hintergrund (CartoCDN)
const OSM_STYLE = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

// Hilfsfunktion: Erstellt eine GeoServer-Tile-URL für einen bestimmten Layer
function geoserverTileUrl(layer, extraParams = "") {
  return `${GEOSERVER}&layers=skiscope:${layer}&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=application/vnd.mapbox-vector-tile${extraParams}`;
}

export const MainArea = ({ aktivDatum, setAktivDatum }) => {
  // Index des aktuell markierten Tages in der Wochenleiste
  const [activeDay, setActiveDay] = useState(0);

  // Steuert ob das Score-Dropdown offen ist
  const [scoreOpen, setScoreOpen] = useState(false);

  // Index der aktuell gewählten Score-Option
  const [selectedScore, setSelectedScore] = useState(0);

  // Koordinaten und station_id des zuletzt angeklickten Kartenmarkers
  const [selectedMarker, setSelectedMarker] = useState(null);

  // Detaildaten des angeklickten Skigebiets (aus Backend)
  const [tooltipData, setTooltipData] = useState(null);

  // Wetter
  const WMO_MAP = {
  0: { icon: "☀️", text: "Klar" },
  1: { icon: "🌤️", text: "Überwiegend klar" },
  2: { icon: "⛅", text: "Teilweise bewölkt" },
  3: { icon: "☁️", text: "Bedeckt" },

  45: { icon: "🌫️", text: "Nebel" },
  48: { icon: "🌫️", text: "Raureifnebel" },

  51: { icon: "🌦️", text: "Leichter Niesel" },
  53: { icon: "🌦️", text: "Niesel" },
  55: { icon: "🌧️", text: "Starker Niesel" },

  61: { icon: "🌧️", text: "Leichter Regen" },
  63: { icon: "🌧️", text: "Regen" },
  65: { icon: "🌧️", text: "Starker Regen" },

  71: { icon: "🌨️", text: "Leichter Schnee" },
  73: { icon: "🌨️", text: "Schnee" },
  75: { icon: "❄️", text: "Starker Schneefall" },

  80: { icon: "🌦️", text: "Regenschauer" },
  81: { icon: "🌧️", text: "Starke Schauer" },
  82: { icon: "⛈️", text: "Heftige Schauer" },

  95: { icon: "⛈️", text: "Gewitter" },
  96: { icon: "⛈️", text: "Gewitter mit Hagel" },
  99: { icon: "⛈️", text: "Starkes Gewitter" },
};

const [wetter, setWetter] = useState([]);


  // Woche 
  const DAYS = wetter.map((w, i) => {
    const d = new Date(w.tag);

    return {
      datum: w.tag,
      dayShort: i === 0
        ? "Heute"
        : d.toLocaleDateString("de-CH", { weekday: "short" }).toUpperCase(),
      date: d.toLocaleDateString("de-CH", { day: "numeric", month: "short" }),
    };
});

  // Alle Skigebiete (Name + Koordinaten) für die Karte
  const [skigebiete, setSkigebiete] = useState([]);

   // Scrat anzeigen wenn Karte geneigt ist
  const [showScrat, setShowScrat] = useState(false);
  const scratLayerRef = useRef(null);
  const scratAddedRef = useRef(false);
  const mapRef = useRef();


  
  // ── EFFEKTE ──────────────────────────────────────────────

  // Skigebiete einmalig beim Mounten laden
  useEffect(() => {
    fetch(`${API_BASE}/skigebiete`)
      .then((res) => res.json())
      .then((data) => setSkigebiete(data))
      .catch(console.error);
  }, []);

  // Beim ersten Render das heutige Datum als aktives Datum setzen
    useEffect(() => {
      if (wetter.length > 0) {
        setAktivDatum(wetter[0].tag);
      }
    }, [wetter]);

  // Sobald sich das aktive Datum ändert: Schneehöhen-Import prüfen
  useEffect(() => {
    if (!aktivDatum) return;

    fetch(`${API_BASE}/schnee?datum=${aktivDatum}`)
      .then((res) => res.json())
      .then((data) => console.log("Import geprüft:", data))
      .catch((err) => console.error("Fehler beim Import:", err));
  }, [aktivDatum]);


  // Wetterdaten laden
  useEffect(() => {
  fetch(`${API_BASE}/skigebiet/wetterprognose?station_id=2&type=woche`)
    .then(res => res.json())
    .then(data => setWetter(data))
    .catch(console.error);
}, []);

  // ── HANDLER ──────────────────────────────────────────────

  // Klick auf einen Tag in der Wochenleiste: UI und globales Datum aktualisieren
  const handleDayClick = (i) => {
    setActiveDay(i);
    setAktivDatum(DAYS[i].datum);
  };

  // Datum für den Schneelayer: liegt das gewählte Datum in der Zukunft,
  // wird stattdessen das heutige Datum verwendet (API hat noch keine Zukunftsdaten)
  const heuteISO = new Date().toISOString().split("T")[0];
  const safeDatum = aktivDatum > heuteISO ? heuteISO : aktivDatum;

  // Klick auf die Karte: Skigebiet-Feature ermitteln und Detaildaten laden
  const handleMapClick = async (e) => {
    const features = e.target.queryRenderedFeatures(e.point, {
      layers: ["skigebiete-points-layer"],
    });

    // Kein Skigebiet getroffen → Popup schliessen
    if (!features.length) {
      setSelectedMarker(null);
      setTooltipData(null);
      return;
    }

    const f = features[0];
    console.log("🗺️ Feature Properties:", f.properties);

    const station_id = Number(f.properties.neuneuneu_station_id);

    if (!station_id) {
      console.warn("⚠️ Keine station_id im Feature!");
      return;
    }

    // Marker-Position und ID merken
    setSelectedMarker({
      lng: e.lngLat.lng,
      lat: e.lngLat.lat,
      station_id,
    });

    // Detaildaten vom Backend laden
    try {
      const url = `${API_BASE}/skigebiet?station_id=${station_id}`;
      console.log("🔗 Fetch URL:", url);

      const name = f.properties.name || "Unbekanntes Skigebiet";
      const res = await fetch(url);
      const data = await res.json();
      console.log("📦 API Antwort:", data);

      if (data.error) {
        // Backend hat keinen Eintrag gefunden → Fehler im Popup anzeigen
        console.warn("⚠️ API Fehler:", data.error);
        setTooltipData({ _error: data.error, name });
      } else {
        setTooltipData(data);
      }
    } catch (err) {
      console.error("❌ Fetch Fehler:", err);
    }
  };

  // ── RENDER ───────────────────────────────────────────────

  return (
    <main className="main">
      {/* ── HEADER-BEREICH ─────────────────────────────── */}
      <div className="prognose-header">
        <div className="prognose-title">
          <h2>Wochen Prognose</h2>
          <p>Basierend auf aktuellen Echtzeit-Wetterdaten der Bergstationen.</p>
        </div>

        {/* Suchfeld für Skigebiete */}
        <div className="search-box">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#aaa"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Skigebiet suchen..." className="search-input" />
        </div>
      </div>

      {/* ── WOCHENLEISTE ───────────────────────────────── */}
      <div className="week" style={{ position: "relative" }}>
        {wetter.map((w, i) => {
          const d = new Date(w.tag);

          return (
            <div
              key={i}
              className={`day ${i === activeDay ? "active" : ""}`}
              onClick={() => {
                setActiveDay(i);
                setAktivDatum(w.tag);
              }}
            >
              <div className="day-label">
                {i === 0
                  ? "Heute"
                  : d.toLocaleDateString("de-CH", { weekday: "short" }).toUpperCase()}
              </div>

              <div className="day-date">
                {d.toLocaleDateString("de-CH", { day: "numeric", month: "short" })}
              </div>

              <div className="day-icon">
                {WMO_MAP[Math.round(w.daily_wetter_code_wmo)]?.icon || "❓"}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── EMPFEHLUNG-HEADER ──────────────────────────── */}
      <div className="empfehlung-header">
        <div className="empfehlung-title">
          <div className="empfehlung-title-bar"></div>
          <h3>Top Empfehlung für dich</h3>
        </div>
      </div>

      {/* ── KARTE ──────────────────────────────────────── */}
      <div className="map-container">
       <Map
        ref={mapRef}
        initialViewState={{ longitude: 8.3, latitude: 46.8, zoom: 8 }}
        maxZoom={19}
        maxPitch={85}
        style={{ width: "100%", height: "100%" }}
        mapStyle={OSM_STYLE}
        onClick={handleMapClick}
        onLoad={(e) => {
          const map = e.target;

          const layer = createScratLayer(map, 8.3, 46.8);

          scratLayerRef.current = layer;
          scratAddedRef.current = false;
        }}
        onMove={(e) => {
          const pitch = e.viewState.pitch || 0;

          const map = mapRef.current?.getMap?.();
          const layer = scratLayerRef.current;
          if (!map || !layer) return;

          const isVisible = pitch > 10;

          // hinzufügen
          if (isVisible && !scratAddedRef.current) {
            map.addLayer(layer);
            scratAddedRef.current = true;
          }

          // entfernen
          if (!isVisible && scratAddedRef.current) {
            if (map.getLayer(layer.id)) {
              map.removeLayer(layer.id);
            }
            scratAddedRef.current = false;
          }
        }}
        onMouseMove={(e) => {
          /* Dein bestehender Code für den Cursor-Pointer bleibt hier stehen */
          const features = e.target.queryRenderedFeatures(e.point, {
            layers: ["skigebiete-points-layer"],
          });
          e.target.getCanvas().style.cursor = features.length ? "pointer" : "";
        }}  
      >
          {/* Schneehöhen-Flächen (datumabhängig via safeDatum) */}
          <Source
            key={safeDatum}
            id="schnee"
            type="vector"
            tiles={[geoserverTileUrl("schneehoehen_datum", `&viewparams=datum:${safeDatum}`)]}
            tileSize={512}
          >
            <Layer
              id="schnee-layer"
              type="fill"
              source-layer="schneehoehen_datum"
              minzoom={0}
              maxzoom={13}
              paint={{
                "fill-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "value"],

                  1,   "#f7fbff",
                  20,  "#deebf7",
                  50,  "#c6dbef",
                  80,  "#9ecae1",
                  120, "#6baed6",
                  200, "#3182bd",
                  300, "#08519c",
                  400, "#08306b"
                ],
                "fill-opacity": 0.65,
                "fill-antialias": true
              }}
            />
          </Source>

          {/* Pisten-Polygone (blau/rot/schwarz nach Schwierigkeit) */}
          <Source
            id="pisten"
            type="vector"
            tiles={[geoserverTileUrl("Pisten_Polygone")]}
            tileSize={512}
          >
            <Layer
              id="pisten-fill"
              type="fill"
              source-layer="Pisten_Polygone"
              filter={["!=", ["get", "piste_difficulty"], "freeride"]}
              maxzoom={20}
              minzoom={13}
              paint={{
                "fill-color": [
                  "match",
                  ["get", "piste_difficulty"],
                  "easy",
                  "#0000FF", // blau
                  "intermediate",
                  "#FF0000", // rot
                  "advanced",
                  "#000000", // schwarz
                  "#CCCCCC", // default
                ],
                "fill-opacity": 0.4,
              }}
            />
          </Source>

          {/* Pisten-Linien (gleiche Farblogik wie Polygone) */}
          <Source
            id="pisten-linien"
            type="vector"
            tiles={[geoserverTileUrl("Pisten_Linien")]}
            tileSize={512}
          >
            <Layer
              id="pisten-linien-layer"
              type="line"
              source-layer="Pisten_Linien"
              filter={["!=", ["get", "piste_difficulty"], "freeride"]}
              maxzoom={20}
              minzoom={13}
              paint={{
                "line-width": 2,
                "line-color": [
                  "match",
                  ["get", "piste_difficulty"],
                  "easy",
                  "#0000FF",
                  "intermediate",
                  "#FF0000",
                  "advanced",
                  "#000000",
                  "#888888",
                ],
              }}
            />
          </Source>

          {/* Lifte/Bahnen-Polygone (grau, halbtransparent) */}
          <Source
            id="lifte"
            type="vector"
            tiles={[geoserverTileUrl("Lifte_Bahnen_Polygone")]}
            tileSize={512}
          >
            <Layer
              id="lifte-fill"
              type="fill"
              source-layer="Lifte_Bahnen_Polygone"
              maxzoom={20}
              minzoom={13}
              paint={{
                "fill-color": "grey",
                "fill-opacity": 0.4,
              }}
            />
          </Source>

          {/* Lifte/Bahnen-Linien mit gestricheltem Stil und Beschriftungen */}
          <Source
            id="lifte-linien"
            type="vector"
            tiles={[geoserverTileUrl("Lifte_Bahnen_Linien")]}
            tileSize={512}
          >
            {/* Gestrichelte Linien für alle Lifttypen ausser "goods" */}
            <Layer
              id="lifte-linien-layer"
              type="line"
              source-layer="Lifte_Bahnen_Linien"
              filter={["all", ["!=", ["get", "art"], "goods"]]}
              maxzoom={20}
              minzoom={13}
              paint={{
                "line-width": 2,
                "line-color": "grey",
                "line-dasharray": [1, 1],
              }}
            />

            {/* Beschriftungen entlang der Linien (ab Zoom 12) */}
            <Layer
              id="lifte-labels"
              type="symbol"
              source="lifte-linien"
              source-layer="Lifte_Bahnen_Linien"
              minzoom={12}
              filter={["all", ["!=", ["get", "art"], "goods"], ["!=", ["get", "art"], "transport"]]}
              layout={{
                "symbol-placement": "line",
                "symbol-spacing": 250,
                "text-field": [
                  "match",
                  ["get", "art"],
                  "gondola",
                  "Gondel",
                  "funicular",
                  "Standseilbahn",
                  "chair_lift",
                  "Sessellift",
                  "t-bar",
                  "Bügellift",
                  "platter",
                  "Tellerlift",
                  "rope_tow",
                  "Seillift",
                  "magic_carpet",
                  "Zauberteppich",
                  "zip_line",
                  "Zipline",
                  "cable_car",
                  "Seilbahn",
                  "", // Fallback: kein Text
                ],
                "text-size": 11,
                "text-anchor": "center",
                "text-rotation-alignment": "map",
                "text-allow-overlap": false,
              }}
              paint={{
                "text-color": "#2b2b2b",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.5,
              }}
            />
          </Source>

          {/* Skigebiet-Mittelpunkte als blaue Kreise */}
          <Source
            id="skigebiete-points"
            type="vector"
            tiles={[geoserverTileUrl("Skigebiete_Zentroide")]}
            tileSize={512}
          >
            <Layer
              id="skigebiete-points-layer"
              type="circle"
              source-layer="Skigebiete_Zentroide"
              paint={{
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 12, 8],
                "circle-color": "#2d6cdf",
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1.5,
              }}
            />
          </Source>

          {/* ── POPUP ────────────────────────────────────── */}
          {selectedMarker && tooltipData && (
            <Popup
              longitude={selectedMarker.lng}
              latitude={selectedMarker.lat}
              onClose={() => {
                setSelectedMarker(null);
                setTooltipData(null);
              }}
              closeOnClick={false}
              maxWidth="300px"
            >
              <div
                style={{
                  width: 272,
                  fontFamily: "'Inter', Arial, sans-serif",
                  padding: "4px 2px 0",
                }}
              >
                {/* Fehlerfall: Backend hat kein Skigebiet gefunden */}
                {tooltipData._error ? (
                  <div style={{ color: "#c0392b", fontSize: 12 }}>
                    ⚠️ Keine Daten für «{selectedMarker.name}»
                  </div>
                ) : (
                  <>
                    {/* Name und Chevron-Icon */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#1a1a2e",
                          letterSpacing: "-0.3px",
                          lineHeight: 1.2,
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        {tooltipData.name || selectedMarker.name}
                      </div>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2d6cdf"
                        strokeWidth="2.5"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>

                    {/* Status: provisorisch geöffnet */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        color: "#333",
                        marginBottom: 10,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#555"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Geöffnet provisorisch
                    </div>

                    {/* Lifte: offen / total */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        color: "#333",
                        marginBottom: 10,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#555"
                        strokeWidth="1.8"
                      >
                        <path d="M3 7h18M8 7V4m8 3V4M5 20l3-9m8 9-3-9" />
                      </svg>
                      {tooltipData.lifte_offen ?? "—"}/{tooltipData.lifte_total ?? "—"} Lifte
                    </div>

                    {/* Schneehöhe in cm */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        color: "#333",
                        marginBottom: 16,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#555"
                        strokeWidth="1.8"
                      >
                        <line x1="12" y1="2" x2="12" y2="22" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <line x1="5" y1="5" x2="19" y2="19" />
                        <line x1="19" y1="5" x2="5" y2="19" />
                      </svg>
                      {tooltipData.schnee ?? "—"} cm Schnee
                    </div>

                    {/* Pisten-Balken: blau / rot / schwarz mit km-Angaben */}
                    {(() => {
                      const blau = tooltipData.km_blau || 0;
                      const rot = tooltipData.km_rot || 0;
                      const schwarz = tooltipData.km_schwarz || 0;
                      const total = tooltipData.km_total || 0;
                      const barTotal = blau + rot + schwarz || 1; // Division durch 0 vermeiden

                      return (
                        <>
                          {/* Farbbalken proportional zu km-Anteil */}
                          <div
                            style={{
                              height: 10,
                              borderRadius: 5,
                              overflow: "hidden",
                              display: "flex",
                              marginBottom: 6,
                            }}
                          >
                            <div
                              style={{
                                width: `${(blau / barTotal) * 100}%`,
                                background: "#2d6cdf",
                              }}
                            />
                            <div
                              style={{
                                width: `${(rot / barTotal) * 100}%`,
                                background: "#e84040",
                              }}
                            />
                            <div
                              style={{
                                width: `${(schwarz / barTotal) * 100}%`,
                                background: "#1a1a2e",
                              }}
                            />
                          </div>

                          {/* km-Beschriftungen unter dem Balken */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              fontSize: 11,
                              color: "#888",
                              marginBottom: 14,
                            }}
                          >
                            <span>{blau} km</span>
                            <span>{rot} km</span>
                            <span>{schwarz} km</span>
                            <span
                              style={{
                                marginLeft: "auto",
                                fontWeight: 800,
                                fontSize: 13,
                                color: "#1a1a2e",
                              }}
                            >
                              {total} km
                            </span>
                          </div>
                        </>
                      );
                    })()}

                    {/* Popup-Fusszeile: Aktualisierungszeit und Lawinengefahr-Link */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid #f0f0f0",
                        paddingTop: 10,
                        fontSize: 11,
                        color: "#aaa",
                      }}
                    >
                      <span>Aktualisiert: 1 Std.</span>
                      {tooltipData.lawinengefahr_url ? (
                        <a
                          href={tooltipData.lawinengefahr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#2d6cdf",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          Lawinengefahr
                        </a>
                      ) : (
                        <span style={{ color: "#ccc" }}>Lawinengefahr</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* ── SCHNEEHÖHEN-LEGENDE ────────────────────────── */}
      <div className="legende">
        <div className="legende-title">❄️ Schneehöhe (cm)</div>

        {/* Farbskala mit Schwellenwerten */}
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          {[
            { value: "1", color: "#f7fbff" },
            { value: "20", color: "#deebf7", },
            { value: "50", color: "#c6dbef" },
            { value: "80", color: "#9ecae1" },
            { value: "120", color: "#6baed6" },
            { value: "200", color: "#3182bd" },
            { value: "300", color: "#08519c" },
            { value: "400+", color: "#08306b" },
          ].map((item) => (
            <div
              key={item.value}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 14,
                  borderRadius: 3,
                  background: item.color,
                  border: "1px solid #e0e6ef",
                }}
              />
              <span style={{ fontSize: 9, color: "#aaa" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};
