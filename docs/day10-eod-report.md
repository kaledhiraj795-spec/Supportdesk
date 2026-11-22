# SupportDesk Day 10 EOD — Authentication & API Security

Date: 2026-11-20
Branch: `feat/api-development`

## Completion checklist

| Requirement | Status | Evidence |
|---|---|---|
| Current branch/worktree inspected; unrelated work preserved | PASS | Branch is `feat/api-development`; pre-existing CLI config edit and untracked files were left untouched |
| API `.env` setup documented and placeholder secrets rejected | PASS | API `.env.example`, setup instructions in README, and environment validation tests |
| API server starts with the current local `.env` | PASS (2026-11-21) | `npm start --prefix apps/api` served `/health` successfully with the existing local configuration |
| Registration and bcrypt password storage | PASS | Registration HTTP tests; bcrypt comparison confirms stored value is a hash |
| Duplicate email and input validation | PASS | Tests expect 409 duplicate and 400 invalid input |
| Password/hash excluded from public responses | PASS | Registration and login response tests |
| Login and expiring JWT | PASS | Tests verify user ID, role, and `exp` claim |
| Missing, malformed, invalid, expired token handling | PASS | Four HTTP cases return 401 |
| Role authorization | PASS | Unauthorized role gets 403 |
| Customer ticket ownership and agent-wide access | PASS | HTTP tests plus repository query tests for customer filtering and agent-wide reads |
| Helmet, explicit CORS, login-only limiter, safe errors/logging | PASS | HTTP tests cover headers, allow/deny origins, 429, and sanitized failures |
| Day 9 health/ticket behavior | PASS | Health envelope, authenticated create/read/update, validation, and 404 regression cases |
| Prisma schema/migration change | PASS | Not needed; existing User/Ticket schema and migration already support the feature |
| Postman assets created | PASS | Collection and placeholder environment are present |
| Postman execution | NOT VERIFIED | Collection/environment JSON is valid, but no Newman/Postman run was executed |
| Local PostgreSQL connectivity and migration state | PASS (2026-11-21) | Docker reported `supportdesk-postgres` healthy; read-only Prisma status reported one migration and the database schema up to date |
| API integration tests against an isolated test database | NOT VERIFIED | The reachable database is the local development database; no API writes or seed operation were run against it |

The authentication implementation passes its isolated tests. Current startup status is not verified; earlier startup results and later environment changes are distinguished in the follow-up section. “NOT VERIFIED” items are intentionally not reported as passing.

## Completed implementation

- `POST /auth/register` validates name/email/password, normalizes email, hashes with bcrypt (12 rounds), and always assigns `customer`.
- `POST /auth/login` uses the same generic 401 for unknown email and wrong password, then returns an HS256 JWT with an explicit expiry.
- `requireAuth` rejects missing or invalid bearer tokens; `requireRole` returns 403 when a verified identity has a role not admitted by the ticket routes.
- Ticket creation takes `creatorId` from the verified identity. Customer list/detail/update Prisma queries include the authenticated creator ID; inaccessible ticket IDs return 404. Agent queries are not customer-scoped.
- Helmet, a validated explicit CORS origin list, and a login-only limit of five attempts per 15 minutes are configured. Logs and error responses omit request credentials and internal exception details.
- Existing database schema and migration were not changed. The API configuration example contains placeholders only; no `.env` values were displayed and the existing `.env` was not modified.

## Automated verification (actual results)

| Command | Result |
|---|---|
| `npm run build --prefix apps/api` | PASS — TypeScript build completed |
| `npm run typecheck:test --prefix apps/api` | PASS — test and source types checked |
| `npm test --prefix apps/api` | PASS — 27 tests passed across 3 files |
| `Push-Location apps\api; npx prisma validate --schema prisma\schema.prisma; Pop-Location` | PASS — schema valid |
| `npm ci --dry-run --ignore-scripts --prefix apps/api` | PASS — dependency lockfile accepted |
| `npm audit --prefix apps/api` | PASS — 0 vulnerabilities |
| `npm audit --omit=dev --prefix apps/api` | PASS — 0 vulnerabilities |
| `npx prisma migrate status` from `apps/api` | PASS — one migration found; database schema is up to date |
| Read-only local PostgreSQL `SELECT 1` | PASS — returned `1` |
| Postman collection/environment JSON parse | PASS — both files parsed as JSON; collection contains 19 requests |
| `npm run dev --prefix apps/api` using current local configuration | FAIL — required JWT/CORS variables are absent |
| Newman/Postman collection run | NOT VERIFIED — Newman unavailable |
| Postman YAML workspace resources | NOT VERIFIED — no YAML parser is installed |
| PostgreSQL-backed API integration test | NOT VERIFIED — the available database is not an isolated test database |

