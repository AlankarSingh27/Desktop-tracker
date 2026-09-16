import {
  ActivitySessionPayload,
  ActivityMetricPayload,
  DownloadEventPayload,
  IdleLogPayload,
  ActivityBatch,
} from "../shared/types";
import { enqueue, drainQueue, requeue, queueSize } from "./localStore";
import { uploadBatch, sendHeartbeat } from "./apiClient";

const SYNC_INTERVAL_MS = 3 * 60 * 1000; // upload every 3 minutes
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

export class SyncManager {
  private syncTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  start(): void {
    this.syncTimer = setInterval(() => this.syncNow().catch(console.error), SYNC_INTERVAL_MS);
    this.heartbeatTimer = setInterval(() => {
      sendHeartbeat().catch(() => {
        /* offline is expected sometimes, don't crash */
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  stop(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  addSession(session: ActivitySessionPayload): void {
    enqueue({ sessions: [session] });
  }

  addMetric(metric: ActivityMetricPayload): void {
    enqueue({ metrics: [metric] });
  }

  addDownload(download: DownloadEventPayload): void {
    enqueue({ downloads: [download] });
  }

  addIdleLog(idle: IdleLogPayload): void {
    enqueue({ idleLogs: [idle] });
  }

  /** Force an immediate upload attempt (e.g. called right before app quit). */
  async syncNow(): Promise<void> {
    if (queueSize() === 0) return;

    const batch: ActivityBatch = drainQueue();
    try {
      await uploadBatch(batch);
      console.log(
        `[sync] Uploaded batch: ${batch.sessions.length} sessions, ${batch.metrics.length} metrics, ` +
          `${batch.downloads.length} downloads, ${batch.idleLogs.length} idle logs`
      );
    } catch (err) {
      // upload failed (offline, server down, auth expired) - put it back
      // so nothing is lost, and try again next cycle
      console.error("[sync] Upload failed, re-queuing batch:", (err as Error).message);
      requeue(batch);
    }
  }
}
