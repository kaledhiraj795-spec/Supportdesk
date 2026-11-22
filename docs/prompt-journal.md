# SupportDesk Prompt Journal

## Entry 1: Understanding Git Commands

- Date: 2026-10-26
- Task: Learn basic Git commands.
- Exact Prompt: Explain git status, git add, git commit, git push, and git diff in simple language. Include their purpose, risks, and verification steps.
- AI Response Summary: Git commands help inspect, stage, save, review, and share project changes.
- Changes or Corrections: Record any changes made after reviewing the AI answer.
- Verification: Record the actual output of the Git commands used.
- Learning: Understand how Git tracks and records project changes.

## Entry 2: Creating Repository Structure

- Date: 2026-10-26
- Task: Create the SupportDesk monorepo structure.
- Exact Prompt: Suggest a repository structure for an API, web app, mobile app, agents, automation, Postman, infrastructure, documentation, and GitHub workflows.
- AI Response Summary: Separate folders organize the different parts of the project.
- Changes or Corrections: Record any differences from the approved roadmap.
- Verification: Compare the actual folders with the roadmap.
- Learning: Organize the repository without implementing future application features.

## Entry 3: Safe Git Collaboration

- Date: 2026-10-26
- Task: Learn the feature branch and Pull Request workflow.
- Exact Prompt: Explain how to create a feature branch, review changes, make a Conventional Commit, push the branch, and open a Pull Request. Include risks and verification steps.
- AI Response Summary: Feature branches isolate work, commits record changes, and Pull Requests allow review before merging.
- Changes or Corrections: Record any corrections made during the actual workflow.
- Verification: Record the branch name, commit hash, push result, and Pull Request status when available.
- Learning: Follow the team's review and approval rules.
## Entry 4: Plan-first Prompting

- Date: 2026-10-28
- Goal/Context: Understand the TypeScript CLI requirements before implementation.
- Prompt Used: I asked AI to explain the task and guide me through implementation step by step.
- AI Response Summary: AI explained ticket ID generation, CSV-to-JSON conversion, validation, testing, and README documentation.
- What I Changed: I followed a step-by-step approach and separated the code into different files.
- Verification: The TypeScript type check completed without reported errors. The CLI converted three sample tickets into JSON.
- Outcome: I understood the main implementation steps. Next time, I should explicitly request a plan only before asking for code.

## Entry 5: Clarifying Questions

- Date: 2026-10-28
- Goal/Context: Understand whether to preserve the existing repository structure.
- Prompt Used: I asked whether the folder structure provided by my sir should be changed or only extended.
- AI Response Summary: AI explained that the original repository structure should be preserved and only the required files should be added.
- What I Changed: I kept the existing repository folders and added files for the CLI.
- Verification: I checked the repository structure and the existing README.
- Outcome: I learned to clarify repository requirements. I should also confirm the ticket ID format, required CSV columns, and invalid-input behaviour before coding.

## Entry 6: Test-first Prompting

- Date: 2026-10-28
- Goal/Context: Verify ticket ID generation and CSV validation using Jest.
- Prompt Used: I used AI assistance to create tests for ticket ID generation and CSV-to-JSON conversion after starting the implementation.
- AI Response Summary: AI suggested tests for valid CSV, missing columns, empty fields, invalid priorities, malformed rows, and ticket ID formats.
- What I Changed: I added tests for both the ticket ID generator and CSV converter.
- Verification: The initial test run reported 12 passed tests before the debugging exercise.
- Outcome: I learned how automated tests check program behaviour. I did not follow test-first in the correct order. Next time, I will request and review the test cases before implementing the feature.

## Entry 7: Structured Debugging

- Date: 2026-10-28
- Goal/Context: Find and fix a deliberately introduced validation bug.
- Prompt Used: I shared the Jest output showing one failed test and eleven passed tests after temporarily removing the high priority value.
- AI Response Summary: AI identified that high priority was missing from the allowed priority list.
- What I Changed: I restored high to the allowed priorities: low, medium, and high.
- Verification: The injected bug caused one test to fail. The final test summary after the fix should be recorded from the actual terminal output.
- Outcome: I learned that a failing test can help identify the cause of a bug. Next time, I should provide the expected behaviour, actual behaviour, error output, relevant code, and steps already tried.

