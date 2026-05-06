// ============================================================
// mapConfig.js – Konstanten und Helper für die MapLibre-Karte
// ============================================================

import { GEOSERVER } from "./config.js";

export const SWISSTOPO_STYLE = {
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

export function geoserverTileUrl(layer, extraParams = "") {
  return `${GEOSERVER}&layers=skiscope:${layer}&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=application/vnd.mapbox-vector-tile${extraParams}`;
}

export const WMO_MAP = {
  0: { icon: "☀️", text: "Klar" },
  1: { icon: "🌤️", text: "Überwiegend klar" },
  2: { icon: "⛅", text: "Teilweise bewölkt" },
  3: { icon: "☁️", text: "Bedeckt" },
  45: { icon: "🌫️", text: "Nebel" },
  48: { icon: "🌫️", text: "Raureifnebel" },
  51: { icon: "🌦️", text: "Leichter Niesel" },
  53: { icon: "🌦️", text: "Niesel" },
  55: { icon: "🌦️", text: "Starker Niesel" },
  61: { icon: "🌧️", text: "Leichter Regen" },
  63: { icon: "🌧️", text: "Regen" },
  65: { icon: "🌧️", text: "Starker Regen" },
  71: { icon: "🌨️", text: "Leichter Schnee" },
  73: { icon: "🌨️", text: "Schnee" },
  75: { icon: "❄️", text: "Starker Schneefall" },
  80: { icon: "🌦️", text: "Regenschauer" },
  81: { icon: "🌧️", text: "Starke Schauer" },
  82: { icon: "⛈️", text: "Heftige Schauer" },
  85: { icon: "🌨️", text: "Schneeschauer" },
  95: { icon: "⛈️", text: "Gewitter" },
  96: { icon: "⛈️", text: "Gewitter mit Hagel" },
  99: { icon: "⛈️", text: "Starkes Gewitter" },
};

export const SWITZERLAND_BOUNDS = [
  [4.7, 45.0],
  [12.1, 48.8],
];

export const SCHNEE_LEGENDE = [
  { value: "1", color: "#d6e6f5" },
  { value: "20", color: "#b3d1ea" },
  { value: "50", color: "#80b8e0" },
  { value: "80", color: "#4da0d6" },
  { value: "120", color: "#1f78c1" },
  { value: "200", color: "#0f5aa6" },
  { value: "300", color: "#083d7a" },
  { value: "400+", color: "#041f4a" },
];
