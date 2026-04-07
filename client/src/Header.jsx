import skiImage from "./data/Header_Berge.jpg";
import { useEffect, useState } from "react";

export const Header = () => {
  const [topSchnee, setTopSchnee] = useState(null);

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
        {/* Logo – centered top */}
        <div className="logo-container">
          <div className="logo">❄ SkiScope</div>
        </div>

        {/* Best snow badge – top right */}
        <div className="hero-badge">
          <span className="badge-icon">❄️</span>
          <div>
            <div className="badge-label">Beste Schneehöhe</div>
            <div className="badge-value">
              {topSchnee
                ? `${topSchnee.schnee_haupt} cm in ${topSchnee.station_name}`
                : "Lade Daten..."}
            </div>
          </div>
        </div>

        {/* Hero text – bottom left */}
        <div className="hero-text">
          <h1>Finde dein perfektes Skigebiet.</h1>
          <p>Pisten, Schnee und Liftangebot übersichtlich vergleichen.</p>
        </div>
      </div>
    </header>
  );
};
