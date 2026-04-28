// ============================================================
// MainArea.jsx – Hauptbereich mit Wetter-Sidebar und Karte
//
// Reine Kompositions-Komponente. State und Datenbeschaffung
// liegen in App.jsx und werden hier nur durchgereicht.
// ============================================================

import { WeatherSidebar } from "./WeatherSidebar.jsx";
import { SkiMap } from "./SkiMap.jsx";
import "./MainArea.css";

export const MainArea = ({
  mapRef,
  aktivDatum,
  setAktivDatum,
  wetter,
  wetterStation,
  setWetterStation,
  hoverMarker,
  setHoverMarker,
  selectedMarker,
  setSelectedMarker,
  tooltipData,
  setTooltipData,
}) => {
  const heuteISO = new Date().toISOString().split("T")[0];
  const safeDatum = aktivDatum > heuteISO ? heuteISO : aktivDatum;

  return (
    <main className="main">
      <div className="week"></div>
      <div className="map-weather-wrapper">
        <WeatherSidebar
          wetter={wetter}
          wetterStation={wetterStation}
          setAktivDatum={setAktivDatum}
        />
        <SkiMap
          mapRef={mapRef}
          safeDatum={safeDatum}
          hoverMarker={hoverMarker}
          setHoverMarker={setHoverMarker}
          selectedMarker={selectedMarker}
          setSelectedMarker={setSelectedMarker}
          tooltipData={tooltipData}
          setTooltipData={setTooltipData}
          setWetterStation={setWetterStation}
        />
      </div>
    </main>
  );
};
