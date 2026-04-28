// ============================================================
// App.jsx – Wurzelkomponente der SkiScope-Anwendung
//
// Hält den globalen Anwendungs-State (Datum, Wetter, Marker,
// Tooltip-Daten, Top-Schnee-Skigebiet) und reicht ihn an die
// Kindkomponenten Header und MainArea weiter.
// ============================================================

import { useEffect, useRef, useState } from "react";
import "./App.css";
import { API_BASE } from "./config.js";
import { Header } from "./Header.jsx";
import { MainArea } from "./MainArea.jsx";
import { Footer } from "./Footer.jsx";

export function App() {
  const mapRef = useRef();

  // Aktuell ausgewähltes Datum (ISO-String, z.B. "2026-01-15")
  const [aktivDatum, setAktivDatum] = useState(null);

  // Skigebiet mit aktuell höchster Schneehöhe (für Header-Badge und initiale Wetter-Sidebar)
  const [topSchnee, setTopSchnee] = useState(null);

  // Aktuell gewählte Wetterstation (entweder topSchnee oder zuletzt geklicktes Skigebiet)
  const [wetterStation, setWetterStation] = useState(null);

  // 7-Tages-Wetterprognose für die aktuelle Wetterstation
  const [wetter, setWetter] = useState([]);

  // Mini-Tooltip beim Hover über Skigebiet-Punkt
  const [hoverMarker, setHoverMarker] = useState(null);

  // Volles Popup nach Klick auf Skigebiet-Punkt
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);

  // Top-Schnee einmalig laden, daraus auch initiale Wetterstation ableiten
  useEffect(() => {
    fetch(`${API_BASE}/skigebiete/top-schnee`)
      .then((r) => r.json())
      .then((data) => {
        setTopSchnee(data);
        setWetterStation({ station_id: data.station_id, name: data.station_name });
      })
      .catch(console.error);
  }, []);

  // Wetterprognose neu laden, sobald sich die Wetterstation ändert
  useEffect(() => {
    if (!wetterStation?.station_id) return;
    fetch(`${API_BASE}/skigebiet/wetterprognose?station_id=${wetterStation.station_id}&type=woche`)
      .then((r) => r.json())
      .then((data) => setWetter(data))
      .catch(console.error);
  }, [wetterStation?.station_id]);

  // Beim Laden neuer Wetterdaten: aktiv-Datum auf den ersten Tag setzen
  useEffect(() => {
    if (wetter.length > 0) setAktivDatum(wetter[0].tag);
  }, [wetter]);

  // Debug: Schnee-Datensatz für aktives Datum prüfen
  useEffect(() => {
    if (!aktivDatum) return;
    fetch(`${API_BASE}/schnee?datum=${aktivDatum}`)
      .then((r) => r.json())
      .then((d) => console.log("Import geprüft:", d))
      .catch(console.error);
  }, [aktivDatum]);

  return (
    <div className="app">
      <Header mapRef={mapRef} topSchnee={topSchnee} />

      <div className="page-card">
        <MainArea
          mapRef={mapRef}
          aktivDatum={aktivDatum}
          setAktivDatum={setAktivDatum}
          wetter={wetter}
          wetterStation={wetterStation}
          setWetterStation={setWetterStation}
          hoverMarker={hoverMarker}
          setHoverMarker={setHoverMarker}
          selectedMarker={selectedMarker}
          setSelectedMarker={setSelectedMarker}
          tooltipData={tooltipData}
          setTooltipData={setTooltipData}
        />
      </div>

      <Footer />
    </div>
  );
}
