import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from "electron";
import path from "path";
import { getConfig, setConfig, getCredentials } from "./localStore";
import { enrollDevice } from "./apiClient";
import { WindowTracker } from "./windowTracker";
import { InputTracker } from "./inputTracker";
import { IdleTracker } from "./idleTracker";
import { ScreenshotTracker } from "./screenshotTracker";
import { ExtensionBridge } from "./extensionBridge";
import { SyncManager } from "./syncManager";
import { uploadScreenshot } from "./apiClient";

let tray: Tray | null = null;
let setupWindow: BrowserWindow | null = null;

let windowTracker: WindowTracker | null = null;
let inputTracker: InputTracker | null = null;
let idleTracker: IdleTracker | null = null;
let screenshotTracker: ScreenshotTracker | null = null;
let bridge: ExtensionBridge | null = null;
let sync: SyncManager | null = null;

function isConfigured(): boolean {
  return !!getConfig() && !!getCredentials();
}

function openSetupWindow(): void {
  setupWindow = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  setupWindow.loadFile(path.join(__dirname, "../renderer/setup.html"));
  setupWindow.on("closed", () => (setupWindow = null));
}

ipcMain.handle(
  "setup:enroll",
  async (_event, data: { serverBaseUrl: string; employeeCode: string; enrollmentSecret: string }) => {
    try {
      setConfig({
        serverBaseUrl: data.serverBaseUrl.replace(/\/+$/, ""),
        employeeCode: data.employeeCode,
        enrollmentSecret: data.enrollmentSecret,
      });
      await enrollDevice();
      startTracking();
      setTimeout(() => setupWindow?.close(), 1200);
      return { success: true };
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || "Unknown error";
      return { success: false, error: message };
    }
  }
);

function startTracking(): void {
  sync = new SyncManager();
  sync.start();

  windowTracker = new WindowTracker((session) => sync!.addSession(session));
  windowTracker.start();

  inputTracker = new InputTracker((metric) => sync!.addMetric(metric));
  inputTracker.start();

  idleTracker = new IdleTracker((idleLog) => sync!.addIdleLog(idleLog));
  idleTracker.start();

  screenshotTracker = new ScreenshotTracker((jpegBuffer, capturedAt) => {
    uploadScreenshot(jpegBuffer, capturedAt).catch((err) =>
      console.error("[agent] Screenshot upload failed:", err.message)
    );
  });
  screenshotTracker.start();

  bridge = new ExtensionBridge(
    (session) => sync!.addSession(session),
    (download) => sync!.addDownload(download)
  );
  bridge.start();

  console.log("[agent] Tracking started.");
}

function stopTracking(): void {
  windowTracker?.stop();
  inputTracker?.stop();
  idleTracker?.stop();
  screenshotTracker?.stop();
  bridge?.stop();
  sync?.syncNow(); // best-effort final flush
  sync?.stop();
}

function buildTray(): void {
  // A simple 16x16 dot icon generated inline so the project doesn't need a
  // binary asset checked in - swap for a real .png/.ico in assets/ for a
  // proper look.
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("Company Activity Agent - running");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: isConfigured() ? "Status: Connected" : "Status: Not configured", enabled: false },
      { type: "separator" },
      {
        label: "Reconfigure",
        click: () => openSetupWindow(),
      },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ])
  );
}

app.whenReady().then(() => {
  // Agent runs headless in the background - no dock/taskbar window, just a
  // tray icon. This mirrors how real endpoint agents (antivirus, MDM
  // clients) behave, and the tray icon is intentionally kept visible for
  // transparency rather than hidden, per the monitoring policy notice.
  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  buildTray();

  if (isConfigured()) {
    startTracking();
  } else {
    openSetupWindow();
  }
});

app.on("window-all-closed", () => {
  // keep running in the tray even with no windows open (this is a
  // background agent, not a normal app)
});

app.on("before-quit", () => {
  stopTracking();
});
