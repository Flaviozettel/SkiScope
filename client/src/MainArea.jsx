// Hauptbereich der App: beinhaltet Wetter-Sidebar links, Karte (oder Detailansicht) rechts.
// Hält selbst keinen State, reicht alles von App.jsx durch.

import { WeatherSidebar } from "./WeatherSidebar.jsx";
import { SkiMap } from "./SkiMap.jsx";
import { WeatherDayDetail } from "./WeatherDayDetail.jsx";
import { SkigebietDetail } from "./SkigebietDetail.jsx";
import "./MainArea.css";

// --- Props: --------------------------------------------------------------------------------------
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
  detailTag,
  setDetailTag,
  detailStationId,
  setDetailStationId,
}) => {
  // Wetterdaten enden heute, aus der Sidebar darf trotzdem ein zukünftiges
  // Datum reinkommen. Wir klemmen es auf "heute" damit nichts kaputt geht.
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
          detailTag={detailTag}
          setDetailTag={setDetailTag}
        />
        <div className="map-overlay-host">
          {/* Wenn ein Skigebiet "voll" geöffnet wurde → Detailansicht
              statt Übersichtskarte zeigen */}
          {detailStationId ? (
            <SkigebietDetail
              key={detailStationId}
              stationId={detailStationId}
              safeDatum={safeDatum}
              setWetterStation={setWetterStation}
              onBack={() => setDetailStationId(null)}
              onOpenDetail={(id) => setDetailStationId(id)}
            />
          ) : (
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
              onOpenDetail={(id) => setDetailStationId(id)}
            />
          )}
          {/* Overlay für die Wetter-Detail-Ansicht eines einzelnen Tages.
              Liegt absolut positioniert über der Karte/Detailansicht. */}
          {detailTag && (
            <WeatherDayDetail
              tag={detailTag}
              station={wetterStation}
              onClose={() => setDetailTag(null)}
            />
          )}
        </div>
      </div>
    </main>
  );
};
