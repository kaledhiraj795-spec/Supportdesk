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