## Entry 8: API Skeleton and MVC in Practice

- Date: 2026-11-18
- Goal/Context: Build a REST API using Express, TypeScript, Zod, and Prisma with a clean MVC architecture.
- Prompt Used: I asked AI to guide me step by step to implement the API skeleton, ticket CRUD endpoints, environment validation, request logging, and centralized error handling.
- AI Response Summary: AI helped implement routes, controllers, services, repositories, validators, middleware, and database integration.
- What I Changed: I created the API structure and implemented GET, POST, and PATCH ticket endpoints. I also added Zod validation, a request logger, and a central error handler.
- Verification: TypeScript build passed. Health endpoint returned 200 OK. Ticket GET returned 200 OK, valid POST returned 201 Created, valid PATCH returned 200 OK, invalid POST/PATCH returned 400 Bad Request, and a nonexistent ticket returned 404 Not Found. Architecture audit confirmed that Prisma is used only in the repository layer.
- Outcome: I learned how requests move through routes, controllers, services, and repositories. I also understood request validation and centralized error handling. Next time, I should plan and verify each architecture layer before implementation.

## Entry 9: Day 10 Authentication and API Security

- Date: 2026-11-20
- Task: Complete the missing Week 2 Day 4 authentication and API security work without rebuilding existing API features.
- Prompt Used: “SupportDesk — Day 10 Authentication & API Security: Complete All Incomplete Tasks.” The request asked for registration/login, JWT authentication, role checks, ticket ownership, API security controls, tests, Postman assets, an OWASP review, and documentation while preserving user changes and avoiding production/shared database use.
- AI Suggestions Accepted: Use the existing Prisma User and Ticket fields; hash passwords with bcrypt; issue short-lived HS256 JWTs from validated configuration; reject the known JWT example placeholder; derive ticket creator and access scope from the verified identity; scope customer reads and updates in Prisma repositories; mock repositories in HTTP tests; keep the existing response envelope; provide Postman placeholders and record whether they were actually executed.
- AI Suggestions Rejected or Deferred: No migration was created because the existing schema and migration already contain password hashes, roles, and ticket ownership. No production/shared database was used. The existing seed's placeholder password hashes were not converted to credentials. A forced Prisma major downgrade was rejected; the compatible `effect@3.22.1` transitive override removed the reported audit finding and Prisma validation still passed. No actual local `.env` values were read or changed.
- Files Changed: API package manifest/lock; `.env.example`; environment configuration; auth controller, middleware, repository, routes, service, types, and validator; ticket controller, repository, routes, service, and validator; error handling; Vitest and test TypeScript configuration; three test files and test setup; API environment setup in README; Postman collection/environment/evidence; this journal and `docs/day10-eod-report.md`. The EOD report lists every file and its purpose.
- Verification:
  - `npm run build --prefix apps/api` — PASS.
  - `npm run typecheck:test --prefix apps/api` — PASS.
  - `npm test --prefix apps/api` — PASS, 34 tests across 4 files.
  - `Push-Location apps\api; npx prisma validate --schema prisma\schema.prisma; Pop-Location` — PASS.
  - `npm ci --dry-run --ignore-scripts --prefix apps/api` — PASS, lockfile/dependency tree accepted.
  - `npm audit --prefix apps/api` and `npm audit --omit=dev --prefix apps/api` — PASS, 0 vulnerabilities after pinning the compatible Prisma transitive dependency.
  - Postman JSON parse — PASS.
  - Newman/Postman collection execution and live PostgreSQL integration — NOT VERIFIED; Newman and an approved test database were unavailable.
  - Follow-up `npm start --prefix apps/api` — PASS on 2026-11-21; the server started and `/health` returned `200`.
