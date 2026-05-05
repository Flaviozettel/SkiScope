// ============================================================
// SkigebietDetail.jsx – Detail-Ansicht eines Skigebiets
//
// Layout: links Info-Card mit Header (Name + Zurück-Button),
// rechts interaktive Karte gezoomt auf die BBox des Gebiets.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { API_BASE } from "./config.js";
import { SkiMap } from "./SkiMap.jsx";
import "./SkigebietDetail.css";

const fmtNum = (v, unit = "", digits = 0) => {
  if (v == null || !Number.isFinite(Number(v))) return "–";
  const n = Number(v);
  return `${n.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
};

const Section = ({ title, children }) => (
  <section className="skidetail-section">
    <h3 className="skidetail-section-title">{title}</h3>
    <div className="skidetail-section-body">{children}</div>
  </section>
);

const Stat = ({ label, value }) => (
  <div className="skidetail-stat">
    <div className="skidetail-stat-label">{label}</div>
    <div className="skidetail-stat-value">{value}</div>
  </div>
);

// Stacked Bar für Pisten- oder Lift-Verteilung
const StackedBar = ({ segments }) => {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0);
  if (total === 0) {
    return <div className="skidetail-bar-empty">Keine Daten</div>;
  }
  return (
    <>
      <div className="skidetail-bar">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="skidetail-bar-seg"
            style={{
              width: `${((seg.value || 0) / total) * 100}%`,
              background: seg.color,
            }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>
      <div className="skidetail-bar-legend">
        {segments.map((seg) => (
          <span key={seg.label} className="skidetail-bar-tag">
            <span className="skidetail-bar-dot" style={{ background: seg.color }} />
            {seg.label}: <strong>{seg.value || 0}</strong>
          </span>
        ))}
      </div>
    </>
  );
};

export const SkigebietDetail = ({ stationId, safeDatum, setWetterStation, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Eigener mapRef + lokaler Marker-State, damit die Detail-Karte unabhängig
  // vom Haupt-State auf der Übersichtskarte arbeitet.
  const detailMapRef = useRef();
  const [hoverMarker, setHoverMarker] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);

  useEffect(() => {
    if (!stationId) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/skigebiet/detail?station_id=${stationId}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error(err);
        setError("Detaildaten konnten nicht geladen werden.");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [stationId]);

  if (loading) {
    return (
      <div className="skidetail-host skidetail-status">
        <div className="skidetail-spinner" />
        <span>Lade Skigebiet…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="skidetail-host skidetail-status">
        <div>{error || "Keine Daten"}</div>
        <button type="button" className="skidetail-back-btn" onClick={onBack}>
          ← Zurück
        </button>
      </div>
    );
  }

  const p = data.pisten || {};
  const l = data.lifte || {};
  const ll = data.langlauf || {};
  const sl = data.schlitteln || {};
  const ww = data.winterwandern || {};
  const sn = data.schnee || {};
  const st = data.stammdaten || {};

  return (
    <div className="skidetail-host">
      {/* Linke Info-Card */}
      <aside className="skidetail-info">
        <header className="skidetail-header">
          <button
            type="button"
            className="skidetail-back-btn"
            onClick={onBack}
            aria-label="Zurück"
          >
            ←
          </button>
          <div>
            <div className="skidetail-name">{data.name}</div>
            <div className="skidetail-sub">
              {[st.zip, st.ort].filter(Boolean).join(" ") || "—"}
            </div>
          </div>
        </header>

        <div className="skidetail-scroll">
          {/* Übersicht */}
          <Section title="Übersicht">
            <div className="skidetail-stat-grid">
              <Stat
                label="Lifte offen"
                value={
                  l.anzahl != null
                    ? `${l.anzahl_offen ?? 0} / ${l.anzahl}`
                    : "–"
                }
              />
              <Stat
                label="Pisten offen"
                value={
                  p.anzahl != null
                    ? `${p.anzahl_offen ?? "–"} / ${p.anzahl}`
                    : "–"
                }
              />
              <Stat label="Pisten gesamt" value={fmtNum(p.km_gesamt, "km", 1)} />
              <Stat label="Pisten offen" value={fmtNum(p.km_offen, "km", 1)} />
            </div>
            {(st.oeffnungszeit || st.schliessungszeit) && (
              <div className="skidetail-meta">
                Betriebszeit: {st.oeffnungszeit?.slice(0, 5) || "?"} –{" "}
                {st.schliessungszeit?.slice(0, 5) || "?"}
              </div>
            )}
            <div className="skidetail-links">
              {st.url && (
                <a href={st.url} target="_blank" rel="noopener noreferrer">
                  🌐 Webseite
                </a>
              )}
              {st.telefon && <a href={`tel:${st.telefon}`}>📞 {st.telefon}</a>}
              {data.lawinengefahr_url && (
                <a
                  href={data.lawinengefahr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="skidetail-warn"
                >
                  ⚠ Lawinengefahr
                </a>
              )}
            </div>
          </Section>

          {/* Schnee */}
          <Section title="Schnee">
            <div className="skidetail-stat-grid">
              <Stat label="Schneehöhe Tal" value={fmtNum(sn.tiefe_tal_cm, "cm", 0)} />
              <Stat label="Schneehöhe Piste" value={fmtNum(sn.tiefe_piste_cm, "cm", 0)} />
              <Stat label="Neuschnee" value={fmtNum(sn.neuschnee_cm, "cm", 0)} />
            </div>
          </Section>

          {/* Pisten nach Farbe */}
          <Section title="Pisten nach Schwierigkeit">
            <StackedBar
              segments={[
                { label: "Blau", value: p.anzahl_blau, color: "#2d6cdf" },
                { label: "Rot", value: p.anzahl_rot, color: "#e84040" },
                { label: "Schwarz", value: p.anzahl_schwarz, color: "#1a1a2e" },
              ]}
            />
          </Section>

          {/* Lifte nach Typ */}
          <Section title="Lifte nach Typ">
            <StackedBar
              segments={[
                { label: "Seilbahnen", value: l.anzahl_seilbahnen, color: "#0d9488" },
                { label: "Sesselbahnen", value: l.anzahl_sesselbahnen, color: "#2d6cdf" },
                { label: "Skilifte", value: l.anzahl_skilifte, color: "#7c3aed" },
                { label: "Babylifte", value: l.anzahl_babylifte, color: "#f59e0b" },
                { label: "Förderband", value: l.anzahl_foerderband, color: "#ec4899" },
              ]}
            />
          </Section>

          {/* Weitere Aktivitäten */}
          <Section title="Weitere Aktivitäten">
            <div className="skidetail-stat-grid">
              <Stat
                label="Langlauf klassisch"
                value={fmtNum(ll.km_klassisch, "km", 1)}
              />
              <Stat
                label="Langlauf skating"
                value={fmtNum(ll.km_skating, "km", 1)}
              />
              <Stat
                label="Schlittelwege"
                value={
                  sl.anzahl != null
                    ? `${sl.anzahl_offen ?? "–"} / ${sl.anzahl}`
                    : "–"
                }
              />
              <Stat label="Winterwandern" value={fmtNum(ww.km, "km", 1)} />
            </div>
          </Section>
        </div>
      </aside>

      {/* Rechte Karte, gezoomt auf BBox */}
      <div className="skidetail-map">
        <SkiMap
          mapRef={detailMapRef}
          safeDatum={safeDatum}
          hoverMarker={hoverMarker}
          setHoverMarker={setHoverMarker}
          selectedMarker={selectedMarker}
          setSelectedMarker={setSelectedMarker}
          tooltipData={tooltipData}
          setTooltipData={setTooltipData}
          setWetterStation={setWetterStation}
          initialBbox={data.bbox}
          initialLayers={{ schnee: true, pisten: true, lifte: true }}
        />
      </div>
    </div>
  );
};