Automated API tests use mocked repositories and a test-only secret/database URL. The read-only connectivity and migration checks do not prove that API writes work against PostgreSQL or prove deployed configuration.

## OWASP review

| OWASP area | Confirmed finding before this work | Severity | Remediation and evidence |
|---|---|---:|---|
| A01 Broken Access Control | Ticket handlers were mounted without authentication; ticket repository queries did not scope customer records. Ticket creation accepted client `creatorId`. | High | Bearer auth and role checks now protect ticket routes; creator identity comes from JWT; customer reads and atomic updates scope Prisma filters by creator ID. Repository and HTTP ownership tests pass. |
| A07 Identification and Authentication Failures | No registration/login, password verification, JWT expiry/verification, or login throttling existed. | High | bcrypt registration/login, expiring HS256 token verification, generic credential errors, and login-only rate limiting added. Corresponding HTTP tests pass. |
| A05 Security Misconfiguration | No Helmet headers or explicit CORS allowlist were configured. | Medium | Helmet and validated, non-wildcard CORS origins added. Allowed/blocked origin and security-header tests pass. |
| A09 Security Logging and Monitoring Failures | Error middleware logged the complete error object, which could include database internals. | Medium | Error logs now contain only exception name and status; response details stay generic. A test verifies internal details are absent from logs and responses. |
| A03 Injection | No confirmed injection finding in the reviewed ticket queries; Prisma ORM methods are used and no raw SQL was found. | No finding | No change claimed. |

The initial dependency audit reported the high-severity `effect` ReDoS advisory through Prisma CLI's `@prisma/config`. The compatible Prisma 7 transitive dependency was pinned to `effect@3.22.1`; Prisma validation and the full npm audit then passed. No forced major-version downgrade was used.

## Follow-up configuration audit

The startup failure was reproduced directly. `dotenv/config` resolves `.env` relative to the process working directory; npm's `--prefix apps/api` invocation runs the API package from `apps/api`. The ignored `apps/api/.env` currently has only the `DATABASE_URL` key, while the repository-root `.env` contains infrastructure keys and is not merged into that API process. The root and API environment files were inspected for variable names only; their values were not displayed. The API `.env.example` contains placeholder entries for JWT and CORS, and the root README now explains which file to configure while preserving an existing `DATABASE_URL`.

The safe dotenv probe from `apps/api` reported only booleans: database URL configured, root-only `POSTGRES_USER` not loaded, JWT missing, and CORS missing.

The API `.env` was deliberately left untouched. The local server remains blocked until an operator adds a random `JWT_SECRET` (minimum 32 characters) and an explicit `CORS_ORIGINS` value. The example JWT placeholder is now rejected by validation so it cannot silently become the signing key. Server startup after real local configuration is **NOT VERIFIED**.

## Postman and sanitized evidence

- Collection: [`SupportDesk-Day10-Authentication.postman_collection.json`](../postman/SupportDesk-Day10-Authentication.postman_collection.json)
- Placeholder environment: [`SupportDesk-Day10-Local.postman_environment.json`](../postman/SupportDesk-Day10-Local.postman_environment.json)
- Sanitized automated HTTP evidence: [`day10-api-test-evidence.md`](../postman/evidence/day10-api-test-evidence.md)

The collection has actual requests for the requested success/failure paths, with local/test placeholders. Agent login, another-customer ticket ID, an expired token, and a valid signed wrong-role token need approved local test fixtures. The seed code now hashes environment-provided passwords for newly created sample users and leaves existing rows unchanged; previously seeded users with placeholder hashes remain unable to log in. The collection has not been run in Postman/Newman. A separate untracked local Postman environment contains a non-placeholder password-like value; it was left unchanged and must not be shared or committed unless confirmed synthetic.

## Risks and next steps

