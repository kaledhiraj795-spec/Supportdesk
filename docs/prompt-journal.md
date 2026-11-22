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
