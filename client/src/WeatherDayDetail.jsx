// Detail-Overlay für das Wetter eines einzelnen Tages.
// Wird über der Karte/Detailansicht eingeblendet wenn aus der WeatherSidebar
// ein Tag (1–7) angeklickt wurde. Holt die Stundendaten vom Backend und
// zeigt sie als Recharts-Diagramm + Tagesstatistiken.

import { useEffect, useMemo, useState } from "react";
import "./WeatherDayDetail.css";
import { API_BASE } from "./config.js";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from "recharts";

// Hilfs-Formatter: ISO-Zeit → "HH:MM"
const formatHour = (value) => {
  const d = new Date(value);
  return d.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// `??` fängt nur null/undefined, aber NICHT NaN – daher explizit prüfen.
const toFinite = (v) => (Number.isFinite(v) ? v : null);

// Mindest-Skala für die Regen-Achse, erst beim überschreiten passt sich die Achse an.
// Erst bei starkem Niederschlag wächst die Achse mit.
const RAIN_MIN_DOMAIN = 5; // mm

// Nur jeden N-ten Stunden-Tick zeigen, sonst überlappen die Labels auf der
// schmalen Diagramm-Hälfte.
const HOUR_TICK_INTERVAL = 2;

// --- Chart-Komponente ---

const WeatherChart = ({ data }) => {
  // Y-Achsen-Range für Temperatur dynamisch: min/max der Tagesdaten + Padding,
  // dann auf ganze Grad runden für saubere Tick-Beschriftung.
  const tempDomain = useMemo(() => {
    const vals = data.map((d) => d.temp_2m).filter((v) => Number.isFinite(v));
    if (vals.length === 0) return [0, 10];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(2, (max - min) * 0.2);
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [data]);

  // Regen-Achse: 0 bis max der Daten, aber mindestens RAIN_MIN_DOMAIN.
  const rainDomain = useMemo(() => {
    const vals = data.map((d) => d.niederschlag).filter((v) => Number.isFinite(v));
    const max = vals.length ? Math.max(...vals) : 0;
    return [0, Math.max(RAIN_MIN_DOMAIN, Math.ceil(max))];
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 4" vertical={false} />

        <XAxis
          dataKey="timeLabel"
          interval={HOUR_TICK_INTERVAL}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#d1d5db" }}
        />

        {/* Linke Y-Achse: Temperatur in °C */}
        <YAxis
          yAxisId="temp"
          width={36}
          unit="°"
          domain={tempDomain}
          tickCount={5}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />

        {/* Rechte Y-Achse: Regen in mm */}
        <YAxis
          yAxisId="rain"
          orientation="right"
          width={42}
          unit=" mm"
          domain={rainDomain}
          tickCount={5}
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />

        {/* Versteckte dritte Y-Achse für Sonnenscheindauer (Skala 0–60 Min/h) */}
        <YAxis yAxisId="sun" orientation="right" width={0} domain={[0, 60]} hide />

        <Tooltip
          formatter={(value, name) => {
            if (value == null) return ["–", name];
            if (name === "Temperatur") return [`${value.toFixed(1)} °C`, name];
            if (name === "Niederschlag") return [`${value.toFixed(1)} mm`, name];
            if (name === "Sonnenschein") return [`${Math.round(value)} min`, name];
            return [value, name];
          }}
        />

        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconSize={10} />

        {/* Sonnenschein als gelbe Fläche im Hintergrund */}
        <Area
          yAxisId="sun"
          type="monotone"
          dataKey="sonnenscheindauer"
          name="Sonnenschein"
          fill="#fde68a"
          stroke="#e6c314"
          fillOpacity={0.55}
        />

        {/* Niederschlag als Balken */}
        <Bar
          yAxisId="rain"
          dataKey="niederschlag"
          name="Niederschlag"
          barSize={10}
          fill="#413ea0"
          radius={[2, 2, 0, 0]}
        />

        {/* Temperatur als orange Linie, vorne dran */}
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temp_2m"
          name="Temperatur"
          stroke="#ff7300"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// Schreibt z.B. "Montag, 15. Januar 2026"
const formatHeaderDate = (tag) => {
  if (!tag) return "";
  const d = new Date(tag);
  return d.toLocaleDateString("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// --- Aggregat-Helfer für die Tagesstatistiken ---
// Ignorieren null/undefined/NaN, damit Min/Max/Mean nicht falsch werden.
const finiteValues = (rows, key) => rows.map((r) => r[key]).filter((v) => Number.isFinite(v));

const sumOf = (rows, key) => {
  const vs = finiteValues(rows, key);
  if (vs.length === 0) return null;
  return vs.reduce((a, b) => a + b, 0);
};

const maxOf = (rows, key) => {
  const vs = finiteValues(rows, key);
  if (vs.length === 0) return null;
  return Math.max(...vs);
};

const minOf = (rows, key) => {
  const vs = finiteValues(rows, key);
  if (vs.length === 0) return null;
  return Math.min(...vs);
};

const meanOf = (rows, key) => {
  const vs = finiteValues(rows, key);
  if (vs.length === 0) return null;
  return vs.reduce((a, b) => a + b, 0) / vs.length;
};

// Wert formatieren, "–" wenn null oder nicht endlich
const fmt = (value, unit, digits = 1) => {
  if (value == null || !Number.isFinite(value)) return "–";
  return `${value.toFixed(digits)} ${unit}`.trim();
};

// Layout-Wrapper (gleicher Stil wie in SkigebietDetail, bewusst nicht
// extrahiert – die beiden Komponenten haben sonst nichts gemeinsam).
const Section = ({ title, children }) => (
  <section className="weather-day-detail-section">
    <h3 className="weather-day-detail-section-title">{title}</h3>
    {children}
  </section>
);

const Pill = ({ label, value }) => (
  <div className="weather-day-detail-pill">
    <div className="weather-day-detail-pill-label">{label}</div>
    <div className="weather-day-detail-pill-value">{value}</div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="weather-day-detail-row">
    <span className="weather-day-detail-row-label">{label}</span>
    <span className="weather-day-detail-row-value">{value}</span>
  </div>
);

// --- Statistik-Block unter dem Diagramm ---

const WeatherStats = ({ rows }) => {
  // useMemo, damit die Aggregate nicht bei jedem Render neu berechnet werden.
  const stats = useMemo(() => {
    if (!rows || rows.length === 0) return null;

    const tempMin = minOf(rows, "temperatur_2m");
    const tempMax = maxOf(rows, "temperatur_2m");
    const feltMin = minOf(rows, "gefuehlte_temperatur");
    const feltMax = maxOf(rows, "gefuehlte_temperatur");

    return {
      tempRange:
        tempMin != null && tempMax != null
          ? `${tempMin.toFixed(1)} … ${tempMax.toFixed(1)} °C`
          : "–",
      feltRange:
        feltMin != null && feltMax != null
          ? `${feltMin.toFixed(1)} … ${feltMax.toFixed(1)} °C`
          : "–",
      humidity: fmt(meanOf(rows, "relative_luftfeuchtigkeit_2m"), "%", 0),
      rainSum: fmt(sumOf(rows, "regen"), "mm", 1),
      snowfallSum: fmt(sumOf(rows, "schneefall"), "cm", 1),
      snowDepth: fmt(maxOf(rows, "schnee_tiefe"), "cm", 1),
      // snowfall_height von Open-Meteo: Höhe (m ü. M.), ab der Niederschlag als Schnee fällt
      snowfallLine: fmt(maxOf(rows, "schneefall_hoehe"), "m ü. M.", 0),
      windMax: fmt(maxOf(rows, "wind_geschwindigkeit_10m"), "km/h", 0),
      gustMax: fmt(maxOf(rows, "wind_boehen_10m"), "km/h", 0),
      cloudCover: fmt(meanOf(rows, "bewoelkung_cover"), "%", 0),
      cloudLow: fmt(meanOf(rows, "bewoelkung_tief"), "%", 0),
      cloudMid: fmt(meanOf(rows, "bewoelkung_mittel"), "%", 0),
      cloudHigh: fmt(meanOf(rows, "bewoelkung_hoch"), "%", 0),
      sunshineSum: fmt(sumOf(rows, "sonnenscheindauer"), "h", 1),
      // Modell ist überall gleich, also einfach aus der ersten Zeile mit Wert nehmen.
      model: rows.find((r) => r.wetter_modell)?.wetter_modell ?? "–",
    };
  }, [rows]);

  if (!stats) return null;

  return (
    <>
      <Section title="Temperatur & Luft">
        <div className="weather-day-detail-pill-row">
          <Pill label="Temperatur (Min/Max)" value={stats.tempRange} />
          <Pill label="Gefühlt (Min/Max)" value={stats.feltRange} />
          <Pill label="Luftfeuchte (Ø)" value={stats.humidity} />
        </div>
      </Section>

      <Section title="Niederschlag & Schnee">
        <div className="weather-day-detail-rows">
          <Row label="Regen (Summe)" value={stats.rainSum} />
          <Row label="Schneefall (Summe)" value={stats.snowfallSum} />
          <Row label="Schneedecke (max.)" value={stats.snowDepth} />
          <Row label="Schneefallgrenze (max.)" value={stats.snowfallLine} />
        </div>
      </Section>

      <Section title="Wind">
        <div className="weather-day-detail-pill-row">
          <Pill label="Wind (max.)" value={stats.windMax} />
          <Pill label="Böen (max.)" value={stats.gustMax} />
        </div>
      </Section>

      <Section title="Bewölkung & Sonne">
        <div className="weather-day-detail-rows">
          <Row label="Bewölkung (Ø)" value={stats.cloudCover} />
          <Row label="Tiefe Wolken (Ø)" value={stats.cloudLow} />
          <Row label="Mittlere Wolken (Ø)" value={stats.cloudMid} />
          <Row label="Hohe Wolken (Ø)" value={stats.cloudHigh} />
          <Row label="Sonnenschein (Summe)" value={stats.sunshineSum} />
        </div>
      </Section>

      <div className="weather-day-detail-footer">
        Wettermodell: <code>{stats.model}</code>
      </div>
    </>
  );
};

// --- Haupt-Overlay ---

export const WeatherDayDetail = ({ tag, station, onClose }) => {
  const [data, setData] = useState([]); // aufbereitete Daten für das Chart
  const [rawRows, setRawRows] = useState([]); // normalisierte Rohdaten für die Stats
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stundendaten für den gewählten Tag laden. Wenn der User schnell zwischen
  // Tagen wechselt, brechen wir den alten Request über AbortController ab.
  useEffect(() => {
    if (!tag || !station?.station_id) {
      setData([]);
      setRawRows([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(
      `${API_BASE}/skigebiet/wetterprognose?station_id=${station.station_id}&type=tag&date_str=${tag}`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((rows) => {
        // Daten fürs Chart vorbereiten – nur die drei Spuren, die wir plotten.
        const chartData = rows.map((row) => ({
          time: row.zeitpunkt,
          timeLabel: formatHour(row.zeitpunkt),
          temp_2m: toFinite(row.temperatur_2m ?? row.temperature_2m),
          niederschlag: toFinite(row.niederschlag ?? row.precipitation) ?? 0,
          // sonnenscheindauer kommt vom Backend in Sekunden → Minuten für die Y-Achse
          sonnenscheindauer: toFinite((row.sonnenscheindauer ?? row.sunshine) / 60) ?? 0,
        }));

        // Vollständige normalisierte Rohdaten für die Tagesstatistiken.
        const normalizedRows = rows.map((row) => ({
          temperatur_2m: toFinite(row.temperatur_2m),
          gefuehlte_temperatur: toFinite(row.gefuehlte_temperatur),
          relative_luftfeuchtigkeit_2m: toFinite(row.relative_luftfeuchtigkeit_2m),
          regen: toFinite(row.regen),
          niederschlag: toFinite(row.niederschlag),
          schneefall: toFinite(row.schneefall),
          schnee_tiefe: toFinite(row.schnee_tiefe),
          schneefall_hoehe: toFinite(row.schneefall_hoehe),
          wind_geschwindigkeit_10m: toFinite(row.wind_geschwindigkeit_10m),
          wind_boehen_10m: toFinite(row.wind_boehen_10m),
          bewoelkung_cover: toFinite(row.bewoelkung_cover),
          bewoelkung_tief: toFinite(row.bewoelkung_tief),
          bewoelkung_mittel: toFinite(row.bewoelkung_mittel),
          bewoelkung_hoch: toFinite(row.bewoelkung_hoch),
          // Hier in Stunden, weil wir in der Statistik die Tagessumme zeigen.
          sonnenscheindauer: toFinite(row.sonnenscheindauer) ? row.sonnenscheindauer / 3600 : null,
          wetter_modell: row.wetter_modell,
        }));

        setData(chartData);
        setRawRows(normalizedRows);
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // Wechsel, kein echter Fehler
        console.error(err);
        setError("Wetterdetails konnten nicht geladen werden.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [tag, station?.station_id]);

  return (
    <div className="weather-day-detail">
      <div className="weather-day-detail-header">
        <div>
          <div className="weather-day-detail-title">Detailliertes Wetter</div>
          <div className="weather-day-detail-subtitle">
            {[station?.name, formatHeaderDate(tag)].filter(Boolean).join(" · ")}
          </div>
        </div>
        <button
          type="button"
          className="weather-day-detail-close"
          onClick={onClose}
          aria-label="Schliessen"
        >
          ×
        </button>
      </div>

      <div className="weather-day-detail-body">
        {loading && <div className="weather-day-detail-status">Lade Wetterdetails…</div>}

        {error && <div className="weather-day-detail-status">{error}</div>}

        {!loading && !error && data.length > 0 && (
          <>
            <div className="weather-day-detail-chart">
              <WeatherChart data={data} />
            </div>
            <WeatherStats rows={rawRows} />
          </>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="weather-day-detail-status">Keine Detaildaten verfügbar.</div>
        )}
      </div>
    </div>
  );
};
