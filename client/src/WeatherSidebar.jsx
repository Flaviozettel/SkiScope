// Wetter-Sidebar links neben der Karte.
// Zeigt eine 14-Tages-Prognose. Hover auf eine Zeile blendet einen
// "Detailliertes Wetter"-Button ein (nur für die ersten 7 Tage,
// weil Open-Meteo darüber hinaus keine sauberen Stundendaten liefert).

import { useState } from "react";
import { WMO_MAP } from "./mapConfig.js";
import "./WeatherSidebar.css";

// Detail-Button erscheint nur für die ersten N Tage (Backend-Limit).
const DETAIL_DAYS = 7;

export const WeatherSidebar = ({
  wetter,
  wetterStation,
  setAktivDatum,
  detailTag,
  setDetailTag,
}) => {
  // Über welcher Zeile schwebt die Maus gerade?
  const [hoveredDay, setHoveredDay] = useState(null);

  // Klick auf den Detail-Button: Datum setzen + Overlay anzeigen.
  const openDetail = (w) => {
    setAktivDatum(w.tag);
    setDetailTag(w.tag);
  };

  return (
    <div className="weather-sidebar">
      {/* Header mit Stations-Name */}
      <div className="weather-sidebar-title">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <span className="weather-sidebar-name">{wetterStation?.name || "Prognose"}</span>
      </div>

      {/* Eine Zeile pro Tag */}
      {wetter.map((w, i) => {
        const d = new Date(w.tag);
        // Wetter-Code (WMO) → Icon + Text aus der lokalen Mapping-Tabelle
        const icon = WMO_MAP[Math.round(w.daily_wetter_code_wmo)];
        const isActive = detailTag === w.tag;
        const isHovered = hoveredDay === i;
        const detailAvailable = i < DETAIL_DAYS;
        const showDetailButton = isHovered && detailAvailable;
        return (
          <div
            key={i}
            className={`weather-row ${isActive ? "active" : ""} ${showDetailButton ? "expanded" : ""}`}
            onMouseEnter={() => setHoveredDay(i)}
            onMouseLeave={() => setHoveredDay(null)}
          >
            <div className="weather-row-main">
              <span className="weather-row-icon">{icon?.icon || "❓"}</span>
              <div className="weather-row-info">
                <span className="weather-row-day">
                  {/* Erster Tag ist immer "Heute", die anderen Wochentag-Kurz */}
                  {i === 0 ? "Heute" : d.toLocaleDateString("de-CH", { weekday: "short" })}
                </span>
                <span className="weather-row-desc">{icon?.text || "—"}</span>
              </div>
              {w.daily_temperature_2m_max != null && (
                <div className="weather-row-temp">
                  <span className="weather-row-temp-max">
                    {Math.round(w.daily_temperature_2m_max)}°
                  </span>
                  {w.daily_temperature_2m_min != null && (
                    <>
                      <span className="weather-row-temp-sep">/</span>
                      <span className="weather-row-temp-min">
                        {Math.round(w.daily_temperature_2m_min)}°
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            {showDetailButton && (
              <button
                type="button"
                className="weather-row-detail-btn"
                onClick={() => openDetail(w)}
              >
                Detailliertes Wetter
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
