import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  getEmployeeSummary,
  getEmployeeTimeline,
  getScreenshots,
  screenshotImageUrl,
  getEmployeeTrend,
  getEmployeeHourlyPattern,
} from "../api/endpoints";
import { EmployeeSummary, ActivitySessionRecord, ScreenshotRecord } from "../types";
import { format } from "date-fns";

// company palette
const COLOR_ACCENT = "#cc0001";
const COLOR_PANEL = "#003466";
const COLOR_BORDER = "#0a4d8c";
const COLOR_MUTED = "#9db4cc";
const COLOR_TEXT = "#e8eef5";
const COLOR_OK = "#4ade80";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const tooltipStyle = { background: COLOR_PANEL, border: `1px solid ${COLOR_BORDER}` };
const tooltipLabelStyle = { color: COLOR_TEXT };

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<EmployeeSummary | null>(null);
  const [timeline, setTimeline] = useState<ActivitySessionRecord[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotRecord[]>([]);
  const [trend, setTrend] = useState<{ date: string; activeSeconds: number }[]>([]);
  const [hourly, setHourly] = useState<{ hour: number; activeSeconds: number }[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getEmployeeSummary(id),
      getEmployeeTimeline(id),
      getScreenshots(id),
      getEmployeeTrend(id, 7),
      getEmployeeHourlyPattern(id),
    ])
      .then(([s, t, sc, tr, hr]) => {
        setSummary(s);
        setTimeline(t);
        setScreenshots(sc);
        setTrend(tr.trend);
        setHourly(hr.hourly);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !summary) return <div>Loading...</div>;

  const topAppsData = summary.topApps.map((a) => ({
    name: a.appName,
    minutes: Math.round(a.totalSeconds / 60),
  }));

  const pieData = [
    { name: "Active", value: summary.activity.totalActiveSeconds },
    { name: "Idle", value: summary.totalIdleSeconds },
  ];
  const pieColors = [COLOR_ACCENT, COLOR_BORDER];

  const trendData = trend.map((t) => ({
    date: format(new Date(t.date), "MMM d"),
    minutes: Math.round(t.activeSeconds / 60),
  }));

  const hourlyData = hourly.map((h) => ({
    hour: `${h.hour}:00`,
    minutes: Math.round(h.activeSeconds / 60),
  }));

  return (
    <div>
      <div className="topbar">
        <h1>{summary.employee.name}</h1>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{summary.employee.department}</div>
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="stat-label">Active Time (24h)</div>
          <div className="stat-value">{formatDuration(summary.activity.totalActiveSeconds)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Idle Time</div>
          <div className="stat-value">{formatDuration(summary.totalIdleSeconds)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Productivity Score</div>
          <div className="stat-value" style={{ color: COLOR_OK }}>
            {summary.productivityScore !== null ? `${summary.productivityScore}%` : "—"}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Keystrokes</div>
          <div className="stat-value">{summary.activity.totalKeystrokes.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="stat-label">Mouse Clicks</div>
          <div className="stat-value">{summary.activity.totalClicks.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="stat-label">Downloads</div>
          <div className="stat-value">{summary.downloadsCount}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 12 }}>
            7-Day Active Time Trend
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" stroke={COLOR_MUTED} fontSize={12} />
              <YAxis stroke={COLOR_MUTED} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Line type="monotone" dataKey="minutes" stroke={COLOR_ACCENT} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="stat-label" style={{ marginBottom: 12 }}>
            Active vs Idle Ratio
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(value: number) => formatDuration(value)}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: COLOR_MUTED }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="stat-label" style={{ marginBottom: 12 }}>
          Hour-by-Hour Activity Pattern (24h)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={hourlyData}>
            <XAxis dataKey="hour" stroke={COLOR_MUTED} fontSize={11} interval={1} />
            <YAxis stroke={COLOR_MUTED} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
            <Area type="monotone" dataKey="minutes" stroke={COLOR_ACCENT} fill={COLOR_ACCENT} fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="stat-label" style={{ marginBottom: 12 }}>
          Top Applications (minutes)
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={topAppsData} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" stroke={COLOR_MUTED} fontSize={12} />
            <YAxis type="category" dataKey="name" stroke={COLOR_MUTED} fontSize={12} width={120} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
            <Bar dataKey="minutes" fill={COLOR_ACCENT} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="stat-label" style={{ marginBottom: 12 }}>
          Screenshots ({screenshots.length}) — periodic snapshots, not continuous recording
        </div>
        {screenshots.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>No screenshots in this range.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {screenshots.map((s) => (
              <div key={s.id} style={{ cursor: "pointer" }} onClick={() => setSelectedScreenshot(s.id)}>
                <img
                  src={screenshotImageUrl(s.id)}
                  alt={`Screenshot at ${s.capturedAt}`}
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid var(--panel-border)",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  {format(new Date(s.capturedAt), "HH:mm:ss")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedScreenshot && (
        <div
          onClick={() => setSelectedScreenshot(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            cursor: "zoom-out",
          }}
        >
          <img
            src={screenshotImageUrl(selectedScreenshot)}
            alt="Screenshot full view"
            style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 8 }}
          />
        </div>
      )}

      <div className="card">
        <div className="stat-label" style={{ marginBottom: 12 }}>
          Activity Timeline
        </div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>App / Site</th>
              <th>Title</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((s) => (
              <tr key={s._id}>
                <td>{format(new Date(s.startTime), "HH:mm:ss")}</td>
                <td>{s.category === "browser_tab" ? "Web" : "App"}</td>
                <td>{s.domain || s.appName}</td>
                <td
                  style={{
                    maxWidth: 320,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.windowTitle}
                </td>
                <td>{formatDuration(s.durationSec)}</td>
              </tr>
            ))}
            {timeline.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  No activity recorded in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