- Learning: The ticket owner must be used inside repository predicates, including updates; hiding a ticket in a controller is not enough. Tests can verify the MVC boundary without touching any database. `dotenv/config` resolves `.env` from the process working directory: the npm `--prefix` command uses `apps/api`, but its existing ignored `.env` had only `DATABASE_URL`. The root `.env` is for infrastructure and is not merged. The local `.env` was not modified; configure its missing API keys manually using the new README instructions. Postman agent/other-customer fixtures also need approved test data.

## Entry 10: Full API End-to-End Audit

- Date: 2026-11-20
- Task: Re-audit the complete API, Prisma/database integration, environment loading, endpoint behavior, tests, and Postman assets while preserving existing user data.
- Prompt Used: “Perform a complete end-to-end audit of the entire SupportDesk API, not just the Day 10 authentication issue.” The request required safe verification, focused fixes, no destructive database actions, and a final report with actual evidence.
- AI Suggestions Accepted: Preserve the existing schema and migration; verify local database connectivity with a read-only query and migration status; return consistent JSON errors for unknown routes; reject malformed ticket IDs before repository calls; keep customer ownership enforcement in Prisma repositories; use environment-provided passwords and bcrypt for newly seeded sample users while not overwriting existing seed records.
- AI Suggestions Rejected or Deferred: No `.env` file or database record was changed. No seed execution or Postman run was completed. No YAML parser was installed. API startup still requires operator-provided `JWT_SECRET` and `CORS_ORIGINS`. A seed typecheck was not run because the permitted TypeScript project configuration excludes the Prisma seed file; an alternate invocation bypassing that configuration was denied and not retried.
- Files Changed: `apps/api/src/app.ts`, `apps/api/src/controllers/tickets.controller.ts`, `apps/api/src/validators/tickets.schema.ts`, `apps/api/tests/auth-api.test.ts`, `apps/api/prisma/seed.ts`, `apps/api/package.json`, `apps/api/.env.example`, `README.md`, and this journal plus `docs/day10-eod-report.md`.
- Verification:
  - `npm run build --prefix apps/api` — PASS.
  - `npm run typecheck:test --prefix apps/api` — PASS.
  - `npm test --prefix apps/api` — PASS, 27 tests across 3 files.
  - `npx prisma validate` from `apps/api` — PASS.
  - `npx prisma migrate status` from `apps/api` — PASS; one migration applied and schema up to date.
  - Local PostgreSQL read-only `SELECT 1` — PASS.
  - `npm audit --prefix apps/api` — PASS, 0 vulnerabilities.
  - Postman collection/environment JSON parsing — PASS, 19 requests and 16 environment variables.
  - API startup — FAIL with missing `JWT_SECRET` and `CORS_ORIGINS`; no values were read or changed.
  - Newman/Postman execution, YAML parsing, API integration against an isolated database, and seed execution — NOT VERIFIED.
- Learning: A successful database connection does not justify running API writes or seed operations against a populated development database. Repository-level filters are the authorization boundary for ticket ownership. Local Postman environments can contain sensitive values even when exported collection JSON uses placeholders; inspect and protect environment files before sharing.

## Entry 11: Sample Agent and Ownership Test Fixtures

