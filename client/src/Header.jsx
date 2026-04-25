// ============================================================
// Header.jsx – Hero-Banner mit Bergbild und Schnee-Badge
//
// Lädt beim Mounten die aktuell höchste Schneehöhe vom Backend
// und zeigt sie als Badge oben rechts an.
// ============================================================

import skiImage from "./data/Header_Berge.jpg";
import { useEffect, useState } from "react";

export const Header = () => {
  // Zustand für das Skigebiet mit der höchsten Schneehöhe
  const [topSchnee, setTopSchnee] = useState(null);

  // Beim ersten Render: beste Schneehöhe vom Backend laden
  useEffect(() => {
    fetch("http://localhost:8000/skigebiete/top-schnee")
      .then((res) => res.json())
      .then((data) => setTopSchnee(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <header
      className="hero"
      style={{
        backgroundImage: `url(${skiImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      <div className="hero-overlay">
        {/* Logo – zentriert oben */}
        <div className="logo-container">
          <div className="logo">❄ SkiScope</div>
        </div>

        {/* Slogan – unten links */}
        <div className="hero-text">
          <h1>Finde dein perfektes Skigebiet.</h1>
          <p>Pisten, Schnee und Liftangebot übersichtlich vergleichen.</p>
        </div>
      </div>
    </header>
  );
};
