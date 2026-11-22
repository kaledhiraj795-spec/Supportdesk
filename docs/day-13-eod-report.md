# Week 3 — Day 13 EOD Report: Frontend Foundations

## Overview

Scaffolded `apps/web` as the SupportDesk React frontend, verified the existing backend login contract, and implemented a real API-backed login flow, protected routes, shared API client and minimal ticket-list query states. No API source code or security policy was changed.

## Stack Installed

- React and React DOM 19.3.1
- Vite 8.3.8 with `@vitejs/plugin-react` 6.3.0
- TypeScript 7.0.2
- Tailwind CSS 4.3.5 with `@tailwindcss/vite`
- React Router 7.18.6
- TanStack Query 5.108.2
- React Hook Form 7.92.0
- Vitest 5.1.1, jsdom 29.1.1, Testing Library and user-event

`npm audit` reported zero vulnerabilities.

## Implemented

- Shared typed fetch client reads `VITE_API_BASE_URL`, unwraps `{ data, error, meta }`, sends bearer tokens for protected API requests, converts network failures to a safe user-facing error and clears the local session on authenticated 401 responses.
- Auth helpers validate and store `{ token, user }` in session storage. Login uses `POST /auth/login` with the backend's `{ email, password }` request shape. The backend returns a token and public user data.
- Responsive login form uses React Hook Form, field validation, accessible error messages, disabled/loading submit state, and server/network error banners.
- Protected routes send unauthenticated users to `/login` and signed-in users away from that page. Sign out clears the client session only; no server logout/refresh behavior was invented.
- The authenticated layout provides responsive navigation and user identity. The tickets starter feature fetches `/tickets` via the shared client and TanStack Query and displays loading, empty, error and list states.
- `apps/web/.env.example` contains `VITE_API_BASE_URL=http://localhost:3000`. A local `.env` was created for development and is ignored by the repository `.gitignore`.

## Backend CORS Verification

The existing API middleware uses the explicit `CORS_ORIGINS` allowlist. Both the API example and local configuration include `http://localhost:5173`; no change was required.

- Allowed-origin `OPTIONS /auth/login` preflight: **HTTP 204**, `Access-Control-Allow-Origin: http://localhost:5173`.
- Unlisted-origin preflight: no `Access-Control-Allow-Origin` header; browser access remains blocked.

## Verification Results

| Command or check | Result |
|---|---|
| `npm run typecheck --prefix apps/web` | PASS — `tsc --noEmit`, exit code 0 |
| `npm run build --prefix apps/web` | PASS — Vite 8.3.8; 79 modules transformed |
| `npm test --prefix apps/web` | PASS — 3 test files, 8 tests |
| `npm audit --prefix apps/web` | PASS — 0 vulnerabilities |
| Vite dev-server smoke test | PASS — page and transformed entry returned HTTP 200 |
| Browser smoke test | PASS — `/` redirected to `/login`; empty submit showed both required-field errors |
| `git check-ignore apps/web/.env` | PASS — local environment file ignored |

The tests cover API envelope/token behavior, authenticated 401 cleanup, network errors, login validation/submission/loading/server errors, and protected-route redirects.

## Live Authentication and Ticket Verification

The requester reported that live verification against the local API and database succeeded:

- `mynewemail@gmail.com` logged in successfully with a real database-backed account.
- An invalid-credentials attempt returned the expected authentication error.
- `/tickets` rendered live ticket data after login.

These account-specific results are requester-reported and were not independently repeated during this commit session because no account password was provided. No password or token is recorded here. Independently verified in this session: local API `/health` returned HTTP 200, the allowed Vite CORS preflight returned HTTP 204, and the browser login route rendered and validated required fields.
