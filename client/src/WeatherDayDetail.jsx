import { useEffect, useState } from "react";
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

const WeatherChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{
          top: 20,
          right: 20,
          bottom: 10,
          left: 0,
        }}
      >
        <CartesianGrid stroke="#f5f5f5" />

        <XAxis dataKey="timeLabel" />

        <YAxis yAxisId="temp" width={35} unit="°" />

        <YAxis yAxisId="rain" orientation="right" width={35} unit=" mm" />

        <YAxis yAxisId="sun" orientation="right" width={0} unit="min" hide={true} />

        <Tooltip />

        <Legend />

        <Bar
          yAxisId="rain"
          dataKey="niederschlag"
          name="Niederschlag"
          barSize={18}
          fill="#413ea0"
        />

        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temp_2m"
          name="Temperatur"
          stroke="#ff7300"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="sonnenscheindauer"
          fill="#e6c314"
          stroke="#e6c314"
          yAxisID="sun"
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

export const WeatherDayDetail = ({ tag, station, onClose }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tag || !station?.station_id) {
      setData([]);
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

        setData(chartData);
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

        {!loading && !error && data.length > 0 && <WeatherChart data={data} />}

        {!loading && !error && data.length === 0 && (
          <div className="weather-day-detail-status">Keine Detaildaten verfügbar.</div>
        )}
      </div>
    </div>
  );
};
