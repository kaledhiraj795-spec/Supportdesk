# Day 17 EOD — AI Security, Guardrails and Evaluation

## Completed implementation

- Added Gemini safety settings for harassment, hate speech, sexually explicit, and dangerous content. Provider moderation settings are attached to both categorisation and reply-generation requests.
- Added a configurable `GEMINI_REQUEST_TIMEOUT_MS` (default 30 seconds), set it in the Gemini client, and map request/stream timeouts to safe 504 errors.
- Changed AI endpoint throttling to use authenticated user IDs, after staff-role authorization. One staff user's quota no longer consumes another user's quota.
- Added the exact UI fallback text: **“AI unavailable — reply manually.”** The comment composer remains editable and posting manual replies is still enabled after generation fails.
- Added tests showing ticket creation, ticket updates, and manual comment posting remain available after an AI timeout.
- Added a repeatable labelled-ticket evaluator. It requires exactly 20 unique supplied records, does not create missing data, attempts records sequentially, and reports category, priority, and exact-match accuracy.
- Corrected the Day 17 security report to distinguish prompt-construction tests from live model testing.
- Manual edits made during an active AI reply stream are preserved; later chunks no longer overwrite the agent's text.
- Investigated the login-ticket suggestion mismatch. The API forwards the requested ticket ID and loads that ticket's own data; no cross-ticket cache or context reuse was found. The UI did retain composer state across ticket routes and appended regenerated AI drafts. Ticket changes now clear state and cancel stale streams, regeneration replaces prior generated text, and the reply prompt now requires issue-specific grounding.
- Added regressions for the exact route ticket ID, isolated refund/profile/payment/login provider contexts, draft replacement, and composer reset on ticket navigation.
- The original login ticket and provider exchange were not available, so the exact observed generic support-form answer cannot be reproduced or attributed conclusively.
- Follow-up: Prompt `suggest-reply-v5` retains the complete reply structure and adds restrictions against unsupported future actions, sensitive data requests, and repeated questions. The ticket subject remains a first-class context field.
- Live synthetic reply re-evaluation: 18 previously weak cases were regenerated with in-memory fixtures; combined with two unchanged passing cases, the six-criterion result is 101/120 = 16.83/20 = 84.17%. The 80% target is met, but 10 cases still miss at least one criterion; this is not an official labelled-ticket accuracy result.

## Verification

- Final verification (26 November 2026): `apps/api` source typecheck — PASS; test typecheck — PASS.
- Final verification (26 November 2026): `apps/api` full Vitest suite — PASS, 121 tests across 16 files.
- Final verification (26 November 2026): `apps/web` typecheck — PASS; full Vitest suite — PASS, 71 tests across 14 files.
- Focused password-masking/provider-output tests — PASS, 43 tests across 2 API files; streaming-composer regression — PASS, 18 tests in the ticket detail file.
- Historical API totals: 111 tests at the earlier Day 17 verification and 119 after the prior security follow-up. Both are superseded by the final 121-test run above.
- Historical web total: 70 tests across 14 files before the streaming-composer regression; superseded by the final 71-test run above.
- `git diff --check` — PASS.
- The full API suite used the isolated `supportdesk_test` database with synthetic fixtures; no production data or database was accessed.
- Focused tests — PASS: moderation settings, per-user request quota separation, timeout settings/handling, full stream interruption, exact manual fallback, and manual ticket operations following AI failure.
- Evaluator no-argument validation — expected refusal, exit code 2 with usage. It did not contact Gemini.
- Existing unrelated worktree changes were not staged, reset, or overwritten.

## Pending

- The lead's 10 malicious samples and 20 labelled evaluation tickets remain unavailable.
- No live Gemini moderation or accuracy run was possible without supplied data and an authorized provider configuration.
- No official accuracy is claimed.
