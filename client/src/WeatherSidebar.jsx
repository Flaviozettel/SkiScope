// ============================================================
// WeatherSidebar.jsx – Wetter-Sidebar links neben der Karte
//
// Zeigt die 7-Tages-Prognose für die aktuelle Wetterstation.
// Hover → Zeile wird höher und zeigt "Detailliertes Wetter"-Button
// (nur für die ersten 7 Tage). Klick auf den Button öffnet das
// WeatherDayDetail-Overlay (in MainArea über der Karte) und markiert
// die Zeile blau.
// ============================================================

import { useState } from "react";
import { WMO_MAP } from "./mapConfig.js";
import "./WeatherSidebar.css";

// "Detailliertes Wetter"-Button erscheint nur für die ersten 7 Tage
// (begrenzt durch das Stundendaten-Forecast-Fenster im Backend)
const DETAIL_DAYS = 7;

export const WeatherSidebar = ({
  wetter,
  wetterStation,
  setAktivDatum,
  detailTag,
  setDetailTag,
}) => {
  // UI-Zustand: über welcher Zeile schwebt die Maus
  const [hoveredDay, setHoveredDay] = useState(null);

  const openDetail = (w) => {
    setAktivDatum(w.tag);
    setDetailTag(w.tag);
  };

  return (
    <div className="weather-sidebar">
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
      {wetter.map((w, i) => {
        const d = new Date(w.tag);
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
