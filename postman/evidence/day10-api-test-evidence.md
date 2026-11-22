# Day 10 Sanitized API Test Evidence

**Source:** `npm test --prefix apps/api` (Vitest + Supertest), 34 tests passed across 4 files. Repositories were mocked in unit/HTTP tests. Live read-only HTTP checks are recorded separately below. This is not a Postman/Newman run.

| Request scenario | Verified response |
|---|---|
| `POST /auth/register` with valid input | `201`; `data` contains the test user's ID, name, normalized email, `role: customer`, and creation time; no password or password hash |
| `POST /auth/register` with duplicate email | `409`; safe duplicate message; no database code |
| `POST /auth/register` with invalid fields or overlong bcrypt input | `400`; validation message; invalid value/password not echoed |
| `POST /auth/login` with correct password | `200`; user ID and role in a JWT with `exp`; returned user omits password hash |
| `POST /auth/login` with wrong password or unknown email | `401`; same generic message |
| `GET /tickets` without/malformed/invalid/expired bearer token | `401`; `Authentication required` |
| `GET /tickets` with an unauthorized signed role | `403`; `Forbidden` |
| Customer `GET /tickets/{own-id}` | `200`; repository query includes both ticket ID and authenticated creator ID |
| Customer `GET` or `PATCH /tickets/{other-id}` | `404`; repository read/update filters include the authenticated creator ID |
| Agent ticket list | `200`; repository query is not restricted to one creator |
| Customer `POST /tickets` including a forged `creatorId` | `201`; resulting creator ID is the verified JWT user's ID |
| `GET /health` | `200`; Day 9 `{ data, error, meta }` response shape preserved |
| CORS and Helmet | Allowlisted origin header present; unlisted origin header absent; `nosniff` and CSP present |
| Login rate limit | First five attempts allowed to reach login validation; sixth returns `429`; health route remains available |
| Unexpected internal error | `500` with `Internal server error`; internal message absent from response and logs |

## Live read-only verification - 2026-11-21

- Docker container `supportdesk-postgres`: healthy.
- Prisma migration status: one migration found; database schema is up to date.
- Database aggregate counts: 3 users and 52 tickets.
- `npm start --prefix apps/api`: PASS; the API served `/health` with `200`.
- Missing bearer token: `401 Authentication required`.
- Malformed bearer token: `401 Authentication required`.
- Expired bearer token: `401 Authentication required`.
- Unsupported signed role: `403 Forbidden`.
- Customer ticket list: `200` with 51 tickets owned by or visible to the test customer scope.
- Agent ticket list: `200` with 52 tickets.
- Existing customer ticket detail: `200`.
- Customer detail for a real differently-owned ticket: `404 Ticket not found`.
- Agent detail: `200`.
- Customer attempt to set `status` or `assigneeId`: `403 Forbidden`.
- Agent update for a valid nonexistent ticket ID: `404 Ticket not found` and no record should exist.
- Allowlisted CORS origin: `200` and `Access-Control-Allow-Origin: http://localhost:5173`.
- Blocked CORS origin: `200` and no allow-origin response header.
- Helmet headers: `nosniff` and CSP present.
- Wrong login credentials: `401 Invalid email or password`.
- Login limiter: fifth and sixth attempts returned `429`; earlier attempts reached `401`.

JWTs, test password values, local database configuration, and Authorization headers are intentionally omitted. Customer registration/creation and successful customer login, agent login with a real password, agent ticket updates, and Postman/Newman execution remain **NOT VERIFIED** because no account password or write approval was available.

## Complete collection verification - 2026-11-21

The complete JSON collection was executed through Newman from a clean API process. The API limiter was reset by restarting the API before the run.

| Ticket | Actual status | Result |
|---|---:|---|
| 1. Register customer | 201 | PASS |
| 2. Duplicate registration | 409 | PASS |
| 3. Invalid registration | 400 | PASS |
| 4. Login success | 200 | PASS |
| 4a. Register second customer | 201 | PASS |
| 4b. Login second customer | 200 | PASS |
| 4c. Create second customer ticket | 201 | PASS |
| 5. Login failure | 401 | PASS |
| 6. Missing token | 401 | PASS |
| 7. Invalid token | 401 | PASS |
| 8. Expired token | 401 | PASS |
| 9. Wrong role | 403 | PASS |
| 10. Create own ticket | 201 | PASS |
| 11. Customer reads own ticket | 200 | PASS |
| 12. Customer cannot read another customer's ticket | 404 | PASS |
| 13. Agent login | 200 | PASS |
| 14. Agent views all tickets | 200 | PASS |
| 15. Password hash exclusion | 201 | PASS |
| 16. CORS allowed origin | 200 | PASS |
| 17. CORS denied origin | 200 | PASS |
| 18. Helmet security headers | 200 | PASS |
| 19. Login rate limit | 429 on the limited attempts | PASS |

Newman summary:

- 22 test scripts executed
- 33 assertions passed
- 0 test-script failures
- 0 failed requests
- 22 JSON collection items
- 0 duplicate item names

The collection JSON was parsed successfully. Ticket 12 uses `Bearer {{customerToken}}`, validates that the JWT belongs to a customer identity, refreshes a missing or invalid token through customer login, and expects `404` plus `Ticket not found` for a real second-customer ticket.

YAML collection parsing remains **NOT VERIFIED** because no YAML parser is installed in the environment.

## Final clean rerun - 2026-11-21

A second clean API process was started after stopping stale listeners, `/health` returned `200`, and the complete collection was rerun.

- Executed requests: 27 including pre-request setup/login requests
- Test scripts: 22
- Assertions: 33 passed
- Failed requests: 0
- Failed assertions: 0
- Ticket 11: `200`
- Ticket 12: `404`
- Ticket 13: `200`
- Ticket 14: `200`
- Ticket 19: first attempt `401`, subsequent limited attempts `429`, as implemented

API build, test typecheck, and 34 automated API tests passed after the run. The JSON collection remained valid with 22 numbered requests and no duplicate names.
