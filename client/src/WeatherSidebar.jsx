// ============================================================
// WeatherSidebar.jsx – Wetter-Sidebar links neben der Karte
//
// Zeigt die 7-Tages-Prognose für die aktuelle Wetterstation.
// Klick auf eine Zeile setzt das aktive Datum.
// ============================================================

import { useState } from "react";
import { WMO_MAP } from "./mapConfig.js";
import "./WeatherSidebar.css";

export const WeatherSidebar = ({ wetter, wetterStation, setAktivDatum }) => {
  // UI-Zustand: welche Zeile ist aktuell hervorgehoben
  const [activeDay, setActiveDay] = useState(0);

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
        {wetterStation?.name || "Prognose"}
      </div>
      {wetter.map((w, i) => {
        const d = new Date(w.tag);
        const icon = WMO_MAP[Math.round(w.daily_wetter_code_wmo)];
        return (
          <div
            key={i}
            className={`weather-row ${i === activeDay ? "active" : ""}`}
            onClick={() => {
              setActiveDay(i);
              setAktivDatum(w.tag);
            }}
          >
            <span className="weather-row-icon">{icon?.icon || "❓"}</span>
            <div className="weather-row-info">
              <span className="weather-row-day">
                {i === 0 ? "Heute" : d.toLocaleDateString("de-CH", { weekday: "short" })}
              </span>
              <span className="weather-row-desc">{icon?.text || "—"}</span>
            </div>
            {w.daily_temperature_2m_max != null && (
              <span className="weather-row-temp">{Math.round(w.daily_temperature_2m_max)}°</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
