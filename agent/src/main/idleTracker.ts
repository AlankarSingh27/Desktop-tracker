import { powerMonitor } from "electron";
import { IdleLogPayload } from "../shared/types";

const IDLE_THRESHOLD_SEC = 120; // 2 minutes of no input = idle
const CHECK_INTERVAL_MS = 15_000;

export class IdleTracker {
  private isIdle = false;
  private idleStartedAt: Date | null = null;
  private timer: NodeJS.Timeout | null = null;
  private onIdleEnd: (log: IdleLogPayload) => void;

  constructor(onIdleEnd: (log: IdleLogPayload) => void) {
    this.onIdleEnd = onIdleEnd;
  }

  start(): void {
    this.timer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private check(): void {
    const idleSeconds = powerMonitor.getSystemIdleTime();

    if (idleSeconds >= IDLE_THRESHOLD_SEC && !this.isIdle) {
      this.isIdle = true;
      this.idleStartedAt = new Date(Date.now() - idleSeconds * 1000);
      return;
    }

    if (idleSeconds < IDLE_THRESHOLD_SEC && this.isIdle) {
      this.isIdle = false;
      const idleEnd = new Date();
      if (this.idleStartedAt) {
        const durationSec = Math.round((idleEnd.getTime() - this.idleStartedAt.getTime()) / 1000);
        this.onIdleEnd({
          idleStart: this.idleStartedAt.toISOString(),
          idleEnd: idleEnd.toISOString(),
          durationSec,
        });
      }
      this.idleStartedAt = null;
    }
  }
}
