// ============================================================
// SkiMap.jsx – MapLibre-Karte mit allen Sources/Layers
//
// Enthält Legende, Hover- und Klick-Popups sowie alle
// Vector-Tile-Layer für Schnee, Pisten, Lifte und Skigebiete.
// ============================================================

import { useRef } from "react";
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

          map.addControl(new NavigationControl(), "top-right");

          setTimeout(() => {
            const compass = document.querySelector(".maplibregl-ctrl-compass");

            if (compass) {
              compass.addEventListener("click", (ev) => {
                ev.stopPropagation();

                map.easeTo({
                  bearing: 0,
                  pitch: 0,
                  duration: 800,
                });
              });
            }
          }, 0);

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
            {SCHNEE_LEGENDE.map((item) => (
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

        {/* Mini Hover Tooltip */}
        {hoverMarker && !selectedMarker && <MiniHoverPopup hoverMarker={hoverMarker} />}

        {/* Volles Popup nach Klick */}
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
