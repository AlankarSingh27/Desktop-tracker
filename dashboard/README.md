# Activity Admin Dashboard (React + TypeScript + Vite)

Admin dashboard for the employee activity monitoring system. Talks to the
Express/MongoDB backend's `/api/admin/*` routes.

## Features

- JWT login (`AuthContext`, token stored in `localStorage`)
- **Live Dashboard** — employees currently online (polls every 15s + Socket.io
  push nudges an immediate refresh when new activity arrives)
- **Employees** — create employees, mark monitoring consent as signed
  (required before their device can enroll — see backend), deactivate
  offboarded employees
- **Employee Detail** — active time / idle time / keystroke & click totals /
  downloads count, a top-apps bar chart (Recharts), a periodic screenshot
  gallery (click to view full-size), and a chronological activity timeline
- **Leaderboard** — company-wide ranking by active time
- **Downloads** — company-wide download feed, filterable by source domain

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL / VITE_SOCKET_URL at your backend
npm run dev
```

Runs on `http://localhost:3000` by default (see `vite.config.ts`). Make sure
the backend's `CORS_ORIGIN` env var matches this.

## Structure

```
src/
  api/
    client.ts       - axios instance, JWT header injection, 401 handling
    endpoints.ts     - typed API call functions
  context/
    AuthContext.tsx  - login state
    useLiveSocket.ts - socket.io hook for live updates
  components/
    Layout.tsx           - sidebar shell
    ProtectedRoute.tsx    - route guard
  pages/
    LoginPage.tsx
    LiveDashboardPage.tsx
    EmployeesPage.tsx
    EmployeeDetailPage.tsx
    LeaderboardPage.tsx
    DownloadsPage.tsx
  types/index.ts     - shared types mirroring backend responses
```

## First login

Use the admin account created by the backend's `npm run seed:admin` script
(defaults to `admin@company.com` / `ChangeMe123!` unless overridden via
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars).

## Build for production

```bash
npm run build
```

Outputs static files to `dist/` — serve behind your usual reverse proxy
(nginx, Cloudflare Pages, etc.), restricted to your internal network / VPN
since this is an internal HR/IT tool.
