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
Week 1, Day 4: Initial repository structure and Git setup.
Application features have not been implemented yet.

## Development Workflow
1. Create a feature branch.
2. Review changes before committing.
3. Use Conventional Commits.
4. Open a Pull Request.
5. Merge only after required approval.

## Security
Never commit passwords, API keys, access tokens, or real credentials.
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