// Header-Bar mit Logo, Suchfeld und Snow-Badge.
// Lädt einmalig alle Skigebiete (nur Name + Lift-Status) für die Suche.

import { useState, useRef, useEffect } from "react";
import skiImage from "./data/Header_Berge.jpg";
import { GEOSERVER_WFS } from "./config.js";
import { API_BASE } from "./config.js";
import "./Header.css";

export const Header = ({ mapRef, topSchnee }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false); // prüft ob Dropdown sichtbar
  const [skigebiete, setSkigebiete] = useState([]); // alle für Suche
  const inputRef = useRef(null);
  const debounceRef = useRef(null); // setTimeout-Handle für Suche
  const [nurOffen, setNurOffen] = useState(false); // Filter "Nur geöffnete"

  // Skigebiet-Liste einmalig holen.
  // Name und lifte_offen pro Skigebiet.
  useEffect(() => {
    fetch(`${API_BASE}/skigebiete`)
      .then((r) => r.json())
      .then(setSkigebiete)
      .catch(console.error);
  }, []);

  // Sucht in der lokalen Liste, geht nicht auf den Server.
  const handleSearch = (value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const lower = value.toLowerCase();
      const filtered = skigebiete
        .filter((s) => s.name.toLowerCase().includes(lower))
        .filter((s) => !nurOffen || s.lifte_offen > 0)
        .slice(0, 6); // max 6 Treffer, damit das Dropdown nicht explodiert
      setResults(filtered);
      setOpen(filtered.length > 0);
    }, 150); // 150ms warten nach der letzten Eingabe, bevor gefiltert wird
  };

  // Wenn der "Nur geöffnete"-Filter umgeschaltet wird, wird
  // die aktuelle Suche neu gefiltert.
  useEffect(() => {
    if (!query.trim()) return;
    const lower = query.toLowerCase();
    const filtered = skigebiete
      .filter((s) => s.name.toLowerCase().includes(lower))
      .filter((s) => !nurOffen || s.lifte_offen > 0)
      .slice(0, 6);
    setResults(filtered);
    setOpen(filtered.length > 0);
  }, [nurOffen]);

  // Klick auf einen Suchtreffer: Karte zoomt auf das Skigebiet.
  // Wir holen die Koordinaten via WFS direkt vom GeoServer (kein Backend-Endpunkt nötig).
  const handleSelect = async (skigebiet) => {
    setQuery(skigebiet.name);
    setOpen(false);
    inputRef.current?.blur();

    const map = mapRef.current?.getMap?.();
    if (!map) return;

    try {
      const url = `${GEOSERVER_WFS}&CQL_FILTER=station_id=${skigebiet.station_id}&SRSNAME=EPSG:4326`; // WFS-Request für das Skigebiet mit station_id = skigebiet.station_id
      const res = await fetch(url);
      const data = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (coords) {
        map.flyTo({ center: [coords[0], coords[1]], zoom: 13, duration: 1400, essential: true });
      }
    } catch (err) {
      console.error("WFS-Fehler:", err);
    }
  };

  // Snow-Badge im Header → zoomt auf das Skigebiet mit der höchsten Schneehöhe.
  // Selbe WFS-Logik wie bei der Suche, einfach mit der topSchnee-ID.
  const handleSnowBadgeClick = async () => {
    if (!topSchnee?.station_id) return;
    try {
      const url = `${GEOSERVER_WFS}&CQL_FILTER=station_id=${topSchnee.station_id}&SRSNAME=EPSG:4326`;
      const res = await fetch(url);
      const data = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (coords) {
        mapRef.current?.getMap?.()?.flyTo({
          center: [coords[0], coords[1]],
          zoom: 15,
          duration: 1800,
          essential: true,
        });
      }
    } catch (err) {
      console.error("WFS-Fehler:", err);
    }
  };

  return (
    <header className="hero" style={{ backgroundImage: `url(${skiImage})` }}>
      <div className="hero-gradient" />
      <div className="hero-inner">
        {/* Snow-Badge – links */}
        <button className="hero-snow-badge" onClick={handleSnowBadgeClick} title="Auf Karte zoomen">
          <span className="snow-badge-week-icon">❄️</span>
          <div>
            <div className="snow-badge-week-label">Maximale Schneehöhe</div>
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

        {/* Logo – mitte */}
        <div className="logo-mark">
          <span className="logo-snowflake">❄</span>
          <span className="logo-text">SkiScope</span>
        </div>

        {/* Suchfeld – rechts */}
        <div className="hero-search-wrapper">
          <input
            ref={inputRef}
            className="hero-search-input"
            type="text"
            placeholder="Skigebiet suchen…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            // Kleiner Delay damit der Klick auf ein Resultat noch durchkommt,
            // bevor das Dropdown beim Blur verschwindet.
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoComplete="off"
          />
          <svg
            className="hero-search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          {/* Filter-Toggle */}
          <div className="hero-search-right">
            <button
              className={`hero-search-filter ${nurOffen ? "active" : ""}`}
              // onMouseDown statt onClick + preventDefault: sonst klaut der Button
              // dem Suchfeld den Fokus und das Dropdown schliesst kurz auf.
              onMouseDown={(e) => {
                e.preventDefault();
                setNurOffen((v) => !v);
              }}
              title="Nur geöffnete Skigebiete"
            >
              Nur geöffnete
            </button>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ opacity: 0.6, flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          {open && (
            <ul className="hero-search-results">
              {results.map((s) => (
                <li
                  key={s.station_id}
                  className="hero-search-result-item"
                  // onMouseDown statt onClick (siehe Filter oben)
                  onMouseDown={() => handleSelect(s)}
                >
                  <span className={`hero-result-status ${s.lifte_offen > 0 ? "offen" : "zu"}`} />
                  {s.name}
                  {s.lifte_offen > 0 && (
                    <span className="hero-result-lifte">{s.lifte_offen} Lifte</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
};
