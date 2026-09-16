import { uIOhook, UiohookKey } from "uiohook-napi";
import { ActivityMetricPayload } from "../shared/types";

const BUCKET_MS = 60_000;

/**
 * Counts keydown and mouse click/move events into 1-minute buckets.
 *
 * DELIBERATE DESIGN: we increment a counter on 'keydown' and discard the
 * event immediately - we never read/store event.keycode's mapped character,
 * never buffer key sequences, and never write anything resembling typed
 * text to disk or over the network. This is a productivity metric
 * (how much was someone typing), not a keylogger.
 */
export class InputTracker {
  private keystrokeCount = 0;
  private mouseClickCount = 0;
  private mouseDistancePx = 0;
  private lastMouseX: number | null = null;
  private lastMouseY: number | null = null;
  private activeMsThisBucket = 0;
  private lastEventAt = Date.now();
  private bucketStart = this.flooredBucket();
  private timer: NodeJS.Timeout | null = null;
  private onBucketFlush: (metric: ActivityMetricPayload) => void;

  constructor(onBucketFlush: (metric: ActivityMetricPayload) => void) {
    this.onBucketFlush = onBucketFlush;
  }

  start(): void {
    uIOhook.on("keydown", () => {
      this.keystrokeCount += 1;
      this.markActive();
    });

    uIOhook.on("mousedown", () => {
      this.mouseClickCount += 1;
      this.markActive();
    });

    uIOhook.on("mousemove", (e: { x: number; y: number }) => {
      if (this.lastMouseX !== null && this.lastMouseY !== null) {
        const dx = e.x - this.lastMouseX;
        const dy = e.y - this.lastMouseY;
        this.mouseDistancePx += Math.sqrt(dx * dx + dy * dy);
      }
      this.lastMouseX = e.x;
      this.lastMouseY = e.y;
      this.markActive();
    });

    uIOhook.start();

    // flush whatever bucket we're in every minute, aligned to wall-clock minutes
    this.timer = setInterval(() => this.checkBucketRollover(), 5000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    uIOhook.stop();
    this.flush();
  }

  private markActive(): void {
    const now = Date.now();
    // count time since the last event as "active" (capped so long gaps
    // between events - e.g. reading a doc - don't wrongly count as idle-free)
    const gap = Math.min(now - this.lastEventAt, 3000);
    this.activeMsThisBucket += gap;
    this.lastEventAt = now;
  }

  private flooredBucket(): number {
    return Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS;
  }

  private checkBucketRollover(): void {
    const nowBucket = this.flooredBucket();
    if (nowBucket !== this.bucketStart) {
      this.flush();
      this.bucketStart = nowBucket;
    }
  }

  private flush(): void {
    if (this.keystrokeCount === 0 && this.mouseClickCount === 0 && this.mouseDistancePx === 0) {
      return; // nothing happened this bucket, skip empty upload
    }
    this.onBucketFlush({
      bucketStart: new Date(this.bucketStart).toISOString(),
      keystrokeCount: this.keystrokeCount,
      mouseClickCount: this.mouseClickCount,
      mouseDistancePx: Math.round(this.mouseDistancePx),
      activeSeconds: Math.min(60, Math.round(this.activeMsThisBucket / 1000)),
    });
    this.keystrokeCount = 0;
    this.mouseClickCount = 0;
    this.mouseDistancePx = 0;
    this.activeMsThisBucket = 0;
  }
}
