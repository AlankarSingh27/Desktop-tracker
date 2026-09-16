# Employee Activity Tracker — Full System

Consent-based employee activity monitoring for **company-owned devices**.
Three parts:

| Part | Tech | What it does |
|---|---|---|
| `backend/` | Express + TypeScript + MongoDB | REST API, auth, aggregation, Swagger docs |
| `agent/` | Electron + TypeScript | Runs on employee laptops, collects & uploads activity |
| `dashboard/` | React + TypeScript + Vite | Admin web UI to view activity, manage employees |

See each folder's own `README.md` for details specific to that part. This
file covers running the **backend + dashboard** together via Docker.

## Quick start (Docker Compose)

```bash
cp .env.example .env
# edit .env: set real values for JWT_ADMIN_SECRET, JWT_AGENT_SECRET,
# AGENT_ENROLLMENT_SECRET (use `openssl rand -hex 32` for each)

docker compose up -d --build
```

This starts three containers:
- **mongo** — MongoDB 7, data persisted in a named volume (`mongo-data`)
- **backend** — API server on `http://localhost:5000`, Swagger docs at
  `http://localhost:5000/api-docs`
- **dashboard** — built React app served by nginx on `http://localhost:8080`

## Create the first admin login

The seed script needs to run once, inside the backend container (it's not
part of the image's default CMD):

```bash
docker compose exec backend node dist/utils/seedAdmin.js
```

Or override the email/password:

```bash
docker compose exec -e SEED_ADMIN_EMAIL=you@company.com -e SEED_ADMIN_PASSWORD=SomeStrongPassword! backend node dist/utils/seedAdmin.js
```

Then log in at `http://localhost:8080`.

## Adding an employee end-to-end

1. Dashboard → **Employees** → *Add Employee* (name, email, employee code,
   department, hire date)
2. Click **Mark Consent Signed** once they've actually read/signed your
   monitoring policy — enrollment is blocked until this is set
3. On the employee's laptop, run the Electron agent (see `agent/README.md`)
   and enter:
   - **Server URL**: wherever your backend is reachable from that laptop
     (e.g. `http://<your-server-ip>:5000` — not `localhost` unless the agent
     runs on the same machine as the backend)
   - **Employee Code**: matches what you entered in step 1
   - **Enrollment Key**: your `AGENT_ENROLLMENT_SECRET` value
4. Load the browser extension from `agent/browser-extension/` (see that
   README for Chrome Web Store / Group Policy notes for a real rollout)
5. Activity should start appearing on the **Live Dashboard** within a
   few minutes

## Networking notes

- `VITE_API_BASE_URL` / `VITE_SOCKET_URL` are baked into the dashboard at
  **build time** (Vite limitation) — they must be the address a *browser on
  an admin's machine* can reach, not the internal Docker network name. If
  you deploy behind a real domain, rebuild the dashboard image with the
  correct values.
- `CORS_ORIGIN` on the backend must match the dashboard's actual origin, or
  the browser will block API calls.
- For real production use: put this behind HTTPS (nginx/Caddy reverse proxy
  or a load balancer with TLS termination), restrict access to your VPN/
  internal network, and use MongoDB Atlas or a properly backed-up mongo
  deployment instead of a local Docker volume.

## Stopping / resetting

```bash
docker compose down          # stop containers, keep data
docker compose down -v       # stop containers AND delete the mongo volume
```

## Compliance checklist (repeat from backend README — don't skip)

- [ ] Written monitoring policy distributed and signed before any device enrolls
- [ ] Login banner/notice on monitored devices
- [ ] Policy explicitly discloses periodic screenshots and their frequency
      (every 10 min by default) — screenshots can capture passwords/personal
      info visible on screen, so this needs clear employee awareness
- [ ] No keystroke *content* is ever captured (by design — see `agent/README.md`)
- [ ] Data retention period defined and enforced — `SCREENSHOT_RETENTION_DAYS`
      env var exists but auto-deletion is not wired up by default; add a
      scheduled cleanup job if you need enforcement
- [ ] Legal/HR sign-off on compliance with local labor law (e.g. India's
      IT Act 2000 / DPDP Act, or GDPR if you have EU employees) — screenshot
      capture in particular may need extra scrutiny depending on jurisdiction
