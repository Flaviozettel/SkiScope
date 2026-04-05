import { useState } from "react";

const PROFILES = [
  { icon: "🎿", name: "Ski" },
  { icon: "🏂", name: "Snowboard" },
  { icon: "👨‍👩‍👧", name: "Familie" },
];

const LIFTS = [
  { key: "buegel", label: "Bügellift" },
  { key: "sessel", label: "Sesselbahn" },
  { key: "gondel", label: "Gondel" },
];

export const Sidebar = () => {
  const [profileIndex, setProfileIndex] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [skill, setSkill] = useState("Pro");
  const [lifts, setLifts] = useState({
    buegel: false,
    sessel: true,
    gondel: true,
  });
  const [snow, setSnow] = useState(85);
  const [liftComfort, setLiftComfort] = useState(40);

  const profile = PROFILES[profileIndex];

  return (
    <aside className="sidebar">
      {/* PROFILE */}
      <div className="section">
        <div style={{ position: "relative" }}>
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

      {/* LIFTS */}
      <div className="section">
        <div className="section-title">Lift-Präferenzen</div>
        {LIFTS.map((lift) => (
          <label key={lift.key} className="lift-item">
            <input
              type="checkbox"
              checked={lifts[lift.key]}
              onChange={() =>
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

      {/* CONFIG */}
      <div className="section-title">Konfiguration</div>
      <div className="config-label">Skill-Level</div>
      <select
        className="skill-select"
        value={skill}
        onChange={(e) => setSkill(e.target.value)}
      >
        <option>Pro</option>
        <option>Medium</option>
        <option>Anfänger</option>
      </select>

      <div className="weight-label">
        Schneequalität <span>{snow}%</span>
      </div>
      <input
        type="range"
        className="slider"
        min={0}
        max={100}
        value={snow}
        style={{
          background: `linear-gradient(to right, #2d6cdf ${snow}%, #ddd ${snow}%)`,
        }}
        onChange={(e) => setSnow(Number(e.target.value))}
      />

      <div className="weight-label">
        Lift Komfort <span>{liftComfort}%</span>
      </div>
      <input
        type="range"
        className="slider"
        min={0}
        max={100}
        value={liftComfort}
        style={{
          background: `linear-gradient(to right, #2d6cdf ${liftComfort}%, #ddd ${liftComfort}%)`,
        }}
        onChange={(e) => setLiftComfort(Number(e.target.value))}
      />

      <button
        className="btn"
        onClick={() => {
          console.log({ profile, skill, lifts, snow, liftComfort });
        }}
      >
        Ranking aktualisieren
      </button>
    </aside>
  );
};
