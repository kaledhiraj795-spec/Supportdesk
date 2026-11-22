# SupportDesk

## Project Overview
SupportDesk is a project for support-related application development.

## Repository Structure
- apps/api: Backend API
- apps/web: React and Vite web application
- apps/mobile: Expo mobile application
- agents: Future AI agents
- automation/n8n: Automation workflows
- postman: API collections
- infra: Infrastructure and deployment files
- docs: Documentation and Prompt Journal
- .github/workflows: Future CI/CD workflows

## Current Status
The API includes authenticated ticket endpoints, customer registration and login,
and security middleware. Local API startup requires the environment setup below.

## Development Workflow
1. Create a feature branch.
2. Review changes before committing.
3. Use Conventional Commits.
4. Open a Pull Request.
5. Merge only after required approval.

## Security
Never commit passwords, API keys, access tokens, or real credentials.

## API Local Development

The API reads its environment from `apps/api/.env` when run with
`npm run dev --prefix apps/api`. The repository-root `.env` is used by the
local infrastructure setup and is not merged into the API environment.

- If `apps/api/.env` does not exist, copy `apps/api/.env.example` to that path,
  then set `DATABASE_URL` to the local development database.
- If `apps/api/.env` already exists, do not overwrite it. Preserve its database
  configuration and add only any missing API settings.
- Set `JWT_SECRET` to a cryptographically random value of at least 32
  characters. The `.env.example` value is only a placeholder and is rejected
  by environment validation.
- Set `CORS_ORIGINS` to a comma-separated list of exact local HTTP/HTTPS
  origins, for example `http://localhost:5173`. Wildcards and URL paths are
  rejected.

Keep both `.env` files local and uncommitted. Start the API from the repository
root with `npm run dev --prefix apps/api`.

The optional Day 8 sample-data seed is run with
`npm run db:seed --prefix apps/api`. Configure distinct
`SUPPORTDESK_SEED_CUSTOMER_PASSWORD` and `SUPPORTDESK_SEED_AGENT_PASSWORD`
values in `apps/api/.env` first. The seed stores bcrypt hashes and leaves
existing user and ticket records unchanged. Existing sample users created by an
older seed with placeholder password hashes are not repaired by reseeding.

To configure only the sample agent without running the broad Day 8 seed, set
`SUPPORTDESK_SEED_AGENT_PASSWORD` in the ignored `apps/api/.env` and run
`npm run db:setup-sample-agent --prefix apps/api`. This command is restricted
to loopback PostgreSQL URLs. It creates the sample agent if absent, is a no-op
when the existing bcrypt password matches, and refuses to replace a different
existing password. No password reset option is provided; an existing mismatch
requires an explicitly approved separate password-management action. The
command writes one user only when that sample agent is absent. It was not run
while implementing this flow.

For the Day 10 Postman collection, set `customerPassword` in the local
environment to a test password that meets registration validation. Set
`agentPassword` as a secret to the same value configured in
`SUPPORTDESK_SEED_AGENT_PASSWORD`; `agentEmail` is already set to
`day8.agent@supportdesk.test`. Do not put real passwords or tokens into
collection files or commit the local environment.

Run the collection from the beginning against an approved local test database.
It registers/logs in a second customer, creates that customer's ticket, and
saves the returned ticket ID to `otherTicketId` before the first customer
attempts access. The expected ownership response is 404. Run the login-rate
limit request separately after its limit window is clear.

## TypeScript Ticket CLI

The Ticket CLI generates ticket IDs and converts CSV ticket records into JSON.

### Requirements
- Node.js
- npm

### Setup

From the SupportDesk repository root, run:

```bash
cd tools/ticket-cli
npm install
```

### Run the CLI

From the `tools/ticket-cli` directory, run:

```bash
npm start -- data/sample-tickets.csv
```

The output is saved to `data/tickets.json`.

To choose a different output file:

```bash
npm start -- data/sample-tickets.csv data/custom-output.json
```

### CSV Input Format

The CSV file must contain these columns:

- `title`
- `description`
- `priority`

Allowed priority values are `low`, `medium`, and `high`.

Example:

```csv
title,description,priority
Login issue,Unable to log in,high
Payment issue,Payment not updated,medium
```

### Ticket ID Format

`SD-YYYYMMDD-XXXXXXXX`

- `SD` identifies SupportDesk.
- `YYYYMMDD` represents the date.
- `XXXXXXXX` is an eight-character uppercase hexadecimal random suffix.

The random suffix does not guarantee global uniqueness.

### Run Tests

From the `tools/ticket-cli` directory, run:

```bash
npm test
npm run typecheck
npm run build
```

The CLI reports errors for missing required columns and malformed CSV input.