- Date: 2026-11-21
- Task: Make the Day 10 sample-agent login setup safe and make the Postman customer-ownership case use a real second customer's ticket.
- Prompt Used: “Continue the remaining Day 10 Authentication & API Security work based on your previous investigation and findings.” The request authorized only focused changes, required a safe create-only agent configuration, a response-driven second-customer flow, tests, and documentation; database writes and service startup were prohibited.
- AI Suggestions Accepted: Use a dedicated loopback-only setup command instead of the broad seed; bcrypt-hash the configured sample password; create only when absent; no-op on a bcrypt match; fail without changing an existing password on mismatch; save IDs and tokens from actual Postman responses; keep agent password values local and secret-scoped.
- AI Suggestions Rejected or Deferred: No automatic password reset was added. The setup command was not executed, no seed or migration ran, and no database service was started. Live Postman execution remains unverified because the local database connection previously returned `ECONNREFUSED`.
- Files Changed: `apps/api/src/services/sample-agent-setup.ts`, `apps/api/prisma/setup-sample-agent.ts`, `apps/api/tests/sample-agent-setup.test.ts`, `apps/api/package.json`, `apps/api/tsconfig.test.json`, `README.md`, `postman/SupportDesk-Day10-Authentication.postman_collection.json`, `postman/SupportDesk-Day10-Local.postman_environment.json`, four existing Postman request/definition resources, three new Postman request resources, and this journal plus `docs/day10-eod-report.md`.
- Verification:
  - `npm run build --prefix apps/api` — PASS.
  - `npm run typecheck:test --prefix apps/api` — PASS; includes the new setup script.
  - `npm test --prefix apps/api` — PASS, 33 tests across 4 files.
  - `git diff --check` — PASS with only existing line-ending warnings.
  - Postman collection and exported environment JSON parse — PASS; 22 collection requests.
  - Live database integration, setup command, and Postman execution — NOT VERIFIED / NOT RUN, per safety requirements and database availability.
- Learning: A fixture initializer should be narrower than the project seed and should never silently rotate an existing account's password. Ownership tests need to create the other customer's resource through the same authenticated API path and use its returned ID, rather than relying on a placeholder UUID.

## Entry 12: Ticket Querying, Comments and API Documentation

- Date: 2026-11-22
- Task: Implement and verify Week 2 Day 11 ticket querying, comments, OpenAPI documentation, unit/integration tests, and test-first workflow.
- Prompt Used: “Complete master prompt for SupportDesk Day 11, including pagination, filters, search, sorting, comments, Swagger documentation, tests, coverage, security, Docker/database safety, documentation and Git branch isolation.”
- AI Suggestions Accepted: Extend the existing MVC and Prisma repository architecture; validate query parameters with Zod; use allowlisted sort fields; apply customer scope before Prisma queries and in totals; force comment authorship from verified identity; prevent customer internal comments; serve a Swagger UI backed by an actual OpenAPI document; preserve the existing response envelope.
- AI Suggestions Rejected or Deferred: No database schema or migration was added. No production/shared development records were changed for integration tests. The existing Vitest/Supertest framework was retained instead of replacing it with Jest; meaningful unit and Supertest coverage was added under that framework. No commit or merge was created.
- Files Changed: `apps/api/src/validators/tickets.query.ts`, `apps/api/src/validators/comments.schema.ts`, `apps/api/src/repositories/tickets.repository.ts`, `apps/api/src/repositories/comments.repository.ts`, `apps/api/src/services/tickets.service.ts`, `apps/api/src/services/comments.service.ts`, `apps/api/src/controllers/tickets.controller.ts`, `apps/api/src/controllers/comments.controller.ts`, `apps/api/src/routes/comments.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/docs/openapi.ts`, `apps/api/package.json`, `apps/api/tests/day11-query.test.ts`, `apps/api/tests/day11-comments.test.ts`, `apps/api/tests/day11-integration.test.ts`, `docs/day-11-final-report.md`, and this journal.
- Verification:
  - Baseline API build — PASS.
  - Baseline test typecheck — PASS.
  - Baseline API tests — 34 passed.
  - Test-first query suite failed before implementation because `tickets.query.ts` was missing, then passed after implementation with 4 tests.
  - Final API build — PASS.
  - Final test typecheck — PASS.
  - Final API suite — 49 tests passed across 7 files.
  - Coverage — statements 89.44%, branches 84.43%, functions 94.2%, lines 89.54%; services 95.31% lines.
  - `/docs/` live — PASS, HTTP 200 and HTML.
  - Live invalid query — PASS, HTTP 400.
  - Live paginated ticket query — PASS, HTTP 200 with scoped meta totals.
  - Existing migration applied to isolated `supportdesk_test`; synthetic integration records were cleaned after tests.
  - Day 9/10 and CLI regressions remain separately identifiable and were not replaced by the new suite.
