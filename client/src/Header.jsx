// ============================================================
// Header.jsx – Hero-Banner mit Apple-like Glassmorphism Design
// flyTo via WFS-Request direkt an GeoServer (keine Backend-Änderung nötig)
// ============================================================
import skiImage from "./data/Header_Berge.jpg";
import { useEffect, useState } from "react";

const GEOSERVER_WFS =
  "http://192.168.4.228:8080/geoserver/skiscope/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=skiscope:Skigebiete_Zentroide&outputFormat=application/json";

const API_BASE = "http://192.168.4.228:8000";

export const Header = ({ mapRef }) => {
  const [topSchnee, setTopSchnee] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/skigebiete/top-schnee`)
      .then((res) => res.json())
      .then((data) => setTopSchnee(data))
      .catch((err) => console.error(err));
  }, []);

  const handleSnowBadgeClick = async () => {
    if (!topSchnee?.station_id) return;

    try {
      const url = `${GEOSERVER_WFS}&CQL_FILTER=neuneuneu_station_id=${topSchnee.station_id}&SRSNAME=EPSG:4326`;
      const res = await fetch(url);
      const data = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates;

      if (coords) {
        // Debug: kurz loggen was wirklich kommt
        console.log("GeoServer coords:", coords);

        mapRef.current?.getMap?.()?.flyTo({
          center: [coords[0], coords[1]], // ← falls lon/lat korrekt
          // Falls vertauscht, stattdessen:
          // center: [coords[1], coords[0]],
          zoom: 16,
          duration: 1800,
          essential: true,
        });
      } else {
        console.warn("Keine Koordinaten für Station gefunden:", topSchnee.station_id);
      }
    } catch (err) {
      console.error("WFS-Fehler:", err);
    }
  };

  return (
    <header className="hero" style={{ backgroundImage: `url(${skiImage})` }}>
      {/* Gradient overlay für Tiefe */}
      <div className="hero-gradient" />
      <div className="hero-inner">
        {/* Logo – links */}
        <div className="logo-mark">
          <span className="logo-snowflake">❄</span>
          <span className="logo-text">SkiScope</span>
        </div>

        {/* Slogan – mittig */}
        <div className="hero-tagline">
          <span>Finde dein perfektes Skigebiet.</span>
        </div>

        <button className="hero-snow-badge" onClick={handleSnowBadgeClick} title="Auf Karte zoomen">
          <span className="snow-badge-week-icon">❄️</span>
          <div>
            <div className="snow-badge-week-label">Beste Schneehöhe</div>
            <div className="snow-badge-week-value">
              {topSchnee ? `${topSchnee.schnee_haupt} cm · ${topSchnee.station_name}` : "Lade…"}
            </div>
          </div>
          <svg
            className="snow-badge-week-arrow"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </header>
  );
};
