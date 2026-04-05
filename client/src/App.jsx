import { useState, useEffect } from "react";
import "./App.css";
import { Header } from "./Header.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { MainArea } from "./MainArea.jsx";
import { Footer } from "./Footer.jsx";

export function App() {
  const [schneeBounds, setSchneeBounds] = useState(null);
  const [aktivDatum, setAktivDatum] = useState(null);

  // Bounds neu laden wenn aktivDatum sich ändert
  useEffect(() => {
    if (!aktivDatum) return; //!aktivDatum = null oder undefined, dann abbrechen

    fetch(`http://localhost:8000/schnee/bounds?datum=${aktivDatum}`)
      .then((res) => res.json())
      .then((data) => {
        setSchneeBounds(data.bounds);
      })
      .catch((err) => console.error(err));
  }, [aktivDatum]); // GeoData wird jetzt in MainArea automatisch neu geladen wenn sich aktivDatum ändert

  return (
    <div className="app">
      <Header />
      <div className="page-card">
        <Sidebar />
        <MainArea
          schneeBounds={schneeBounds}
          aktivDatum={aktivDatum}
          setAktivDatum={setAktivDatum}
        />
      </div>
      <Footer />
    </div>
  );
}
