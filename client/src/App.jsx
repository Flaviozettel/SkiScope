// ============================================================
// App.jsx – Wurzelkomponente der SkiScope-Anwendung
//
// Verwaltet den globalen Zustand für das aktive Datum und
// rendert das Haupt-Layout: Header, Sidebar, MainArea, Footer.
// ============================================================

import { useState } from "react";
import "./App.css";
import { Header } from "./Header.jsx";
import { MainArea } from "./MainArea.jsx";
import { Footer } from "./Footer.jsx";
import { useRef } from "react";

export function App() {
  // Globaler Zustand: das aktuell ausgewählte Datum (ISO-String, z.B. "2026-01-15")
  const [aktivDatum, setAktivDatum] = useState(null);
  const mapRef = useRef();

  return (
    <div className="app">
      <Header mapRef={mapRef} />

      {/* Haupt-Inhalt: Sidebar links, Kartenbereich rechts */}
      <div className="page-card">
        <MainArea aktivDatum={aktivDatum} setAktivDatum={setAktivDatum} mapRef={mapRef} />
      </div>

      <Footer />
    </div>
  );
}
