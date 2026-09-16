# Company Activity Agent (Electron)

Desktop agent that runs on company-owned laptops and reports activity to the
backend. Built for transparent, consent-based employee monitoring — not
covert surveillance.

## What it tracks

- Active application / window title (via `active-win`, polled every 3s)
- Browser tab URLs + page titles (via the companion browser extension, since
  Electron cannot see inside browser tabs directly)
- File downloads (via the browser extension's `chrome.downloads` API)
- System idle time (via Electron's `powerMonitor`)
- **Aggregated** keystroke count and mouse click count, per minute
  (via `uiohook-napi`) — **never the actual keys pressed or typed content**
- **Periodic screenshots** — one snapshot of the primary display every
  10 minutes (see `screenshotTracker.ts`), NOT continuous screen recording.
  Interval is configurable in `screenshotTracker.ts` (`CAPTURE_INTERVAL_MS`).

## What it deliberately does NOT do

- No continuous screen recording (screenshots are periodic snapshots only —
  see above, and disclose the interval in your monitoring policy)
- No keylogging of actual key values or typed text
- No webcam/microphone access
- No reading of file contents, only download metadata (filename, size, source)

> **Update your written monitoring policy** to explicitly mention periodic
> screenshots and their frequency before enabling this — screenshots can
> incidentally capture passwords, personal messages, or banking info visible
> on screen at capture time. This is materially more sensitive than the
> other metrics this agent collects, so employee awareness matters more
> here, not less.

## Project layout

```
src/
  main/
    main.ts            - Electron entry point, tray icon, orchestration
    windowTracker.ts    - active app/window polling
    inputTracker.ts     - keystroke/mouse COUNT tracking
    idleTracker.ts      - idle detection
    extensionBridge.ts  - localhost HTTP server for the browser extension
    syncManager.ts      - batches + uploads data, offline-safe retry queue
    apiClient.ts        - talks to the backend REST API
    localStore.ts       - encrypted local persistence (config, queue)
    deviceId.ts         - stable hardware fingerprint
  renderer/
    setup.html          - first-run configuration window
    setup-renderer.js
  shared/
    types.ts
browser-extension/
  manifest.json         - Manifest V3
  background.js         - tab URL + download tracking
```

## Setup (development)

```bash
npm install
npm run dev
```

On first run, a setup window appears asking for:
- **Server URL** — your backend's base URL
- **Employee Code** — must match a record already created in the admin dashboard
- **Enrollment Key** — the `AGENT_ENROLLMENT_SECRET` from the backend `.env`

> Enrollment will fail with a 403 until an admin has called
> `POST /admin/employees/:id/consent` for that employee — this is intentional,
> it prevents devices from being monitored before the employee has
> acknowledged the policy.

After successful enrollment, the agent runs headless in the system tray.

## Browser extension

The extension is what lets the agent see URLs and downloads (a desktop app
can't read inside Chrome's process). Load it manually during rollout:

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. "Load unpacked" → select the `browser-extension/` folder

For a real company rollout, package this via the Chrome Web Store (private/
unlisted) or push it via Group Policy / Chrome Enterprise management so it's
installed silently on managed devices alongside the desktop agent installer.

## Building an installer

```bash
npm run build:installer
```

Uses `electron-builder` — produces an `.exe` (NSIS) on Windows, `.dmg` on
macOS, `AppImage` on Linux, found in `dist_electron/` (or wherever
electron-builder outputs by default).

## Deployment notes for IT

- Ship the agent installer via your MDM/RMM tool (Intune, Jamf, etc.) so it's
  silently installed on enrolled company laptops.
- Each employee must have `consentSignedAt` set in the admin dashboard
  **before** their device can enroll — build this into your onboarding
  checklist alongside having them read/sign the monitoring policy.
- The tray icon is intentionally always visible — this is a transparency
  choice, not an oversight. Employees should always be able to see the agent
  is running.
- `electron-store` encrypts local config at rest, but replace the placeholder
  `encryptionKey` in `localStore.ts` with a properly managed secret before
  shipping.
