# Mamlaka User UI

The customer-facing frontend for the Mamlaka virtual card application. It talks to the
FastAPI backend in the parent directory and renders the **application journey** — the
seven steps a customer goes through to get a card, updated live as Wasabi reviews their
KYC.

React 18 · TypeScript · Tailwind CSS · Vite · React Router.

---

## Quick start

```bash
# 1. Start the backend (from the parent directory)
cd ../
.venv/bin/python -m uvicorn app.main:app --reload

# 2. Start the UI
cd user-ui-application
npm install
npm run dev
```

Open **http://localhost:5173**.

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`, so the browser only ever
sees one origin — no CORS preflight in development.

To point the dev server at a different backend:

```bash
VITE_PROXY_TARGET=http://192.168.1.50:8000 npm run dev
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on port 5173 |
| `npm run build` | Type-check then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript only, no emit |

---

## How it connects to the backend

| Layer | File | Responsibility |
|---|---|---|
| Transport | `src/api/client.ts` | Base URL, bearer token, error unwrapping |
| Endpoints | `src/api/api.ts` | One typed function per backend route |
| Types | `src/api/types.ts` | The exact shapes the backend returns |

**Token handling.** The JWT is kept in `localStorage` and attached automatically. On a
401 or 403 the session is cleared and the user is bounced to `/login`.

**Error handling.** FastAPI returns `{"detail": "..."}`; `client.ts` turns that into a
real `Error` with a message that can be shown to a human. Pydantic validation errors
(`[{loc, msg}]`) are flattened to the first message.

**Live updates.** `src/hooks/useJourney.ts` combines two sources on purpose:

1. A **poll every 20 seconds** — always works, survives a proxy that kills SSE.
2. A **Server-Sent Events stream** — pushes a new journey the instant a Wasabi webhook
   arrives, so the user sees the approval without refreshing.

If the stream drops it reconnects after 5 seconds, and the poll keeps the UI correct
meanwhile. The header shows a green **Live** badge when the stream is connected.

> The SSE endpoint takes the token as `?token=` because the browser's `EventSource` API
> cannot set an `Authorization` header. The backend also accepts the header, and prefers
> it when present.

---

## The screens

| Route | Screen | What it does |
|---|---|---|
| `/` | Landing | Public marketing page, redirects to the dashboard if signed in |
| `/register` | Register | Account creation with live password-policy feedback |
| `/login` | Login | Sign in, shows the account-lockout message |
| `/verify-email` | Verify email | Consumes the `?token=` from the email link |
| `/dashboard` | Dashboard | **The journey tracker** — the main screen |
| `/kyc/documents` | KYC documents | Drag-and-drop upload of the three documents |
| `/kyc/details` | KYC details | The identity form, and the card-issuance screen |
| `/cards` | My cards | The customer's cards |
| `/cards/:cardNo` | Card detail | Balance, freeze/cancel, deposit/withdraw, reveal details |
| `/wallet` | Wallet | M-Pesa top-up with live status polling |
| `/profile` | Profile | Account details and password change |

### The journey tracker

`src/components/JourneyStepper.tsx` renders the ordered steps with a status badge, a
description, and a call-to-action button on the current step. The `nextAction` field from
the API tells the UI which endpoint the user should hit next, so the flow stays in sync
with the backend even if the backend changes.

---

## Backend endpoints this UI needs

| Endpoint | Used for |
|---|---|
| `POST /api/v1/users/register` | Account creation |
| `POST /api/v1/users/login` | Sign in |
| `POST /api/v1/users/verify-email` | Confirm the email address |
| `POST /api/v1/users/resend-verification` | New verification link |
| `GET /api/v1/users/me` | Profile / session check |
| `POST /api/v1/users/change-password` | Password change |
| `GET /api/v1/journey` | The journey snapshot |
| `GET /api/v1/journey/stream` | Live journey updates (SSE) |
| `GET /api/v1/journey/events/history` | Application event history |
| `GET /api/v1/cards/supported-BINS/types` | The card products offered |
| `GET /api/v1/cards/list-BINS` | The customer's cards |
| `POST /api/v1/cards/info` / `balance` / `sensitive` | Card details |
| `POST /api/v1/cards/kyc/upload` | Document upload (`kind` = front/back/selfie) |
| `GET /api/v1/cards/kyc/documents` | Uploaded file ids, to pre-fill the KYC form |
| `POST /api/v1/cards/cardholder/register` | Submit the KYC |
| `PUT /api/v1/cards/cardholder/{id}` | Resubmit a rejected KYC |
| `POST /api/v1/cards/create` | Request the card |
| `POST /api/v1/cards/freeze` / `unfreeze` / `cancel` | Card controls |
| `POST /api/v1/cards/deposit` / `withdraw` | Move money to and from the card |
| `GET /api/v1/wallet` | Balance |
| `POST /api/v1/wallet/topup` | M-Pesa STK push |
| `GET /api/v1/wallet/topups/{id}` | Top-up status |

---

## Production build

```bash
npm run build      # -> dist/
```

The `dist/` folder is static. Serve it behind the same host as the API so the browser
sees one origin, and let nginx route `/api` to the backend and everything else to the
static files. See `deploy/nginx-cards.conf` in the parent directory.

```nginx
location / {
    root /var/www/mamlaka-user-ui;
    try_files $uri $uri/ /index.html;   # SPA fallback
}
location /api/ {
    proxy_pass http://127.0.0.1:8000;
}
```

If the UI is served from a different origin than the API, set `VITE_API_URL` at build
time and add that origin to the backend's `CORS_ORIGINS`.

---

## Design notes

- **No component library.** The handful of primitives in `src/components/ui.tsx` are
  plain Tailwind, so there is no runtime cost and full control over the look.
- **Accessible.** Labelled inputs, `aria-invalid` on errors, visible focus rings,
  `role="alert"` on error banners, and a real `<progressbar>` for the journey.
- **Mobile first.** The layout collapses to a single column with a scrolling tab bar.
- **Brand colours** live in `tailwind.config.js` under `brand.*` (a deep green).
