import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getLiveStatus } from "../api/endpoints";
import { LiveDeviceStatus } from "../types";
import { useLiveSocket } from "../context/useLiveSocket";
import { formatDistanceToNow } from "date-fns";

const POLL_INTERVAL_MS = 15000;

export function LiveDashboardPage() {
  const [devices, setDevices] = useState<LiveDeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    try {
      const data = await getLiveStatus();
      setDevices(data.devices);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // socket push gives us a near-instant nudge to refresh rather than
  // waiting for the next poll tick
  useLiveSocket(() => {
    refresh();
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="topbar">
        <h1>Live Dashboard</h1>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="stat-label">Employees Online</div>
          <div className="stat-value">{devices.length}</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Device</th>
              <th>Status</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  No devices currently online.
                </td>
              </tr>
            )}
            {devices.map((d) => (
              <tr key={d.deviceId}>
                <td>
                  <Link className="employee-link" to={`/employees/${d.employee._id}`}>
                    {d.employee.name}
                  </Link>
                </td>
                <td>{d.employee.department}</td>
                <td>{d.hostname}</td>
                <td>
                  <span className="badge online">Online</span>
                </td>
                <td>{formatDistanceToNow(new Date(d.lastSeenAt), { addSuffix: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
