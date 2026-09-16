import { desktopCapturer, screen } from "electron";

const CAPTURE_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes - periodic, not continuous
const JPEG_QUALITY = 70;

/**
 * Captures one screenshot of the primary display at a fixed interval.
 * This is intentionally periodic (a snapshot every N minutes), not
 * continuous screen recording - matching what the monitoring policy
 * should disclose to employees.
 */
export class ScreenshotTracker {
  private timer: NodeJS.Timeout | null = null;
  private onCapture: (jpegBuffer: Buffer, capturedAt: Date) => void;

  constructor(onCapture: (jpegBuffer: Buffer, capturedAt: Date) => void) {
    this.onCapture = onCapture;
  }

  start(): void {
    // capture once shortly after start, then on the fixed interval
    this.captureOnce().catch(console.error);
    this.timer = setInterval(() => this.captureOnce().catch(console.error), CAPTURE_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async captureOnce(): Promise<void> {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height },
    });

    const primarySource = sources[0];
    if (!primarySource) return;

    const jpegBuffer = primarySource.thumbnail.toJPEG(JPEG_QUALITY);
    this.onCapture(jpegBuffer, new Date());
  }
}
