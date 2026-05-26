// App.jsx ist die Wurzelkomponente
// Hält den ganzen globalen UI-State (Datum, Wetter, Marker, Tooltips, ...)
// und reicht ihn an Header und MainArea durch.

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

  // Skigebiet mit der aktuell höchsten Schneehöhe. Für den Header.
  const [topSchnee, setTopSchnee] = useState(null);

  // Aktuell gewählte Wetterstation (topSchnee ODER zuletzt geklicktes Skigebiet)
  const [wetterStation, setWetterStation] = useState(null);

  // 14-Tages-Wetterprognose für die aktuelle Wetterstation
  const [wetter, setWetter] = useState([]);

  // Mini-Tooltip beim Hover über einen Skigebiet-Punkt
  const [hoverMarker, setHoverMarker] = useState(null);

  // Volles Popup nach Klick auf einen Skigebiet-Punkt
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);

  // ISO-Tag, dessen Wetter-Detail-Overlay gerade offen ist (null = keines offen)
  const [detailTag, setDetailTag] = useState(null);

  // station_id, dessen Detail-Ansicht statt der Karte gerendert wird
  const [detailStationId, setDetailStationId] = useState(null);

  // --- beim App-Start :-----------------------------------------------------------------------------

  // Beim ersten Laden den Schneehöhen-Import anstossen. /schnee triggert im
  // Backend auto_importiere_letzte_woche().
  useEffect(() => {
    fetch(`${API_BASE}/schnee`).catch(console.error);
  }, []);

  // Top-Schnee einmal laden (für "Maximale Schneehöhe" im Header)
  useEffect(() => {
    fetch(`${API_BASE}/skigebiete/top-schnee`)
      .then((r) => r.json())
      .then(setTopSchnee)
      .catch(console.error);
  }, []);

  // Initiales Wetter laden. Fallback-Standort = Muttenz (FHNW), weil wir
  // die Browser-Geolocation hier nicht abfragen. Geht über unser Backend
  // (Endpunkt /wetter), damit der Browser nicht direkt auf Open-Meteo
  // zugreifen muss – das ist von einer LAN-Origin aus CORS-blockiert.
  useEffect(() => {
    const lat = 47.534909;
    const lon = 7.641925;
    fetch(`${API_BASE}/wetter?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((days) => {
        setWetter(days);
        // Default-Anzeige in der Sidebar, bevor ein Skigebiet gewählt wird
        setWetterStation((prev) => prev ?? { name: "Aktueller Standort" });
      })
      .catch(console.error);
  }, []);

  // --- Reaktionen auf State-Wechsel ---

  // Sobald sich die Wetterstation ändert: Prognose aus dem Backend nachladen
  useEffect(() => {
    if (!wetterStation?.station_id) return;
    fetch(`${API_BASE}/skigebiet/wetterprognose?station_id=${wetterStation.station_id}&type=woche`)
      .then((r) => r.json())
      .then((data) => setWetter(data))
      .catch(console.error);
  }, [wetterStation?.station_id]);

  // Neue Wetterdaten → Aktiv-Datum auf den ersten Tag setzen
  useEffect(() => {
    if (wetter.length > 0) setAktivDatum(wetter[0].tag);
  }, [wetter]);

  // Stations-Wechsel schliesst eventuell offenes Wetter-Detail-Overlay
  useEffect(() => {
    setDetailTag(null);
  }, [wetterStation?.station_id]);

  // --- UI-Rendering ---
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
          detailTag={detailTag}
          setDetailTag={setDetailTag}
          detailStationId={detailStationId}
          setDetailStationId={setDetailStationId}
        />
      </div>

      <Footer />
    </div>
  );
}
