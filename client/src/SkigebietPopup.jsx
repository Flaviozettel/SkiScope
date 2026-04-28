// ============================================================
// SkigebietPopup.jsx – Volles Glas-Popup nach Klick auf Skigebiet
//
// Zeigt Detaildaten zum gewählten Skigebiet (Lifte, Schnee,
// Pisten-Anteile, Lawinengefahr-Link).
// ============================================================

import { Popup } from "react-map-gl/maplibre";
import "./SkigebietPopup.css";

export const SkigebietPopup = ({ selectedMarker, tooltipData, onClose }) => {
  // Hilfsfunktion: Zeit seit letztem Update in lesbarer Form

  const parseDbTimestamp = (ts) => {
    if (!ts) return null;

    // Mikrosekunden auf Millisekunden kürzen + TZ fixen
    const cleaned = ts
      .replace(/\.(\d{3})\d+/, ".$1") // 760692 → 760
      .replace(/([+-]\d{2})$/, "$1:00"); // +02 → +02:00

    return new Date(cleaned);
  };

  const formatTimeAgo = (timestamp) => {
    const updated = parseDbTimestamp(timestamp);
    if (!updated || isNaN(updated)) return "—";

    const now = new Date();
    const diffMs = now - updated;

    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "gerade eben";
    if (diffMin < 60) return `vor ${diffMin} Min`;
    if (diffHour < 24) return `vor ${diffHour} Std`;
    if (diffDay === 1) return "gestern";
    return updated.toLocaleDateString("de-CH");
  };

  return (
    <Popup
      longitude={selectedMarker.lng}
      latitude={selectedMarker.lat}
      onClose={onClose}
      closeOnClick={false}
      anchor="bottom"
      offset={14}
      maxWidth="300px"
    >
      <div className="popup-glass">
        {/* Ladeindikator */}
        {!tooltipData && (
          <div className="popup-loading">
            <div className="popup-loading-spinner" />
            <span>Lade Daten…</span>
          </div>
        )}

        {tooltipData?._error && (
          <div style={{ color: "#c0392b", fontSize: 12 }}>⚠️ Keine Daten für dieses Skigebiet</div>
        )}

        {tooltipData && !tooltipData._error && (
          <>
            <div className="popup-header">
              <div className="popup-name">{tooltipData.name || "—"}</div>
            </div>

            <div className="popup-row">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#888"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Geöffnet provisorisch</span>
            </div>

            <div className="popup-row">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#888"
                strokeWidth="1.8"
              >
                <path d="M3 7h18M8 7V4m8 3V4M5 20l3-9m8 9-3-9" />
              </svg>
              <span>
                {tooltipData.lifte_offen ?? "—"}/{tooltipData.lifte_total ?? "—"} Lifte
              </span>
            </div>

            <div className="popup-row">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#888"
                strokeWidth="1.8"
              >
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
              <span>{tooltipData.schnee ?? "—"} cm Schnee</span>
            </div>

            {(() => {
              const blau = tooltipData.km_blau || 0;
              const rot = tooltipData.km_rot || 0;
              const schwarz = tooltipData.km_schwarz || 0;
              const total = tooltipData.km_total || 0;
              const barTotal = blau + rot + schwarz || 1;
              return (
                <>
                  <div className="popup-pisten-bar">
                    <div
                      style={{
                        width: `${(blau / barTotal) * 100}%`,
                        background: "#2d6cdf",
                      }}
                    />
                    <div
                      style={{
                        width: `${(rot / barTotal) * 100}%`,
                        background: "#e84040",
                      }}
                    />
                    <div
                      style={{
                        width: `${(schwarz / barTotal) * 100}%`,
                        background: "#1a1a2e",
                      }}
                    />
                  </div>
                  <div className="popup-pisten-labels">
                    <span>{blau} km</span>
                    <span>{rot} km</span>
                    <span>{schwarz} km</span>
                    <span className="popup-total">{total} km</span>
                  </div>
                </>
              );
            })()}

            <div className="popup-footer">
              <span>Aktualisiert: {formatTimeAgo(tooltipData.updated_at)}</span>
              {tooltipData.lawinengefahr_url ? (
                <a
                  href={tooltipData.lawinengefahr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="popup-lawine-link"
                >
                  Lawinengefahr
                </a>
              ) : (
                <span style={{ color: "#ccc" }}>Lawinengefahr</span>
              )}
            </div>
          </>
        )}
      </div>
    </Popup>
  );
};
