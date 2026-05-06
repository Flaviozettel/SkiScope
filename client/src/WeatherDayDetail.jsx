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

const formatHour = (value) => {
  const d = new Date(value);
  return d.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// `??` fängt nur null/undefined, nicht NaN — daher explizit auf endlich prüfen
const toFinite = (v) => (Number.isFinite(v) ? v : null);

// Feste Mindest-Skala für Regen, damit 1 mm/h nicht aussieht wie ein Unwetter.
// Erst bei tatsächlich starkem Niederschlag wächst die Achse mit.
const RAIN_MIN_DOMAIN = 5; // mm

// Nur jeden N-ten Stunden-Tick auf der X-Achse — sonst überlappen sich die Labels
// auf der schmalen Hälfte.
const HOUR_TICK_INTERVAL = 2;

const WeatherChart = ({ data }) => {
  const tempDomain = useMemo(() => {
    const vals = data.map((d) => d.temp_2m).filter((v) => Number.isFinite(v));
    if (vals.length === 0) return [0, 10];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(2, (max - min) * 0.2);
    // auf ganze Grad runden für saubere Ticks
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [data]);

  const rainDomain = useMemo(() => {
    const vals = data.map((d) => d.niederschlag).filter((v) => Number.isFinite(v));
    const max = vals.length ? Math.max(...vals) : 0;
    return [0, Math.max(RAIN_MIN_DOMAIN, Math.ceil(max))];
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 4" vertical={false} />

        <XAxis
          dataKey="timeLabel"
          interval={HOUR_TICK_INTERVAL}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#d1d5db" }}
        />

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

        <YAxis
          yAxisId="sun"
          orientation="right"
          width={0}
          domain={[0, 60]}
          hide
        />

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

        <Area
          yAxisId="sun"
          type="monotone"
          dataKey="sonnenscheindauer"
          name="Sonnenschein"
          fill="#fde68a"
          stroke="#e6c314"
          fillOpacity={0.55}
        />

        <Bar
          yAxisId="rain"
          dataKey="niederschlag"
          name="Niederschlag"
          barSize={10}
          fill="#413ea0"
          radius={[2, 2, 0, 0]}
        />

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

// Aggregat-Helfer: ignorieren null/undefined-Werte
const finiteValues = (rows, key) =>
  rows.map((r) => r[key]).filter((v) => Number.isFinite(v));

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

const fmt = (value, unit, digits = 1) => {
  if (value == null || !Number.isFinite(value)) return "–";
  return `${value.toFixed(digits)} ${unit}`.trim();
};

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

const WeatherStats = ({ rows }) => {
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
      snowfallHeight: fmt(maxOf(rows, "schneefall_hoehe"), "cm", 1),
      snowDepth: fmt(maxOf(rows, "schnee_tiefe"), "cm", 1),
      windMax: fmt(maxOf(rows, "wind_geschwindigkeit_10m"), "km/h", 0),
      gustMax: fmt(maxOf(rows, "wind_boehen_10m"), "km/h", 0),
      cloudCover: fmt(meanOf(rows, "bewoelkung_cover"), "%", 0),
      cloudLow: fmt(meanOf(rows, "bewoelkung_tief"), "%", 0),
      cloudMid: fmt(meanOf(rows, "bewoelkung_mittel"), "%", 0),
      cloudHigh: fmt(meanOf(rows, "bewoelkung_hoch"), "%", 0),
      sunshineSum: fmt(sumOf(rows, "sonnenscheindauer"), "h", 1),
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
          <Row label="Neuschnee (max.)" value={stats.snowfallHeight} />
          <Row label="Schneedecke (max.)" value={stats.snowDepth} />
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

export const WeatherDayDetail = ({ tag, station, onClose }) => {
  const [data, setData] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        const chartData = rows.map((row) => ({
          time: row.zeitpunkt,
          timeLabel: formatHour(row.zeitpunkt),
          temp_2m: toFinite(row.temperatur_2m ?? row.temperature_2m),
          niederschlag: toFinite(row.niederschlag ?? row.precipitation) ?? 0,
          sonnenscheindauer: toFinite((row.sonnenscheindauer ?? row.sunshine) / 60) ?? 0,
        }));

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
          // sonnenscheindauer kommt vom Backend in Sekunden → in Stunden für die Tagessumme
          sonnenscheindauer: toFinite(row.sonnenscheindauer)
            ? row.sonnenscheindauer / 3600
            : null,
          wetter_modell: row.wetter_modell,
        }));

        setData(chartData);
        setRawRows(normalizedRows);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
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