1. Manually add a randomly generated `JWT_SECRET` (at least 32 characters) and explicit `CORS_ORIGINS` to the existing `apps/api/.env`, preserving its current `DATABASE_URL`. Follow the [API local setup instructions](../README.md#api-local-development); do not use the example placeholder as a secret.
2. Provide an approved isolated PostgreSQL test database and valid test customer/agent accounts before running database integration or Postman checks.
3. Use a valid, signed expired token and a valid, signed unsupported-role token in Postman; never put a production secret/token in the exported environment.
4. Admin tickets currently follow the agent-wide access scope. Confirm that this is the intended admin policy before production use.
5. Do not use the test setup's dummy URL/secret outside automated tests.
6. Configure distinct local seed passwords only if intentionally running the seed against a local development database. The seed command was not run; execution was blocked by tool permissions, and the seed source was not typechecked because the permitted project configuration excludes it.

## Git/worktree notes

No commit, push, merge, or branch switch was performed. The pre-existing `tools/ticket-cli/tsconfig.json` modification and unrelated untracked root/API skill files remain untouched. The current untracked `.postman/` metadata and `postman/collections`, `postman/environments`, and `postman/globals` assets were also left untouched. No `.env` file was staged or modified.

## Day 10 file inventory

**Modified**

- `apps/api/package.json` — security/test dependencies and runnable scripts.
- `apps/api/package-lock.json` — dependency lockfile and compatible Prisma transitive security pin.
- `apps/api/prisma/seed.ts` — environment-provided bcrypt passwords and no-overwrite upserts for existing records.
- `apps/api/src/app.ts` — Helmet, CORS, and auth route registration.
- `apps/api/src/config/env.ts` — validated JWT and CORS configuration; rejects example JWT placeholders.
- `apps/api/src/controllers/tickets.controller.ts` — derive creator from identity, scoped service calls, safe validation details, and ticket-ID validation.
- `apps/api/src/middlewares/error-handler.ts` — safe logs and generic error responses.
- `apps/api/src/repositories/tickets.repository.ts` — owner-scoped reads and updates.
- `apps/api/src/routes/tickets.routes.ts` — protect ticket routes.
- `apps/api/src/services/tickets.service.ts` — pass verified identity to repositories.
- `apps/api/src/validators/tickets.schema.ts` — remove client-controlled creator field and validate ticket IDs.
- `README.md` — documents API env-file loading and safe local setup.
- `docs/prompt-journal.md` — Day 10 task and verification entry.

**Created**

- `apps/api/.env.example` — placeholder-only environment template.
- `apps/api/src/controllers/auth.controller.ts`
- `apps/api/src/middlewares/auth.ts`
- `apps/api/src/repositories/auth.repository.ts`
- `apps/api/src/routes/auth.routes.ts`
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/types/auth.ts`
- `apps/api/src/types/express.d.ts`
- `apps/api/src/validators/auth.schema.ts`
- `apps/api/tests/auth-api.test.ts`
- `apps/api/tests/env.test.ts` — checks weak and placeholder JWT secrets and wildcard CORS rejection.
- `apps/api/tests/setup.ts`
- `apps/api/tests/tickets.repository.test.ts`
- `apps/api/tsconfig.test.json`
- `apps/api/vitest.config.mts`
- `docs/day10-eod-report.md`
- `postman/SupportDesk-Day10-Authentication.postman_collection.json`
- `postman/SupportDesk-Day10-Local.postman_environment.json`
- `postman/evidence/day10-api-test-evidence.md`

## Follow-on full API audit

The follow-on audit confirmed the route → controller → service → repository layering, Prisma use confined to repositories, the existing schema/migration relationship, customer-scoped ticket reads and updates, and agent-wide access. No migration or database record was changed. Unknown paths now return the standard JSON 404 envelope, and malformed ticket IDs return 400 before reaching Prisma. Focused HTTP tests cover these fixes and safe malformed-JSON handling.

The current local API startup still fails at environment validation because the ignored `apps/api/.env` has no `JWT_SECRET` or `CORS_ORIGINS`. No secret was generated or stored, and the file was not changed. The read-only PostgreSQL checks passed, but no ticket/auth API database writes, seed, Postman/Newman run, or isolated integration test was performed.

The YAML Postman workspace resources could not be parsed because no YAML parser is installed. The JSON collection and environment parsed successfully. A local untracked Postman environment was found to include a non-placeholder password-like value; it was not printed, changed, or staged to preserve user data. Confirm it is synthetic and keep the file local.

The seed script now requires two distinct configured local passwords, stores bcrypt hashes only for newly created sample users, and uses empty update branches so rerunning does not overwrite existing user or ticket rows. Existing sample user rows with the former placeholder hashes are intentionally untouched. Seed execution and an independent typecheck of that Prisma script remain NOT VERIFIED: a permission gate blocked seed execution, and an alternate compiler invocation that bypassed the project TypeScript configuration was also denied and not retried.

## Sample-agent and Postman ownership follow-up — 2026-11-21

### Completed

- Added `npm run db:setup-sample-agent --prefix apps/api`, a separate narrow operation from the broad Day 8 seed. It only accepts a loopback PostgreSQL URL, validates the configured agent password, creates `day8.agent@supportdesk.test` with a bcrypt hash only if absent, does nothing when an existing agent's bcrypt password matches, and fails without changing the existing password if it differs or the account has a different role.
- Added unit tests for absent-account creation/hash storage, matching-password no-op, password mismatch without mutation, role mismatch, password input validation, and local-database URL restrictions.
- Set the exported Postman environment's `agentEmail` to the documented sample email. `agentPassword` remains a placeholder secret variable with setup instructions; no password or token was added.
- Added a collection flow to register and log in a second customer, save the returned user ID and token, create a ticket with that customer's token, and save the actual returned ticket ID to `otherTicketId`. The first customer's request then uses that generated ID and expects the controller's 404 for a ticket outside the customer's repository scope.
- The first customer's ticket request now sends the real second customer ID as a spoofed `creatorId` and asserts that the returned ticket is still owned by the authenticated first customer.
- Updated the README and Prompt Journal with the local setup and test instructions. No `.env` file, database record, migration, or restricted YAML environment was changed.

### Verification results

| Command/check | Result |
|---|---|
| `npm run build --prefix apps/api` | PASS |
| `npm run typecheck:test --prefix apps/api` | PASS; includes `prisma/setup-sample-agent.ts` |
| `npm test --prefix apps/api` | PASS — 33 tests across 4 files |
| `git diff --check` | PASS; only existing line-ending warnings |
| Parse exported Postman collection/environment JSON | PASS — valid JSON; 22 collection requests and required variables present |
| Sample-agent setup command | NOT RUN — it can write a user row, and execution was explicitly prohibited |
| Postman collection against the API | NOT RUN — no live Postman execution was authorized/performed |
| Database-backed API / agent existence verification | NOT VERIFIED — the last loopback PostgreSQL connection attempt returned `ECONNREFUSED`; no database service was started |

### Manual setup and remaining limitations

1. When an approved local database is available, add a locally chosen `SUPPORTDESK_SEED_AGENT_PASSWORD` (12–72 UTF-8 bytes) to the ignored `apps/api/.env`, preserving every existing value. Do not share or commit it.
2. Run `npm run db:setup-sample-agent --prefix apps/api` only after deciding that creating the documented sample agent in that local database is appropriate. The command will not update an existing password. If it reports a mismatch, stop and request a separately approved password-management operation; do not rerun or use the broad seed to force an update.
3. In the local Postman environment, set `customerPassword` and set the secret `agentPassword` to the same local sample-agent password. Keep those values out of the exported collection and source control.
4. With the API configured and an approved test database available, run the collection from the beginning. Its second-customer flow saves `otherTicketId` from the create response; the ownership request should return 404. Run the rate-limit request separately after the limiter window is clear.

The local database was unavailable at the last read-only probe, so whether the sample agent exists remains unknown. Neither the setup command nor the Postman collection was executed; only source-level unit tests, typecheck, build, and JSON parsing are reported as passing.

### Follow-up file inventory

**Created**

- `apps/api/src/services/sample-agent-setup.ts`
- `apps/api/prisma/setup-sample-agent.ts`
- `apps/api/tests/sample-agent-setup.test.ts`
- Three Postman request resources: second-customer registration, login, and ticket creation.

**Modified**

- `apps/api/package.json` — adds the isolated setup command.
- `apps/api/tsconfig.test.json` — typechecks the new setup script.
- `README.md` — documents safe agent setup and Postman execution.
- `postman/SupportDesk-Day10-Authentication.postman_collection.json` — response-driven setup and ownership assertions.
- `postman/SupportDesk-Day10-Local.postman_environment.json` — documented sample email and local-only password instructions.
- Accessible Postman collection definition and login, ticket setup, agent login, and cross-customer request resources.
- `docs/prompt-journal.md` and this report.
