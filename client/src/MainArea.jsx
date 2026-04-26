// ============================================================
// MainArea.jsx
// Hover → Mini-Tooltip (nur Name, kein Button)
// Klick auf Punkt → sofort volles Glas-Popup
// Klick auf leere Fläche → alles schliessen
// ============================================================

import { useState, useEffect, useRef } from "react";
import Map, { Source, Layer, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { createScratLayer } from "./scratLayer";

const GEOSERVER =
  "http://192.168.4.228:8080/geoserver/skiscope/ows?service=WMS&version=1.1.1&request=GetMap";
const API_BASE = "http://192.168.4.228:8000";

const SWISSTOPO_STYLE = {
  version: 8,
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    swisstopo: {
      type: "raster",
      tiles: [
        "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg",
      ],
      tileSize: 256,
      attribution: "© swisstopo",
    },
  },
  layers: [{ id: "swisstopo", type: "raster", source: "swisstopo" }],
};

function geoserverTileUrl(layer, extraParams = "") {
  return `${GEOSERVER}&layers=skiscope:${layer}&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=application/vnd.mapbox-vector-tile${extraParams}`;
}

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

const SWITZERLAND_BOUNDS = [
  [4.7, 45.0],
  [12.1, 48.8],
];

export const MainArea = ({ mapRef, aktivDatum, setAktivDatum }) => {
  const [activeDay, setActiveDay] = useState(0);

  // Mini-Tooltip beim Hover (nur Name)
  const [hoverMarker, setHoverMarker] = useState(null); // { lng, lat, name }

  // Volles Popup nach Klick
  const [selectedMarker, setSelectedMarker] = useState(null); // { lng, lat, station_id }
  const [tooltipData, setTooltipData] = useState(null);

  const [wetter, setWetter] = useState([]);
  const scratLayerRef = useRef(null);
  const scratAddedRef = useRef(false);
  const [wetterStation, setWetterStation] = useState(null);
  const [topSchnee, setTopSchnee] = useState(null);

  useEffect(() => {
    if (!wetterStation?.station_id) return;
    fetch(`${API_BASE}/skigebiet/wetterprognose?station_id=${wetterStation.station_id}&type=woche`)
      .then((r) => r.json())
      .then((data) => setWetter(data))
      .catch(console.error);
  }, [wetterStation?.station_id]);

  useEffect(() => {
    if (wetter.length > 0) setAktivDatum(wetter[0].tag);
  }, [wetter]);

  useEffect(() => {
    fetch(`${API_BASE}/skigebiete/top-schnee`)
      .then((r) => r.json())
      .then((data) => {
        setTopSchnee(data);
        setWetterStation({ station_id: data.station_id, name: data.station_name });
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!aktivDatum) return;
    fetch(`${API_BASE}/schnee?datum=${aktivDatum}`)
      .then((r) => r.json())
      .then((d) => console.log("Import geprüft:", d))
      .catch(console.error);
  }, [aktivDatum]);

  const heuteISO = new Date().toISOString().split("T")[0];
  const safeDatum = aktivDatum > heuteISO ? heuteISO : aktivDatum;

  // Hover → nur Name anzeigen
  const handleMouseMove = (e) => {
    const features = e.target.queryRenderedFeatures(e.point, {
      layers: ["skigebiete-points-layer"],
    });

    if (features.length) {
      e.target.getCanvas().style.cursor = "pointer";
      const f = features[0];
      const name = f.properties.name || "Unbekanntes Skigebiet";
      // Kein Hover-Tooltip wenn volles Popup bereits offen
      if (!selectedMarker) {
        setHoverMarker((prev) =>
          prev?.name === name ? prev : { lng: e.lngLat.lng, lat: e.lngLat.lat, name },
        );
      }
    } else {
      e.target.getCanvas().style.cursor = "";
      if (!selectedMarker) setHoverMarker(null);
    }
  };

  // Klick auf Punkt → sofort volles Popup laden
  const handleMapClick = async (e) => {
    const features = e.target.queryRenderedFeatures(e.point, {
      layers: ["skigebiete-points-layer"],
    });

    if (!features.length) {
      // Klick auf leere Fläche → alles schliessen
      setSelectedMarker(null);
      setTooltipData(null);
      setHoverMarker(null);
      return;
    }

    const f = features[0];
    const station_id = Number(f.properties.neuneuneu_station_id);
    const name = f.properties.name || "Unbekanntes Skigebiet";
    if (!station_id) return;

    // Hover-Tooltip sofort ausblenden, volles Popup zeigen
    setHoverMarker(null);
    setSelectedMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat, station_id });
    setTooltipData(null); // kurz null → Ladeindikator

    try {
      const res = await fetch(`${API_BASE}/skigebiet?station_id=${station_id}`);
      const data = await res.json();
      setTooltipData(data.error ? { _error: data.error, name } : { ...data, name });
    } catch (err) {
      console.error("Fetch Fehler:", err);
      setTooltipData({ _error: "Fehler beim Laden", name });
    }

    setWetterStation({ station_id, name });
  };

  return (
    <main className="main">
      <div className="week"></div>
      <div className="map-weather-wrapper">
        {/* Wetter-Sidebar */}
        <div className="weather-sidebar">
          <div className="weather-sidebar-title">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            {wetterStation?.name || "Prognose"}
          </div>
          {wetter.map((w, i) => {
            const d = new Date(w.tag);
            const icon = WMO_MAP[Math.round(w.daily_wetter_code_wmo)];
            return (
              <div
                key={i}
                className={`weather-row ${i === activeDay ? "active" : ""}`}
                onClick={() => {
                  setActiveDay(i);
                  setAktivDatum(w.tag);
                }}
              >
                <span className="weather-row-icon">{icon?.icon || "❓"}</span>
                <div className="weather-row-info">
                  <span className="weather-row-day">
                    {i === 0 ? "Heute" : d.toLocaleDateString("de-CH", { weekday: "short" })}
                  </span>
                  <span className="weather-row-desc">{icon?.text || "—"}</span>
                </div>
                {w.daily_temperature_2m_max != null && (
                  <span className="weather-row-temp">
                    {Math.round(w.daily_temperature_2m_max)}°
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Karte */}
        <div className="map-container">
          <Map
            ref={mapRef}
            initialViewState={{ longitude: 8.3, latitude: 46.8, zoom: 7.5 }}
            maxZoom={19}
            minZoom={3}
            maxPitch={85}
            maxBounds={SWITZERLAND_BOUNDS}
            style={{ width: "100%", height: "100%" }}
            mapStyle={SWISSTOPO_STYLE}
            onClick={handleMapClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              if (!selectedMarker) setHoverMarker(null);
            }}
            onLoad={(e) => {
              const map = e.target;
              const layer = createScratLayer(map, 8.3, 46.8);
              scratLayerRef.current = layer;
              scratAddedRef.current = false;
              map.on("idle", () => {
                if (map.getLayer("skigebiete-points-layer")) {
                  map.moveLayer("skigebiete-points-layer");
                  map.moveLayer("lifte-labels");
                }
              });
            }}
            onMove={(e) => {
              const pitch = e.viewState.pitch || 0;
              const map = mapRef.current?.getMap?.();
              const layer = scratLayerRef.current;
              if (!map || !layer) return;
              const isVisible = pitch > 10;
              if (isVisible && !scratAddedRef.current) {
                map.addLayer(layer);
                scratAddedRef.current = true;
              }
              if (!isVisible && scratAddedRef.current) {
                if (map.getLayer(layer.id)) map.removeLayer(layer.id);
                scratAddedRef.current = false;
              }
            }}
          >
            {/* Legende */}
            <div className="map-legende">
              <div className="legende-title">❄️ Schneehöhe (cm)</div>
              <div className="legende-scale">
                {[
                  { value: "1", color: "#d6e6f5" },
                  { value: "20", color: "#b3d1ea" },
                  { value: "50", color: "#80b8e0" },
                  { value: "80", color: "#4da0d6" },
                  { value: "120", color: "#1f78c1" },
                  { value: "200", color: "#0f5aa6" },
                  { value: "300", color: "#083d7a" },
                  { value: "400+", color: "#041f4a" },
                ].map((item) => (
                  <div key={item.value} className="legende-item">
                    <div className="legende-color" style={{ background: item.color }} />
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schneehöhen */}
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
                    1,
                    "#d6e6f5",
                    20,
                    "#b3d1ea",
                    50,
                    "#80b8e0",
                    80,
                    "#4da0d6",
                    120,
                    "#1f78c1",
                    200,
                    "#0f5aa6",
                    300,
                    "#083d7a",
                    400,
                    "#041f4a",
                  ],
                  "fill-opacity": 0.35,
                  "fill-antialias": true,
                }}
                layout={{ "fill-sort-key": ["get", "value"] }}
              />
            </Source>

            {/* Pisten Polygone */}
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
                    "#0000FF",
                    "intermediate",
                    "#FF0000",
                    "advanced",
                    "#000000",
                    "#CCCCCC",
                  ],
                  "fill-opacity": 0.4,
                }}
              />
            </Source>

            {/* Pisten Linien */}
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

            {/* Lifte Polygone */}
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
                paint={{ "fill-color": "grey", "fill-opacity": 0.4 }}
              />
            </Source>

            {/* Lifte Linien */}
            <Source
              id="lifte-linien"
              type="vector"
              tiles={[geoserverTileUrl("Lifte_Bahnen_Linien")]}
              tileSize={512}
            >
              <Layer
                id="lifte-outline"
                type="line"
                source-layer="Lifte_Bahnen_Linien"
                minzoom={13}
                paint={{ "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.7 }}
              />
              <Layer
                id="lifte-main"
                type="line"
                source-layer="Lifte_Bahnen_Linien"
                minzoom={13}
                paint={{ "line-color": "#111", "line-width": 3, "line-dasharray": [1, 1] }}
              />
              <Layer
                id="lifte-labels"
                type="symbol"
                source-layer="Lifte_Bahnen_Linien"
                minzoom={13}
                filter={[
                  "all",
                  ["!=", ["get", "art"], "goods"],
                  ["!=", ["get", "art"], "transport"],
                ]}
                layout={{
                  "symbol-placement": "line",
                  "symbol-spacing": 250,
                  "text-font": ["Open Sans Regular"],
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
                    "",
                  ],
                  "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 13],
                }}
                paint={{
                  "text-color": "#2b2b2b",
                  "text-halo-color": "#ffffff",
                  "text-halo-width": 1.5,
                }}
              />
            </Source>

            {/* Skigebiet-Punkte */}
            <Source
              id="skigebiete-points"
              type="vector"
              tiles={[geoserverTileUrl("Skigebiete_Zentroide")]}
              tileSize={512}
            >
              <Layer
                id="skigebiete-points-layer"
                type="circle"
                source="skigebiete-points"
                source-layer="Skigebiete_Zentroide"
                paint={{
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 12, 8],
                  "circle-color": "#2d6cdf",
                  "circle-stroke-color": "#ffffff",
                  "circle-stroke-width": 1.5,
                }}
              />
            </Source>

            {/* ── MINI HOVER TOOLTIP (nur Name) ──────────────── */}
            {hoverMarker && !selectedMarker && (
              <Popup
                longitude={hoverMarker.lng}
                latitude={hoverMarker.lat}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={14}
                maxWidth="280px"
              >
                <div className="popup-mini">
                  <div className="popup-mini-dot" />
                  <span className="popup-mini-name">{hoverMarker.name}</span>
                </div>
              </Popup>
            )}

            {/* ── VOLLES POPUP nach Klick ─────────────────────── */}
            {selectedMarker && (
              <Popup
                longitude={selectedMarker.lng}
                latitude={selectedMarker.lat}
                onClose={() => {
                  setSelectedMarker(null);
                  setTooltipData(null);
                }}
                closeOnClick={false}
                anchor="bottom"
                offset={14}
                maxWidth="300px"
              >
                <div className="popup-glass">
                  {/* Ladeindikator */}
                  {!tooltipData && (
                    <div className="popup-loading">
                      <div className="popup-loading-spinner" />
                      <span>Lade Daten…</span>
                    </div>
                  )}

                  {tooltipData?._error && (
                    <div style={{ color: "#c0392b", fontSize: 12 }}>
                      ⚠️ Keine Daten für dieses Skigebiet
                    </div>
                  )}

                  {tooltipData && !tooltipData._error && (
                    <>
                      <div className="popup-header">
                        <div className="popup-name">{tooltipData.name || "—"}</div>
                      </div>

                      <div className="popup-row">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#888"
                          strokeWidth="1.8"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Geöffnet provisorisch</span>
                      </div>

                      <div className="popup-row">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#888"
                          strokeWidth="1.8"
                        >
                          <path d="M3 7h18M8 7V4m8 3V4M5 20l3-9m8 9-3-9" />
                        </svg>
                        <span>
                          {tooltipData.lifte_offen ?? "—"}/{tooltipData.lifte_total ?? "—"} Lifte
                        </span>
                      </div>

                      <div className="popup-row">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#888"
                          strokeWidth="1.8"
                        >
                          <line x1="12" y1="2" x2="12" y2="22" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <line x1="5" y1="5" x2="19" y2="19" />
                          <line x1="19" y1="5" x2="5" y2="19" />
                        </svg>
                        <span>{tooltipData.schnee ?? "—"} cm Schnee</span>
                      </div>

                      {(() => {
                        const blau = tooltipData.km_blau || 0;
                        const rot = tooltipData.km_rot || 0;
                        const schwarz = tooltipData.km_schwarz || 0;
                        const total = tooltipData.km_total || 0;
                        const barTotal = blau + rot + schwarz || 1;
                        return (
                          <>
                            <div className="popup-pisten-bar">
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
                            <div className="popup-pisten-labels">
                              <span>{blau} km</span>
                              <span>{rot} km</span>
                              <span>{schwarz} km</span>
                              <span className="popup-total">{total} km</span>
                            </div>
                          </>
                        );
                      })()}

                      <div className="popup-footer">
                        <span>Aktualisiert: 1 Std.</span>
                        {tooltipData.lawinengefahr_url ? (
                          <a
                            href={tooltipData.lawinengefahr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="popup-lawine-link"
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
      </div>
    </main>
  );
};
