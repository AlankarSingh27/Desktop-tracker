import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getLeaderboard } from "../api/endpoints";
import { LeaderboardEntry } from "../types";

const COLOR_ACCENT = "#cc0001";
const COLOR_PANEL = "#003466";
const COLOR_BORDER = "#0a4d8c";
const COLOR_MUTED = "#9db4cc";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const chartData = entries.slice(0, 15).map((e) => ({
    name: e.name.length > 14 ? e.name.slice(0, 14) + "…" : e.name,
    minutes: Math.round(e.totalActiveSeconds / 60),
  }));

  return (
    <div>
      <div className="topbar">
        <h1>Leaderboard</h1>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Active time, last 24 hours</div>
      </div>

      {!loading && entries.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="stat-label" style={{ marginBottom: 12 }}>
            Active Time Comparison (top 15)
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke={COLOR_MUTED} fontSize={11} angle={-30} textAnchor="end" height={60} />
              <YAxis stroke={COLOR_MUTED} fontSize={12} />
              <Tooltip
                contentStyle={{ background: COLOR_PANEL, border: `1px solid ${COLOR_BORDER}` }}
                labelStyle={{ color: "#e8eef5" }}
              />
              <Bar dataKey="minutes" fill={COLOR_ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Active Time</th>
                <th>Productivity Score</th>
                <th>Keystrokes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.employeeId}>
                  <td>{i + 1}</td>
                  <td>
                    <Link className="employee-link" to={`/employees/${e.employeeId}`}>
                      {e.name}
                    </Link>
                  </td>
                  <td>{e.department}</td>
                  <td>{formatDuration(e.totalActiveSeconds)}</td>
                  <td>
                    {e.productivityScore !== null ? (
                      <span className="badge online">{e.productivityScore}%</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{e.totalKeystrokes.toLocaleString()}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No activity data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
