import express from "express";
import cors from "cors";
import http from "http";
import { ActivitySessionPayload, DownloadEventPayload } from "../shared/types";

const BRIDGE_PORT = 34521; // localhost-only, arbitrary high port

/**
 * The Electron main process cannot see inside browser tabs (URL, page
 * title, downloads) - only a browser extension can, via chrome.tabs /
 * chrome.downloads APIs. This tiny localhost-only server is how the
 * extension hands that data off to the agent for upload.
 *
 * Bound to 127.0.0.1 only - not reachable from the network.
 */
export class ExtensionBridge {
  private server: http.Server | null = null;
  private onTabActivity: (session: ActivitySessionPayload) => void;
  private onDownload: (dl: DownloadEventPayload) => void;

  constructor(
    onTabActivity: (session: ActivitySessionPayload) => void,
    onDownload: (dl: DownloadEventPayload) => void
  ) {
    this.onTabActivity = onTabActivity;
    this.onDownload = onDownload;
  }

  start(): void {
    const app = express();
    app.use(cors({ origin: true }));
    app.use(express.json({ limit: "512kb" }));

    app.post("/tab-activity", (req, res) => {
      const { appName, windowTitle, url, domain, startTime, endTime, durationSec } = req.body;
      console.log(`[bridge] tab-activity received: ${domain || url}`);
      if (!url || !startTime || !endTime) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      this.onTabActivity({
        category: "browser_tab",
        appName: appName || "Browser",
        windowTitle: windowTitle || "",
        url,
        domain,
        startTime,
        endTime,
        durationSec: durationSec ?? 0,
      });
      res.json({ ok: true });
    });

    app.post("/download", (req, res) => {
      const { filename, fileSizeBytes, sourceUrl, sourceDomain, mimeType, downloadedAt } = req.body;
      console.log(`[bridge] download received: ${filename}`);
      if (!filename || !downloadedAt) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      this.onDownload({ filename, fileSizeBytes, sourceUrl, sourceDomain, mimeType, downloadedAt });
      res.json({ ok: true });
    });

    app.get("/ping", (req, res) => res.json({ ok: true }));

    this.server = app.listen(BRIDGE_PORT, "127.0.0.1", () => {
      console.log(`[bridge] Listening on http://127.0.0.1:${BRIDGE_PORT}`);
    });
  }

  stop(): void {
    this.server?.close();
  }
}
