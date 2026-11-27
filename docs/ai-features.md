# SupportDesk AI Features Documentation

## 1. Overview

SupportDesk integrates AI assistance for support agents (`agent` and `admin` roles) while keeping final authority with human staff:

- **Auto-Categorise (`POST /api/tickets/:id/ai/categorise`)**: Suggests a structured `category` and `priority` for a support ticket for agent review/application.
- **Suggest Reply (`POST /api/tickets/:id/ai/suggest-reply`)**: Generates a draft customer-support response based on the ticket subject, description, and recent comments so an agent can review, edit, and post it manually.

---

## 2. API Endpoints & Access Control

Defined in `apps/api/src/routes/tickets.routes.ts` (mounted under tickets routes with `requireAuth` and role checks):

| Method | Endpoint | Allowed Roles | Middleware & Handler | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/:id/ai/categorise` | `agent`, `admin` | `aiRateLimiter`, `categoriseTicket` | Suggests category and priority for a ticket |
| `POST` | `/:id/ai/suggest-reply` | `agent`, `admin` | `aiRateLimiter`, `suggestReply` | Generates a draft reply for agent review |

Manual ticket operations remain independent of AI endpoints:
- `GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets`, `PATCH /api/tickets/:id` (`apps/api/src/routes/tickets.routes.ts`)
- `GET /:ticketId/comments`, `POST /:ticketId/comments` (`apps/api/src/routes/comments.routes.ts`)

---

## 3. Prompt Versions & Structured Output Validation

### Prompt Files
- **Auto-Categorise**: `apps/api/src/ai/prompts/auto-categorise.v1.ts` (`PROMPT_VERSION = "auto-categorise-v2"`)
- **Suggest Reply**: `apps/api/src/ai/prompts/suggest-reply.v1.ts` (`PROMPT_VERSION = "suggest-reply-v5"`)

### Strict Schema (`apps/api/src/ai/ai.schemas.ts`)
Category suggestions are validated using Zod (`ticketAiSuggestionSchema` with `.strict()`):
- **Allowed Categories**: `Account`, `Billing`, `Technical Support`, `General`
- **Allowed Priorities**: `P1`, `P2`, `P3`, `P4`

Any output that does not match the strict schema is rejected rather than blindly applied.

---

## 4. Security Guardrails, Privacy & Human-in-the-Loop

### Prompt Injection & Untrusted Data Isolation
- Customer ticket subjects, descriptions, and comments are treated strictly as **untrusted data**, never as privileged system commands.
- `apps/api/src/ai/guardrails.ts` sanitizes control characters, blocks boundary spoofing tags (`<ticket>`, `<ticket_description>`, `<customer_message>`, `<recent_comments>`), escapes triple backticks (`escapePromptText`), and enforces length limits (`prepareUntrustedText` / `truncateText`).
- Both system prompts explicitly forbid leaking system instructions, API keys, credentials, or performing unauthorized account/status changes.

### PII & Secret Redaction
`maskSensitiveText` in `apps/api/src/ai/guardrails.ts` masks sensitive patterns before/during prompt preparation, including:
- Passwords/passcodes/OTPs (`[credential]`, `[verification-code]`)
- Google API keys (`AIza...`) and other API/bearer/GitHub tokens (`[credential]`)
- Email addresses (`[email]`), payment card numbers (`[payment-card]`), phone numbers (`[phone]`), and personal IDs (`[personal-id]`)

`containsUnsafeSecrets` checks for secret/credential leakage or unsupported action claims.

### Safety Settings, Rate Limiting & Human Review
- **Gemini Safety Settings** (`apps/api/src/ai/safety.ts`): Configured with `HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE` across harassment, hate speech, sexually explicit content, and dangerous content.
- **Rate Limiting** (`apps/api/src/middlewares/ai-rate-limit.ts`): AI endpoints are rate-limited per authenticated user (`AI_RATE_LIMIT_WINDOW_MS`, `AI_RATE_LIMIT_MAX`).
- **Human Review**: Suggested replies are drafts for human review and editing; agents post comments and update ticket status intentionally.

---

## 5. Error Handling & Manual Fallback

- Provider/configuration issues (`apps/api/src/ai/errors.ts`, `apps/api/src/ai/provider-error.ts`, `apps/api/src/ai/ai.service.ts`, and usage logging in `apps/api/src/ai/usage-logger.ts`) surface clear API error responses (such as `AI provider request failed`) without crashing the application.
- **Fallback Behavior**: If the AI service or API key is unavailable or returns an error, agents can still read tickets, post manual comments (`POST /:ticketId/comments`), and update ticket fields/status (`PATCH /:id`) normally.

---

## 6. Evaluation Status & Limitations

- **Official Labelled Category/Priority Evaluation**: Currently **BLOCKED** pending the lead-supplied 20-ticket labelled dataset (`npm run ai:evaluate -- <20-labelled-tickets.json> --report <path>` via `apps/api/src/ai/evaluation.cli.ts`). No official accuracy percentage is claimed without that dataset. See `docs/day-17-evaluation-report.md` for details.
- **Synthetic Reply Evaluation**: Recorded in `docs/day-17-evaluation-report.md` (run on `gemini-3.5-flash-lite` with `suggest-reply-v4` baseline, 24/26 successful provider attempts across 20 cases, followed by prompt hardening to `suggest-reply-v5`).
- **Known Limitations**:
  - Regex-based PII masking helps reduce exposure but cannot guarantee catching every custom or unstructured identifier format.
  - Model responses can still occasionally be verbose, conservative, or require agent editing before sending.
  - Official benchmark accuracy awaits the lead's 20-ticket dataset.

---

## 7. Local Setup (Using `.env.example`)

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Set required environment variables in `apps/api/.env` (do **not** commit real secrets or API keys):
   - `DATABASE_URL`
   - `JWT_SECRET` (32+ characters)
   - `GEMINI_API_KEY` (your local Gemini API key)
   - `GEMINI_API_MODE` (`developer` or `vertex`)
   - `GEMINI_MODEL` (e.g., `gemini-3.5-flash-lite` or configured model)
   - `GEMINI_REQUEST_TIMEOUT_MS` and `AI_*` / `AI_RATE_LIMIT_*` limits as needed
3. Start the API and web servers and verify `/health` and the AI workflows.