import activeWindow from "active-win";
import { ActivitySessionPayload } from "../shared/types";

interface CurrentSession {
  appName: string;
  windowTitle: string;
  startTime: Date;
}

const POLL_INTERVAL_MS = 3000;

export class WindowTracker {
  private current: CurrentSession | null = null;
  private timer: NodeJS.Timeout | null = null;
  private onSessionEnd: (session: ActivitySessionPayload) => void;

  constructor(onSessionEnd: (session: ActivitySessionPayload) => void) {
    this.onSessionEnd = onSessionEnd;
  }

  start(): void {
    this.timer = setInterval(() => this.poll().catch(console.error), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.flushCurrent();
  }

  private async poll(): Promise<void> {
    const win = await activeWindow();
    if (!win) return; // e.g. lock screen, permission denied on some platforms

    const appName = win.owner?.name || "Unknown";
    const windowTitle = win.title || "";

    if (!this.current) {
      this.current = { appName, windowTitle, startTime: new Date() };
      return;
    }

    // same app+title -> still the same continuous session, keep going
    if (this.current.appName === appName && this.current.windowTitle === windowTitle) {
      return;
    }

    // focus changed -> close out the previous session, start a new one
    this.emitCurrent();
    this.current = { appName, windowTitle, startTime: new Date() };
  }

  private emitCurrent(): void {
    if (!this.current) return;
    const endTime = new Date();
    const durationSec = Math.round((endTime.getTime() - this.current.startTime.getTime()) / 1000);

    // ignore noise: sub-second focus flicker isn't a meaningful session
    if (durationSec < 1) return;

    this.onSessionEnd({
      category: "app",
      appName: this.current.appName,
      windowTitle: this.current.windowTitle,
      startTime: this.current.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSec,
    });
  }

  private flushCurrent(): void {
    this.emitCurrent();
    this.current = null;
  }
}
