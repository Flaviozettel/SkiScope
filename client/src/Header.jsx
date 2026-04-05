import skiImage from "./data/Header_Berge.jpg";

export const Header = () => {
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
            <div className="badge-value">245 cm in Zermatt</div>
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
