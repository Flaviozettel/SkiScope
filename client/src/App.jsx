import { useState, useEffect } from "react";
import "./App.css";
import { Header } from "./Header.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { MainArea } from "./MainArea.jsx";
import { Footer } from "./Footer.jsx";

export function App() {
  const [aktivDatum, setAktivDatum] = useState(null);

  return (
    <div className="app">
      <Header />
      <div className="page-card">
        <Sidebar />
        <MainArea aktivDatum={aktivDatum} setAktivDatum={setAktivDatum} />
      </div>
      <Footer />
    </div>
  );
}
