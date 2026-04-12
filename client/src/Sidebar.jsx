// ============================================================
// Sidebar.jsx – Filterleiste links
//
// Ermöglicht die Auswahl von Nutzerprofil, Lift-Präferenzen
// und Skill-Level. Der "Ranking aktualisieren"-Button gibt
// die aktuelle Konfiguration in der Konsole aus.
// ============================================================

import { useState } from "react";

// Verfügbare Nutzerprofile
const PROFILES = [
  { icon: "🎿", name: "Ski" },
  { icon: "🏂", name: "Snowboard" },
  { icon: "👨‍👩‍👧", name: "Familie" },
];

// Lift-Typen für die Präferenz-Checkboxen
const LIFTS = [
  { key: "buegel", label: "Bügellift" },
  { key: "sessel", label: "Sesselbahn" },
  { key: "gondel", label: "Gondel" },
];

export const Sidebar = () => {
  // Index des aktuell gewählten Profils
  const [profileIndex, setProfileIndex] = useState(0);

  // Steuert ob das Profil-Dropdown offen ist
  const [profileOpen, setProfileOpen] = useState(false);

  // Aktuell gewähltes Skill-Level
  const [skill, setSkill] = useState("Pro");

  // Welche Lift-Typen sind aktiviert
  const [lifts, setLifts] = useState({
    buegel: false,
    sessel: true,
    gondel: true,
  });

  const profile = PROFILES[profileIndex];

  return (
    <aside className="sidebar">
      {/* ── PROFIL-AUSWAHL ─────────────────────────────── */}
      <div className="section">
        <div style={{ position: "relative" }}>
          {/* Klickbarer Profil-Block öffnet/schliesst Dropdown */}
          <div
            className="profile-block profile-block--clickable"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <span>{profile.icon}</span>
            <div style={{ flex: 1 }}>
              <div className="profile-label">Profil</div>
              <div className="profile-name">{profile.name}</div>
            </div>
            <span>{profileOpen ? "▲" : "▼"}</span>
          </div>

          {/* Dropdown-Liste der Profile */}
          {profileOpen && (
            <div className="profile-dropdown">
              {PROFILES.map((p, i) => (
                <div
                  key={i}
                  className="profile-option"
                  onClick={() => {
                    setProfileIndex(i);
                    setProfileOpen(false);
                  }}
                >
                  {p.icon} {p.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

      {/* ── KONFIGURATION ──────────────────────────────── */}
      <div className="section-title">Konfiguration</div>

      {/* Skill-Level Auswahl */}
      <div className="config-label">Skill-Level</div>
      <select className="skill-select" value={skill} onChange={(e) => setSkill(e.target.value)}>
        <option>Pro</option>
        <option>Medium</option>
        <option>Anfänger</option>
      </select>

      {/* Ranking neu berechnen – gibt aktuelle Einstellungen in der Konsole aus */}
      <button
        className="btn"
        onClick={() => {
          console.log({ profile, skill, lifts });
        }}
      >
        Ranking aktualisieren
      </button>
    </aside>
  );
};
