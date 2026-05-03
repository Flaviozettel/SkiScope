// ============================================================
// SkiMap.jsx – MapLibre-Karte mit allen Sources/Layers
// ============================================================

import { useRef, useEffect, useState, useMemo } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { NavigationControl } from "maplibre-gl";
import { createScratLayer } from "./scratLayer";
import {
  SWISSTOPO_STYLE,
  SWITZERLAND_BOUNDS,
  SCHNEE_LEGENDE,
  geoserverTileUrl,
} from "./mapConfig.js";
import { API_BASE } from "./config.js";
import { MiniHoverPopup } from "./MiniHoverPopup.jsx";
import { SkigebietPopup } from "./SkigebietPopup.jsx";
import "./SkiMap.css";

const SCHNEE_MAX_ZOOM = 13;
const PISTEN_MIN_ZOOM = 13;

export const SkiMap = ({
  mapRef,
  safeDatum,
  hoverMarker,
  setHoverMarker,
  selectedMarker,
  setSelectedMarker,
  tooltipData,
  setTooltipData,
  setWetterStation,
}) => {
  const scratLayerRef = useRef(null);
  const scratAddedRef = useRef(false);
  const nameMapRef = useRef({});
  const selectedRef = useRef(selectedMarker);

  const [skigebiete, setSkigebiete] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/skigebiete`)
      .then((res) => res.json())
      .then((data) => setSkigebiete(data))
      .catch((err) => console.error("Skigebiete Fetch fehlgeschlagen:", err));
  }, []);

  const nameMap = useMemo(() => {
    return Object.fromEntries(skigebiete.map((s) => [s.station_id, s.name]));
  }, [skigebiete]);

  useEffect(() => {
    nameMapRef.current = nameMap;
  }, [nameMap]);
  useEffect(() => {
    selectedRef.current = selectedMarker;
  }, [selectedMarker]);

  // ── Layer Visibility ───────────────────────────────────────
  // null = auto (zoom-abhängiger Default, nie manuell angefasst)
  // true/false = User-Entscheidung, überschreibt Zoom-Default
  const [userToggle, setUserToggle] = useState({
    schnee: null,
    pisten: null,
    lifte: null,
  });

  const zoomRef = useRef(7.5);
  const userToggleRef = useRef(userToggle);
  useEffect(() => {
    userToggleRef.current = userToggle;
  }, [userToggle]);

  // null → zoom-abhängiger Default; true/false → User-Entscheidung
  const calcEffective = (toggle, zoom) => ({
    schnee: toggle.schnee !== null ? toggle.schnee : zoom <= SCHNEE_MAX_ZOOM,
    pisten: toggle.pisten !== null ? toggle.pisten : zoom >= PISTEN_MIN_ZOOM,
    lifte: toggle.lifte !== null ? toggle.lifte : zoom >= PISTEN_MIN_ZOOM,
  });

  const applyLayerVisibility = (map, toggle, zoom) => {
    const v = (on) => (on ? "visible" : "none");
    const eff = calcEffective(toggle, zoom);
    const set = (id, on) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v(on));
    };
    set("schnee-layer", eff.schnee);
    set("pisten-fill", eff.pisten);
    set("pisten-linien-layer", eff.pisten);
    set("lifte-fill", eff.lifte);
    set("lifte-outline", eff.lifte);
    set("lifte-main", eff.lifte);
    set("lifte-labels", eff.lifte);
  };

  const toggleLayer = (key) => {
    setUserToggle((prev) => {
      const zoom = zoomRef.current;
      const currentEff = calcEffective(prev, zoom);
      const next = { ...prev, [key]: !currentEff[key] };
      const map = mapRef.current?.getMap?.();
      if (map) applyLayerVisibility(map, next, zoom);
      return next;
    });
  };

  // ── Hover ──────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const features = e.target.queryRenderedFeatures(e.point, {
      layers: ["skigebiete-points-layer"],
    });
    if (features.length) {
      e.target.getCanvas().style.cursor = "pointer";
      const f = features[0];
      const station_id = Number(f.properties.station_id);
      const name = nameMapRef.current[station_id] || "Unbekanntes Skigebiet";
      if (!selectedRef.current) {
        setHoverMarker((prev) =>
          prev?.name === name ? prev : { lng: e.lngLat.lng, lat: e.lngLat.lat, name },
        );
      }
    } else {
      e.target.getCanvas().style.cursor = "";
      if (!selectedRef.current) setHoverMarker(null);
    }
  };

  // ── Klick ──────────────────────────────────────────────────
  const handleMapClick = async (e) => {
    const features = e.target.queryRenderedFeatures(e.point, {
      layers: ["skigebiete-points-layer"],
    });
    if (!features.length) {
      setSelectedMarker(null);
      setTooltipData(null);
      setHoverMarker(null);
      return;
    }
    const f = features[0];
    const station_id = Number(f.properties.station_id);
    const name = nameMapRef.current[station_id] || "Unbekanntes Skigebiet";
    if (!station_id) return;

    setHoverMarker(null);
    setSelectedMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat, station_id });
    setTooltipData(null);

    const map = mapRef.current?.getMap?.();
    if (map) {
      const pistenFeatures = map.querySourceFeatures("pisten", {
        sourceLayer: "pisten_geom_multipolygon",
        filter: ["==", ["get", "station_id"], station_id],
      });
      if (pistenFeatures.length > 0) {
        let minLng = Infinity,
          minLat = Infinity;
        let maxLng = -Infinity,
          maxLat = -Infinity;
        pistenFeatures.forEach((feat) => {
          const coords = feat.geometry.coordinates.flat(3);
          for (let i = 0; i < coords.length; i += 2) {
            minLng = Math.min(minLng, coords[i]);
            maxLng = Math.max(maxLng, coords[i]);
            minLat = Math.min(minLat, coords[i + 1]);
            maxLat = Math.max(maxLat, coords[i + 1]);
          }
        });
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          {
            padding: 60,
            duration: 1000,
            maxZoom: 15,
          },
        );
      } else {
        map.easeTo({ center: [e.lngLat.lng, e.lngLat.lat], zoom: 13, duration: 1000 });
      }
    }

    try {
      const res = await fetch(`${API_BASE}/skigebiet?station_id=${station_id}`);
      const data = await res.json();
      setTooltipData(data.error ? { _error: data.error, name } : { ...data });
    } catch (err) {
      console.error("Fetch Fehler:", err);
      setTooltipData({ _error: "Fehler beim Laden", name });
    }
    setWetterStation({ station_id, name });
  };

  return (
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
          if (!selectedRef.current) setHoverMarker(null);
        }}
        onLoad={(e) => {
          const map = e.target;
          map.addControl(new NavigationControl(), "top-right");

          setTimeout(() => {
            const compass = document.querySelector(".maplibregl-ctrl-compass");
            if (compass) {
              compass.addEventListener("click", (ev) => {
                ev.stopPropagation();
                map.easeTo({ bearing: 0, pitch: 0, duration: 800 });
              });
            }
          }, 0);

          const layer = createScratLayer(map, 8.3, 46.8);
          scratLayerRef.current = layer;
          scratAddedRef.current = false;

          // Initiale Visibility setzen sobald Karte geladen
          applyLayerVisibility(map, userToggleRef.current, zoomRef.current);

          map.on("idle", () => {
            if (map.getLayer("skigebiete-points-layer")) {
              map.moveLayer("skigebiete-points-layer");
              if (map.getLayer("lifte-labels")) map.moveLayer("lifte-labels");
            }
          });
        }}
        onMove={(e) => {
          const currentZoom = e.viewState.zoom;
          zoomRef.current = currentZoom;
          const map = mapRef.current?.getMap?.();
          const layer = scratLayerRef.current;

          if (map) applyLayerVisibility(map, userToggleRef.current, currentZoom);

          if (!map || !layer) return;
          const pitch = e.viewState.pitch || 0;
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
            {SCHNEE_LEGENDE.map((item) => (
              <div key={item.value} className="legende-item">
                <div className="legende-color" style={{ background: item.color }} />
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Layer-Toggle */}
        <div className="layer-toggle-panel">
          <div className="legende-title">Kartenlayer</div>
          {[
            { key: "schnee", label: "Schneekarte", color: "#1f78c1" },
            { key: "pisten", label: "Pisten", color: "#e74c3c" },
            { key: "lifte", label: "Lifte & Bahnen", color: "#2b2b2b" },
          ].map(({ key, label, color }) => {
            const isOn = calcEffective(userToggle, zoomRef.current)[key];
            return (
              <div key={key} className="layer-toggle-row" onClick={() => toggleLayer(key)}>
                <div className="layer-toggle-left">
                  <div
                    className="layer-dot"
                    style={{ background: color, opacity: isOn ? 1 : 0.3 }}
                  />
                  <span style={{ opacity: isOn ? 1 : 0.45 }}>{label}</span>
                </div>
                <div className={`toggle-switch ${isOn ? "on" : ""}`}>
                  <div className="toggle-knob" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Standort */}
        <button
          className="location-button"
          onClick={() => {
            const map = mapRef.current?.getMap?.();
            if (!map) return;
            map.easeTo({
              center: [7.641925, 47.534909],
              zoom: 17,
              pitch: 0,
              bearing: 0,
              duration: 1200,
            });
          }}
        >
          📍
        </button>

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
          tiles={[geoserverTileUrl("pisten_geom_multipolygon")]}
          tileSize={512}
        >
          <Layer
            id="pisten-fill"
            type="fill"
            source-layer="pisten_geom_multipolygon"
            filter={["!=", ["get", "piste_difficulty"], "freeride"]}
            paint={{
              "fill-color": [
                "match",
                ["get", "farbe"],
                "blau",
                "#0000FF",
                "rot",
                "#FF0000",
                "schwarz",
                "#000000",
                "#CCCCCC",
              ],
              "fill-opacity": 0.4,
            }}
            layout={{}}
          />
        </Source>

        {/* Pisten Linien */}
        <Source
          id="pisten-linien"
          type="vector"
          tiles={[geoserverTileUrl("pisten_geom_multiline")]}
          tileSize={512}
        >
          <Layer
            id="pisten-linien-layer"
            type="line"
            source-layer="pisten_geom_multiline"
            filter={["!=", ["get", "piste_difficulty"], "freeride"]}
            paint={{
              "line-width": 4,
              "line-color": [
                "match",
                ["get", "farbe"],
                "blau",
                "#0000FF",
                "rot",
                "#FF0000",
                "schwarz",
                "#000000",
                "#888888",
              ],
            }}
            layout={{}}
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
            paint={{ "fill-color": "grey", "fill-opacity": 0.4 }}
            layout={{}}
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
            paint={{ "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.7 }}
            layout={{}}
          />
          <Layer
            id="lifte-main"
            type="line"
            source-layer="Lifte_Bahnen_Linien"
            paint={{ "line-color": "#111", "line-width": 3, "line-dasharray": [1, 1] }}
            layout={{}}
          />
          <Layer
            id="lifte-labels"
            type="symbol"
            source-layer="Lifte_Bahnen_Linien"
            filter={["all", ["!=", ["get", "art"], "goods"], ["!=", ["get", "art"], "transport"]]}
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
          tiles={[geoserverTileUrl("skigebiet_geom")]}
          tileSize={512}
        >
          <Layer
            id="skigebiete-points-layer"
            type="circle"
            source="skigebiete-points"
            source-layer="skigebiet_geom"
            paint={{
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 12, 8],
              "circle-color": "#2d6cdf",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
            }}
          />
        </Source>

        {hoverMarker && !selectedMarker && <MiniHoverPopup hoverMarker={hoverMarker} />}
        {selectedMarker && (
          <SkigebietPopup
            selectedMarker={selectedMarker}
            tooltipData={tooltipData}
            onClose={() => {
              setSelectedMarker(null);
              setTooltipData(null);
            }}
          />
        )}
      </Map>
    </div>
  );
};
