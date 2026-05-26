// Popup, das nach Klick auf einen Skigebiet-Marker erscheint.
// Zeigt Liftstatus, Schneehöhe, Pistenkilometer und einen Link auf die Detailansicht.
// tooltipData wird vom Parent (SkiMap) reingereicht – kommt vom /skigebiet-Endpunkt.

import { Popup } from "react-map-gl/maplibre";
import "./SkigebietPopup.css";

export const SkigebietPopup = ({ selectedMarker, tooltipData, onClose, onOpenDetail }) => {
  // Postgres-Timestamps sind manchmal mit Mikrosekunden oder ohne ":00" beim Offset.
  // Wir trimmen die Mikrosekunden und ergänzen ":00" falls nötig, damit Date() das frisst.
  const parseDbTimestamp = (ts) => {
    if (!ts) return null;
    const cleaned = ts.replace(/\.(\d{3})\d+/, ".$1").replace(/([+-]\d{2})$/, "$1:00");
    return new Date(cleaned);
  };

  // "vor 5 Min", "vor 2 Std", "gestern", oder Datum – für den Aktualisierungs-Hinweis.
  const formatTimeAgo = (timestamp) => {
    const updated = parseDbTimestamp(timestamp);
    if (!updated || isNaN(updated)) return "—";
    const diffMin = Math.floor((new Date() - updated) / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffMin < 1) return "gerade eben";
    if (diffMin < 60) return `vor ${diffMin} Min`;
    if (diffHour < 24) return `vor ${diffHour} Std`;
    if (diffDay === 1) return "gestern";
    return updated.toLocaleDateString("de-CH");
  };

  // Lift-Auslastung als Prozent – Basis für Status-Text und Farbe.
  const lifteOffen = tooltipData?.lifte_offen ?? 0;
  const lifteTotal = tooltipData?.lifte_total ?? 0;
  const liftePct = lifteTotal > 0 ? Math.round((lifteOffen / lifteTotal) * 100) : 0;

  // Status-Label in 4 Stufen, schnell ablesbar
  const liftStatus =
    lifteOffen === 0
      ? "geschlossen"
      : liftePct >= 80
        ? " geöffnet"
        : liftePct >= 40
          ? "teilweise geöffnet"
          : "wenig geöffnet";

  // Farbcode passend zum Status (grau / grün / orange / rot)
  const statusColor =
    lifteOffen === 0
      ? "#9ca3af"
      : liftePct >= 80
        ? "#16a34a"
        : liftePct >= 40
          ? "#d97706"
          : "#dc2626";

  return (
    <Popup
      longitude={selectedMarker.lng}
      latitude={selectedMarker.lat}
      onClose={onClose}
      closeOnClick={false}    // Klick auf die Karte darf das Popup nicht schliessen
      anchor="bottom"
      offset={14}
      maxWidth="300px"
    >
      <div className="popup-glass">
        {/* Loading-State: Spinner solange die Backend-Antwort fehlt */}
        {!tooltipData && (
          <div className="popup-loading">
            <div className="popup-loading-spinner" />
            <span>Lade Daten…</span>
            <button className="popup-close-btn" onClick={onClose} style={{ marginLeft: "auto" }}>
              ✕
            </button>
          </div>
        )}

        {/* Fehler-State falls das Backend einen Error zurückgibt */}
        {tooltipData?._error && (
          <div className="popup-error">⚠️ Keine Daten für dieses Skigebiet</div>
        )}

        {/* Normal-State: alle Daten da */}
        {tooltipData && !tooltipData._error && (
          <>
            {/* Header mit Name + Status-Badge */}
            <div className="popup-header">
              <div className="popup-name">{tooltipData.name || "—"}</div>
              <div
                className="popup-status-badge"
                style={{
                  color: statusColor,
                  borderColor: statusColor + "33",  // 33 = ~20% Alpha als Hex
                  background: statusColor + "12",   // 12 = ~7% Alpha als Hex
                }}
              >
                {liftStatus}
              </div>
              <button className="popup-close-btn" onClick={onClose}>
                ✕
              </button>
            </div>

            {/* Lift-Auslastungsbalken */}
            <div className="popup-lift-bar-wrap">
              <div className="popup-lift-bar">
                <div
                  className="popup-lift-bar-fill"
                  style={{ width: `${liftePct}%`, background: statusColor }}
                />
              </div>
              <span className="popup-lift-label">
                {lifteOffen}/{lifteTotal} Lifte · {liftePct}%
              </span>
            </div>

            {/* Schnee + Pistenkilometer als zwei Stat-Boxen */}
            <div className="popup-stat-row">
              <div className="popup-stat">
                <span className="popup-stat-icon">❄</span>
                <div>
                  <div className="popup-stat-value">{tooltipData.schnee ?? "—"} cm</div>
                  <div className="popup-stat-label">Schneehöhe</div>
                </div>
              </div>
              <div className="popup-stat">
                <span className="popup-stat-icon">⛷</span>
                <div>
                  <div className="popup-stat-value">{tooltipData.km_total ?? "—"} km</div>
                  <div className="popup-stat-label">Pisten gesamt</div>
                </div>
              </div>
            </div>

            {/* Pistenverteilung blau/rot/schwarz als horizontaler Stacked Bar.
                || 1 verhindert Division-by-zero wenn alle drei Werte 0 sind. */}
            {(() => {
              const blau = tooltipData.km_blau || 0;
              const rot = tooltipData.km_rot || 0;
              const schwarz = tooltipData.km_schwarz || 0;
              const barTotal = blau + rot + schwarz || 1;
              return (
                <div className="popup-pisten-section">
                  <div className="popup-pisten-bar">
                    <div style={{ width: `${(blau / barTotal) * 100}%`, background: "#2d6cdf" }} />
                    <div style={{ width: `${(rot / barTotal) * 100}%`, background: "#e84040" }} />
                    <div
                      style={{ width: `${(schwarz / barTotal) * 100}%`, background: "#1a1a2e" }}
                    />
                  </div>
                  <div className="popup-pisten-labels">
                    <span className="popup-pisten-dot" style={{ "--dot": "#2d6cdf" }}>
                      {blau} km
                    </span>
                    <span className="popup-pisten-dot" style={{ "--dot": "#e84040" }}>
                      {rot} km
                    </span>
                    <span className="popup-pisten-dot" style={{ "--dot": "#1a1a2e" }}>
                      {schwarz} km
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Footer mit "vor X Min" und Lawinen-Link (falls vorhanden) */}
            <div className="popup-footer">
              <span>↻ {formatTimeAgo(tooltipData.updated_at)}</span>
              {tooltipData.lawinengefahr_url ? (
                <a
                  href={tooltipData.lawinengefahr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="popup-lawine-link"
                >
                  ⚠ Lawinengefahr
                </a>
              ) : (
                <span className="popup-lawine-disabled">⚠ Lawinengefahr</span>
              )}
            </div>

            {/* Sprung in die Vollansicht */}
            {onOpenDetail && (
              <button
                type="button"
                className="popup-detail-link"
                onClick={() => onOpenDetail(selectedMarker.station_id)}
              >
                Details →
              </button>
            )}
          </>
        )}
      </div>
    </Popup>
  );
};
