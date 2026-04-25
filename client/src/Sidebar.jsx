// ============================================================
// Sidebar.jsx – Filterleiste links
//
// Ermöglicht die Auswahl von Lift-Präferenzen
// und Skill-Level. Der "Ranking aktualisieren"-Button gibt
// die aktuelle Konfiguration in der Konsole aus.
// ============================================================

import { useState } from "react";

// Lift-Typen für die Präferenz-Checkboxen
const LIFTS = [
  { key: "buegel", label: "Bügellift" },
  { key: "sessel", label: "Sesselbahn" },
  { key: "gondel", label: "Gondel" },
];

export const Sidebar = () => {
  // Welche Lift-Typen sind aktiviert
  const [lifts, setLifts] = useState({
    buegel: false,
    sessel: true,
    gondel: true,
  });

  return (
    <aside className="sidebar">
      {/* ── LIFT-PRÄFERENZEN ───────────────────────────── */}
      <div className="section">
        <div className="section-title">Lift-Präferenzen</div>
        {LIFTS.map((lift) => (
          <label key={lift.key} className="lift-item">
            <input
              type="checkbox"
              checked={lifts[lift.key]}
              onChange={() =>
                // Einzelnen Lift-Typ umschalten, Rest beibehalten
                setLifts({
                  ...lifts,
                  [lift.key]: !lifts[lift.key],
                })
              }
            />
            {lift.label}
          </label>
        ))}
      </div>

      {/* Ranking neu berechnen – gibt aktuelle Einstellungen in der Konsole aus */}
      <button
        className="btn"
        onClick={() => {
          console.log({ lifts });
        }}
      >
        Ranking aktualisieren
      </button>
    </aside>
  );
};
