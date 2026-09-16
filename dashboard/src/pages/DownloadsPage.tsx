import { useEffect, useState } from "react";
import { getDownloadFeed } from "../api/endpoints";
import { DownloadRecord } from "../types";
import { format } from "date-fns";

function formatBytes(bytes?: number): string {
  if (!bytes) return "-";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const data = await getDownloadFeed(undefined, undefined, domainFilter || undefined);
      setDownloads(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="topbar">
        <h1>Downloads</h1>
      </div>

      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 10 }}>
        <input
          className="form-input"
          placeholder="Filter by source domain (e.g. wetransfer.com)"
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <button className="btn secondary" onClick={refresh}>
          Filter
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Employee</th>
                <th>Filename</th>
                <th>Size</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {downloads.map((d) => (
                <tr key={d._id}>
                  <td>{format(new Date(d.downloadedAt), "MMM d, HH:mm")}</td>
                  <td>{d.employee?.name}</td>
                  <td>{d.filename}</td>
                  <td>{formatBytes(d.fileSizeBytes)}</td>
                  <td>{d.sourceDomain || "-"}</td>
                </tr>
              ))}
              {downloads.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No downloads recorded.
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
