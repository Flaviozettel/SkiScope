import { useState, useEffect } from "react"; // React Hooks
import Map, { Source, Layer, Marker, Popup } from "react-map-gl/maplibre"; // MapLibre Komponenten
import "maplibre-gl/dist/maplibre-gl.css"; // Map Styles

// Dropdown Optionen
const SCORE_OPTIONS = ["SkiScope SCORE", "Schneehöhe", "Pistenkilometer"];

// Funktion: erstellt 7 Tage ab Startdatum
function generiereWoche(startDatum) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDatum);
    d.setDate(d.getDate() + i); // jeden Tag erhöhen

    return {
      datum: d.toISOString().split("T")[0], // ISO Datum für API
      dayShort: i === 0 ? null : d.toLocaleDateString("de-CH", { weekday: "short" }).toUpperCase(), // Wochentag
      date: d.toLocaleDateString("de-CH", { day: "numeric", month: "short" }), // Anzeige Datum
      icon: "❄️", // Icon
    };
  });
}

// OpenStreetMap Raster Style
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

// Hauptkomponente
export const MainArea = ({ aktivDatum, setAktivDatum }) => {
  // States
  const [activeDay, setActiveDay] = useState(0); // ausgewählter Tag
  const [scoreOpen, setScoreOpen] = useState(false); // Dropdown offen?
  const [selectedScore, setSelectedScore] = useState(0); // gewählter Score
  const [selectedMarker, setSelectedMarker] = useState(null); // aktiver Marker

  // Startdatum bestimmen
  const startDatum = new Date(); // IMMER heute
  const DAYS = generiereWoche(startDatum); // Woche generieren

  //Skigebiete
  const [skigebiete, setSkigebiete] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/skigebiete")
      .then((res) => res.json())
      .then((data) => setSkigebiete(data))
      .catch(console.error);
  }, []);

  // Beim Start → erstes Datum setzen
  useEffect(() => {
    setAktivDatum(DAYS[0].datum);
  }, []);

  useEffect(() => {
    if (!aktivDatum) return;

    fetch(`http://localhost:8000/schnee?datum=${aktivDatum}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Import geprüft:", data);
      })
      .catch((err) => console.error("Fehler beim Import:", err));
  }, [aktivDatum]);

  // Klick auf Tag
  const handleDayClick = (i) => {
    setActiveDay(i); // UI aktualisieren
    setAktivDatum(DAYS[i].datum); // Datum setzen
  };

  // HEUTE als Referenz
  const heuteISO = new Date().toISOString().split("T")[0];

  // falls Zukunft → letztes verfügbares Datum verwenden
  const safeDatum = aktivDatum > heuteISO ? heuteISO : aktivDatum;

  return (
    <main className="main">
      {/* Header Bereich */}
      <div className="prognose-header">
        <div className="prognose-title">
          <h2>Wochen Prognose</h2>
          <p>Basierend auf aktuellen Echtzeit-Wetterdaten der Bergstationen.</p>
        </div>

        {/* Suchfeld */}
        <div className="search-box">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#aaa"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" /> {/* Lupe Kreis */}
            <path d="m21 21-4.35-4.35" /> {/* Lupe Griff */}
          </svg>
          <input type="text" placeholder="Skigebiet suchen..." className="search-input" />
        </div>
      </div>

      {/* Wochenleiste */}
      <div className="week" style={{ position: "relative" }}>
        {DAYS.map((d, i) => (
          <div
            key={i}
            className={`day ${i === activeDay ? "active" : ""}`} // aktiver Tag
            onClick={() => handleDayClick(i)} // Klick
          >
            <div className="day-label">{i === 0 ? "Heute" : d.dayShort}</div>
            <div className="day-date">{d.date}</div>
            <div className="day-icon">{d.icon}</div>
          </div>
        ))}
      </div>

      {/* Top Empfehlung */}
      <div className="empfehlung-header">
        <div className="empfehlung-title">
          <div className="empfehlung-title-bar"></div>
          <h3>Top Empfehlung für dich</h3>
        </div>

        {/* Dropdown Steuerung */}
        <div className="empfehlung-controls">
          <span className="empfohlen-label">Empfohlen nach:</span>

          <div className="score-dropdown-wrapper">
            <button
              className={`skiscope-score-btn ${scoreOpen ? "open" : ""}`}
              onClick={() => setScoreOpen((v) => !v)}
            >
              {SCORE_OPTIONS[selectedScore]} {/* aktueller Wert */}
              <svg
                className={`dropdown-chevron ${scoreOpen ? "rotated" : ""}`}
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2d6cdf"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* Dropdown Optionen */}
            {scoreOpen && (
              <div className="score-dropdown">
                {SCORE_OPTIONS.map((opt, i) => (
                  <div
                    key={i}
                    className={`score-option ${i === selectedScore ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedScore(i);
                      setScoreOpen(false);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Karte */}
      <div className="map-container">
        <Map
          initialViewState={{ longitude: 8.3, latitude: 46.8, zoom: 8 }} // Startposition
          minZoom={7}
          maxZoom={20}
          style={{ width: "100%", height: "100%" }}
          mapStyle={OSM_STYLE}
        >
          {/* Schneehöhen Layer */}
          <Source
            key={safeDatum}
            id="schnee"
            type="vector"
            tiles={[
              `http://192.168.4.228:8080/geoserver/skiscope/ows?service=WMS&version=1.1.1&request=GetMap&layers=skiscope:schneehoehen_datum&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=application/vnd.mapbox-vector-tile&viewparams=datum:${safeDatum}`,
            ]}
            tileSize={512}
          >
            <Layer
              id="schnee-layer"
              type="fill"
              source-layer="schneehoehen_datum"
              minzoom={0}
              maxzoom={13}
              paint={{
                "fill-color": ["get", "fill"],
                "fill-opacity": 0.35,
                "fill-antialias": true,
              }}
            />
          </Source>

          {/* Pisten-Polygone Layer */}
          <Source
            id="pisten"
            type="vector"
            tiles={[
              `http://192.168.4.228:8080/geoserver/skiscope/ows?service=WMS&version=1.1.1&request=GetMap&layers=skiscope:Pisten_Polygone&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=application/vnd.mapbox-vector-tile`,
            ]}
            tileSize={512}
          >
            <Layer
              id="pisten-fill"
              type="fill"
              source-layer="Pisten_Polygone"
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
                  "freeride",
                  "#FFD700", // gelb
                  "#CCCCCC", // default
                ],
                "fill-opacity": 0.4,
              }}
            />
          </Source>

          {/* Pisten Linien Layer */}
          <Source
            id="pisten-linien"
            type="vector"
            tiles={[
              `http://192.168.4.228:8080/geoserver/skiscope/ows?service=WMS&version=1.1.1&request=GetMap&layers=skiscope:Pisten_Linien&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=application/vnd.mapbox-vector-tile`,
            ]}
            tileSize={512}
          >
            <Layer
              id="pisten-linien-layer"
              type="line"
              source-layer="Pisten_Linien"
              paint={{
                "line-width": 2,
                "line-color": [
                  "match",
                  ["get", "piste_difficulty"],
                  "easy",
                  "#0000FF", // Blau
                  "intermediate",
                  "#FF0000", // Rot
                  "advanced",
                  "#000000", // Schwarz
                  "freeride",
                  "#FFD700", // Gelb
                  "#888888", // Default
                ],
              }}
            />
          </Source>

          {/* Lifte-Bahnen-Polygone Layer */}
          <Source
            id="lifte"
            type="vector"
            tiles={[
              `http://192.168.4.228:8080/geoserver/skiscope/ows?service=WMS&version=1.1.1&request=GetMap&layers=skiscope:Lifte_Bahnen_Polygone&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=application/vnd.mapbox-vector-tile`,
            ]}
            tileSize={512}
          >
            <Layer
              id="lifte-fill"
              type="fill"
              source-layer="Lifte_Bahnen_Polygone"
              paint={{
                "fill-color": "grey",
                "fill-opacity": 0.4,
              }}
            />
          </Source>

          {/* Lifte-Bahnen-Linien Layer */}
          <Source
            id="lifte-linien"
            type="vector"
            tiles={[
              `http://192.168.4.228:8080/geoserver/skiscope/ows?service=WMS&version=1.1.1&request=GetMap&layers=skiscope:Lifte_Bahnen_Linien&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=application/vnd.mapbox-vector-tile`,
            ]}
            tileSize={512}
          >
            <Layer
              id="lifte-linien-layer"
              type="line"
              source-layer="Lifte_Bahnen_Linien"
              filter={["all", ["!=", ["get", "art"], "goods"]]}
              paint={{
                "line-width": 2,
                "line-color": "grey",
                "line-dasharray": [1, 1],
              }}
            />
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

                  "", // fallback
                ],

                "text-size": 11,
                "text-anchor": "center",
                "text-rotation-alignment": "map",
                "symbol-spacing": 250,
                "text-allow-overlap": false,
              }}
              paint={{
                "text-color": "#2b2b2b",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.5,
              }}
            />
          </Source>

          {/* Marker */}
          {skigebiete.map((g, i) => (
            <Marker
              key={i}
              longitude={g.lon}
              latitude={g.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedMarker(g);
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#2d6cdf",
                  border: "2px solid white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  cursor: "pointer",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => (e.target.style.transform = "scale(1.2)")}
                onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
              />
            </Marker>
          ))}

          {/* Popup */}
          {selectedMarker && (
            <Popup
              longitude={selectedMarker.lng}
              latitude={selectedMarker.lat}
              anchor="bottom"
              onClose={() => setSelectedMarker(null)}
              closeOnClick={false}
            >
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <strong>{selectedMarker.p.Skigebiet}</strong>
                <br />
                ❄️ Schnee: {selectedMarker.p.Schneezustand ?? "unbekannt"}
                <br />
                🌡️ {selectedMarker.p.Temperature}°C
                <br />
                🎿 {selectedMarker.p.PisteKm} km
                <br />
                🚡 {selectedMarker.p.Lifte} Lifte
              </div>
            </Popup>
          )}
        </Map>
      </div>
      {/* Legende */}
      <div className="legende">
        <div className="legende-title">❄️ Schneehöhe (cm)</div>

        {/* Farbskala */}
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          {[
            { value: "1", color: "#CDFFCD" },
            { value: "20", color: "#99F0B2" },
            { value: "50", color: "#53BD9F" },
            { value: "80", color: "#3296B4" },
            { value: "120", color: "#0670B0" },
            { value: "200", color: "#054F8C" },
            { value: "300+", color: "#610432" },
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
