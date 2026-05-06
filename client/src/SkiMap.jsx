// SkiMap.jsx
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
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

const DUMMY = true; // ← auf true setzen für Februar-Schneekarte
const DUMMY_DATUM = "2025-01-25";

const SCHNEE_MAX_ZOOM = 13;
const PISTEN_MIN_ZOOM = 13;
const HIT = 8;

const BLAU_OFFEN = "#2d6cdf";
const BLAU_HOVER = "#5b8ee8";
const GRAU_ZU = "#9ca3af";
const GRAU_ZU_STROKE = "#4b5563";

const buildPaint = (offeneIds, hoveredId, selectedId) => {
  const hasOffen = offeneIds.length > 0;
  const isOffen = hasOffen ? ["in", ["get", "station_id"], ["literal", offeneIds]] : false;

  const hov = hoveredId ?? -1;
  const sel = selectedId ?? -1;

  const baseColor = hasOffen ? ["case", isOffen, BLAU_OFFEN, GRAU_ZU] : GRAU_ZU;

  const circleColor = [
    "case",
    ["==", ["get", "station_id"], hov],
    hasOffen ? ["case", isOffen, BLAU_HOVER, "#d1d5db"] : "#d1d5db",
    baseColor,
  ];

  const baseStroke = hasOffen ? ["case", isOffen, "#1a4fa0", GRAU_ZU_STROKE] : GRAU_ZU_STROKE;

  const strokeColor = [
    "case",
    ["==", ["get", "station_id"], sel],
    "#ffffff",
    ["==", ["get", "station_id"], hov],
    "#ffffff",
    baseStroke,
  ];

  const strokeWidth = [
    "case",
    ["==", ["get", "station_id"], sel],
    3,
    ["==", ["get", "station_id"], hov],
    2.5,
    hasOffen ? ["case", isOffen, 2, 1.5] : 1.5,
  ];

  // Immer gleiche Ausdrucks-Struktur — kein Ausdruck-Wechsel beim Hover-Ende
  const radius = [
    "interpolate",
    ["linear"],
    ["zoom"],
    7,
    ["case", ["any", ["==", ["get", "station_id"], hov], ["==", ["get", "station_id"], sel]], 8, 4],
    12,
    [
      "case",
      ["any", ["==", ["get", "station_id"], hov], ["==", ["get", "station_id"], sel]],
      12,
      8,
    ],
  ];

  const opacity = hasOffen ? ["case", isOffen, 1, 0.8] : 0.8;

  return {
    "circle-radius": radius,
    "circle-color": circleColor,
    "circle-stroke-color": strokeColor,
    "circle-stroke-width": strokeWidth,
    "circle-opacity": opacity,
  };
};

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
  initialBbox = null,
  initialLayers = null,
  onOpenDetail = null,
}) => {
  const scratLayerRef = useRef(null);
  const scratAddedRef = useRef(false);
  const nameMapRef = useRef({});
  const selectedRef = useRef(selectedMarker);
  const layerOrderDone = useRef(false);
  const paintReadyRef = useRef(false);

  const hoveredIdRef = useRef(null);
  const selectedIdRef = useRef(null);
  const offeneIdsRef = useRef([]);

  const [skigebiete, setSkigebiete] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/skigebiete`)
      .then((r) => r.json())
      .then((data) => {
        setSkigebiete(data);
        const ids = data.filter((s) => s.lifte_offen > 0).map((s) => s.station_id);
        offeneIdsRef.current = ids;
        if (paintReadyRef.current) {
          applyPaint(hoveredIdRef.current, selectedIdRef.current);
        }
      })
      .catch(console.error);
  }, []);

  const nameMap = useMemo(
    () => Object.fromEntries(skigebiete.map((s) => [s.station_id, s.name])),
    [skigebiete],
  );
  useEffect(() => {
    nameMapRef.current = nameMap;
  }, [nameMap]);
  useEffect(() => {
    selectedRef.current = selectedMarker;
  }, [selectedMarker]);

  const applyPaint = useCallback(
    (hovId, selId) => {
      const map = mapRef.current?.getMap?.();
      if (!map || !map.getLayer("skigebiete-points-layer")) return;
      const paint = buildPaint(offeneIdsRef.current, hovId, selId);
      Object.entries(paint).forEach(([prop, val]) => {
        map.setPaintProperty("skigebiete-points-layer", prop, val);
      });
    },
    [mapRef],
  );

  const [userToggle, setUserToggle] = useState(
    initialLayers ?? { schnee: null, pisten: null, lifte: null },
  );
  const [currentZoom, setCurrentZoom] = useState(7.5);
  const zoomRef = useRef(7.5);
  const userToggleRef = useRef(userToggle);
  useEffect(() => {
    userToggleRef.current = userToggle;
  }, [userToggle]);

  const calcEffective = (t, z) => ({
    schnee: t.schnee !== null ? t.schnee : z <= SCHNEE_MAX_ZOOM,
    pisten: t.pisten !== null ? t.pisten : z >= PISTEN_MIN_ZOOM,
    lifte: t.lifte !== null ? t.lifte : z >= PISTEN_MIN_ZOOM,
  });

  const applyLayerVisibility = (map, t, z) => {
    const e = calcEffective(t, z);
    const s = (id, on) =>
      map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    s("schnee-layer", e.schnee);
    s("pisten-fill", e.pisten);
    s("pisten-linien-layer", e.pisten);
    s("lifte-fill", e.lifte);
    s("lifte-outline", e.lifte);
    s("lifte-main", e.lifte);
    s("lifte-labels", e.lifte);
  };

  const toggleLayer = (key) => {
    setUserToggle((prev) => {
      const next = { ...prev, [key]: !calcEffective(prev, zoomRef.current)[key] };
      const map = mapRef.current?.getMap?.();
      if (map) applyLayerVisibility(map, next, zoomRef.current);
      return next;
    });
  };

  const hitTest = (map, point) =>
    map.queryRenderedFeatures(
      [
        [point.x - HIT, point.y - HIT],
        [point.x + HIT, point.y + HIT],
      ],
      { layers: ["skigebiete-points-layer"] },
    );

  const handleMouseMove = (e) => {
    const map = e.target;
    const features = hitTest(map, e.point);
    if (!features.length) {
      map.getCanvas().style.cursor = "";
      if (hoveredIdRef.current !== null) {
        hoveredIdRef.current = null;
        applyPaint(null, selectedIdRef.current);
      }
      if (!selectedRef.current) setHoverMarker(null);
      return;
    }
    map.getCanvas().style.cursor = "pointer";
    const id = Number(features[0].properties.station_id);
    const name = nameMapRef.current[id] || "Unbekanntes Skigebiet";
    if (hoveredIdRef.current !== id) {
      hoveredIdRef.current = id;
      applyPaint(id, selectedIdRef.current);
    }
    if (!selectedRef.current) {
      setHoverMarker((prev) =>
        prev?.name === name ? prev : { lng: e.lngLat.lng, lat: e.lngLat.lat, name },
      );
    }
  };

  const handleMapClick = async (e) => {
    const map = e.target;
    const features = hitTest(map, e.point);
    if (!features.length) {
      hoveredIdRef.current = null;
      selectedIdRef.current = null;
      applyPaint(null, null);
      setSelectedMarker(null);
      setTooltipData(null);
      setHoverMarker(null);
      return;
    }
    const id = Number(features[0].properties.station_id);
    const name = nameMapRef.current[id] || "Unbekanntes Skigebiet";
    if (!id) return;

    hoveredIdRef.current = null;
    selectedIdRef.current = id;
    applyPaint(null, id);
    setHoverMarker(null);
    setSelectedMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat, station_id: id });
    setTooltipData(null);

    const gl = mapRef.current?.getMap?.();
    if (gl) {
      const pf = gl.querySourceFeatures("pisten", {
        sourceLayer: "pisten_geom_multipolygon",
        filter: ["==", ["get", "station_id"], id],
      });
      if (pf.length > 0) {
        let minLng = Infinity,
          minLat = Infinity,
          maxLng = -Infinity,
          maxLat = -Infinity;
        pf.forEach((f) => {
          const c = f.geometry.coordinates.flat(3);
          for (let i = 0; i < c.length; i += 2) {
            minLng = Math.min(minLng, c[i]);
            maxLng = Math.max(maxLng, c[i]);
            minLat = Math.min(minLat, c[i + 1]);
            maxLat = Math.max(maxLat, c[i + 1]);
          }
        });
        gl.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 60, duration: 1000, maxZoom: 15 },
        );
      } else {
        gl.easeTo({ center: [e.lngLat.lng, e.lngLat.lat], zoom: 13, duration: 1000 });
      }
    }

    try {
      const res = await fetch(`${API_BASE}/skigebiet?station_id=${id}`);
      const data = await res.json();
      setTooltipData(data.error ? { _error: data.error, name } : { ...data });
    } catch {
      setTooltipData({ _error: "Fehler beim Laden", name });
    }
    setWetterStation({ station_id: id, name });
  };

  const initialPaint = useMemo(() => buildPaint([], null, null), []);

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
          if (hoveredIdRef.current !== null) {
            hoveredIdRef.current = null;
            applyPaint(null, selectedIdRef.current);
          }
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
          layerOrderDone.current = false;
          paintReadyRef.current = false;

          applyLayerVisibility(map, userToggleRef.current, currentZoom);

          if (initialBbox && initialBbox.length === 4) {
            map.fitBounds(
              [
                [initialBbox[0], initialBbox[1]],
                [initialBbox[2], initialBbox[3]],
              ],
              { padding: 40, duration: 0, maxZoom: 15 },
            );
          }

          const onSourceData = (ev) => {
            if (
              ev.sourceId === "skigebiete-points" &&
              ev.isSourceLoaded &&
              map.getLayer("skigebiete-points-layer")
            ) {
              paintReadyRef.current = true;
              applyPaint(hoveredIdRef.current, selectedIdRef.current);
              map.off("sourcedata", onSourceData);
            }
          };
          map.on("sourcedata", onSourceData);

          const onIdle = () => {
            if (layerOrderDone.current) return;
            if (map.getLayer("skigebiete-points-layer")) {
              map.moveLayer("skigebiete-points-layer");
              if (map.getLayer("lifte-labels")) map.moveLayer("lifte-labels");
              layerOrderDone.current = true;
              map.off("idle", onIdle);
            }
          };
          map.on("idle", onIdle);
        }}
        onMove={(e) => {
          const z = e.viewState.zoom;
          zoomRef.current = z;
          setCurrentZoom(z);
          const map = mapRef.current?.getMap?.();
          if (map) applyLayerVisibility(map, userToggleRef.current, z);
          const layer = scratLayerRef.current;
          if (!map || !layer) return;
          const visible = (e.viewState.pitch || 0) > 10;
          if (visible && !scratAddedRef.current) {
            map.addLayer(layer);
            scratAddedRef.current = true;
          }
          if (!visible && scratAddedRef.current) {
            if (map.getLayer(layer.id)) map.removeLayer(layer.id);
            scratAddedRef.current = false;
          }
        }}
      >
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

        <div className="layer-toggle-panel">
          <div className="legende-title">Kartenlayer</div>
          {[
            { key: "schnee", label: "Schneekarte", color: "#1f78c1" },
            { key: "pisten", label: "Pisten", color: "#e74c3c" },
            { key: "lifte", label: "Lifte & Bahnen", color: "#2b2b2b" },
          ].map(({ key, label, color }) => {
            const isOn = calcEffective(userToggle, currentZoom)[key];
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

        <Source
          key={DUMMY ? DUMMY_DATUM : safeDatum}
          id="schnee"
          type="vector"
          tiles={[
            geoserverTileUrl(
              "schneehoehen_datum",
              `&viewparams=datum:${DUMMY ? DUMMY_DATUM : safeDatum}`,
            ),
          ]}
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
              "fill-opacity": 0.6,
              "fill-antialias": true,
            }}
            layout={{ "fill-sort-key": ["get", "value"] }}
          />
        </Source>

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
          />
        </Source>

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
          />
        </Source>

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
          />
        </Source>

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
          />
          <Layer
            id="lifte-main"
            type="line"
            source-layer="Lifte_Bahnen_Linien"
            paint={{ "line-color": "#111", "line-width": 3, "line-dasharray": [1, 1] }}
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
            paint={initialPaint}
          />
        </Source>

        {hoverMarker && !selectedMarker && <MiniHoverPopup hoverMarker={hoverMarker} />}
        {selectedMarker && (
          <SkigebietPopup
            selectedMarker={selectedMarker}
            tooltipData={tooltipData}
            onClose={() => {
              selectedIdRef.current = null;
              applyPaint(null, null);
              setSelectedMarker(null);
              setTooltipData(null);
            }}
            onOpenDetail={onOpenDetail}
          />
        )}
      </Map>
    </div>
  );
};