- Learning: Authorization scope must be duplicated consistently across data queries and count queries, otherwise pagination totals leak or misrepresent inaccessible records. Comment visibility is safest when enforced in the repository query and reinforced when creating comments by author role.

## Entry 13: Day 12 Code Review and Final Verification

- Date: 2026-11-22
- Task: Perform a complete SupportDesk Day 12 code review, fix confirmed issues, rerun API/Postman and automated verification, and produce final evidence.
- Prompt Used: “Complete Week 2 Day 6 Overall Day 12 code review, bug fixing, API testing and final report.”
- AI Review Focus: Actual route/controller/service/repository evidence, JWT and role authorization, customer ownership, Prisma scope, query validation, OpenAPI accuracy, comments visibility, test stability and sensitive logging.
- Issues Fixed: Completed OpenAPI request schemas, normalized empty search, removed duplicated ticket `where` construction, serialized Vitest test files, and fixed the search validator after it was temporarily made required during implementation.
- Deferred: No lint script exists. Newman emitted a deprecation warning for global `atob` in one Postman test script, but it did not fail and the three relevant assertions passed.
- Verification:
  - API build: PASS.
  - Test typecheck: PASS.
  - API tests: PASS, 50/50.
  - Coverage: PASS, 89.54% lines overall and 95.31% service lines.
  - Ticket CLI tests: PASS, 12/12.
  - npm audit: PASS, 0 vulnerabilities.
  - Prisma migration status: PASS, schema up to date.
  - Live health/docs/query/comments: PASS.
  - Newman Day 10 collection: PASS, 27 executed requests, 33 assertions, 0 failed requests/assertions.
  - `git diff --check`: PASS with existing line-ending warnings.

## Entry 14: Day 13 Frontend Foundations

- Date: 2026-11-22
- Task: Scaffold the SupportDesk web app, implement login/session handling, protected routes, shared API access and the minimal ticket-list foundation.
- Backend Contract: `POST /auth/login` accepts `{ email, password }` and returns the standard envelope containing `{ token, user }`; protected API requests use bearer JWTs. No server logout or refresh endpoint exists.
- Implementation: Added the React/Vite/TypeScript/Tailwind app, React Router and TanStack Query foundation, typed API client, session-storage auth helpers, React Hook Form login, protected routes, client-side sign-out and ticket query/list states. Added focused API-client, login and route tests.
- Dependencies: React 19.3.1, Vite 8.3.8, TypeScript 7.0.2, Tailwind CSS 4.3.5, React Router 7.18.6, TanStack Query 5.108.2, React Hook Form 7.92.0, Vitest 5.1.1 and Testing Library.
- CORS: Existing API allowlist already included `http://localhost:5173`; no backend security changes were needed. A live preflight returned HTTP 204 with `Access-Control-Allow-Origin: http://localhost:5173`. An unlisted origin received no allow-origin header.
- Verification:
  - `npm run typecheck --prefix apps/web` — PASS.
  - `npm run build --prefix apps/web` — PASS; Vite built 79 modules.
  - `npm test --prefix apps/web` — PASS; 8 tests across 3 files.
  - `npm audit --prefix apps/web` — PASS; 0 vulnerabilities.
  - Vite dev server — PASS; page and transformed entry returned HTTP 200. Browser smoke test redirected `/` to `/login` and displayed required-field validation.
  - Requester-reported live workflow: database-backed login for `mynewemail@gmail.com` succeeded; invalid credentials returned an authentication error; `/tickets` rendered live ticket data. These account-specific results were not independently repeated in this session because no password was provided.
  - `apps/web/.env` is ignored by the repository `.gitignore`; `.env.example` contains only the local API base URL.
- Limitations: Requester-reported login and live ticket outcomes are recorded as such; they were not independently reproduced. UI authentication behavior was exercised with controlled API responses in component tests. No password or token was recorded.