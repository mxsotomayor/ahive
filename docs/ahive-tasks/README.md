# Ahive Implementation Tasks

Status: **Execution backlog**  
Created: **2026-07-29**  
Source assessment: [status-before-become-ahive.md](../../status-before-become-ahive.md)

This directory is the implementation ledger for evolving Maxwell into Ahive.
Tasks are intentionally small, ordered, and independently verifiable.

## Working rules

1. Implement tasks in numeric order unless a dependency explicitly permits otherwise.
2. Only one task may have status **In progress** at a time.
3. Before coding, read the active task and every listed dependency.
4. Keep existing private data and external identities intact.
5. Never mark a task complete until every approval criterion passes.
6. Update this index and the task file in the same change that completes the task.
7. Record material architectural decisions in `docs/decisions/`.
8. Do not silently expand a task's scope. Create another task when necessary.
9. External writes, repository mutations, and credential changes remain explicit.
10. Run the verification specified by the task plus the full regression suite when relevant.

## Status values

- **Pending:** not started.
- **In progress:** active implementation task.
- **Blocked:** cannot proceed until a documented dependency or decision is resolved.
- **Complete:** all approval criteria have passed.

## Backlog

| ID | Task | Depends on | Status |
| --- | --- | --- | --- |
| [001](001-reframe-product-specification.md) | Reframe the product specification | — | Complete |
| [002](002-adopt-agent-safety-constitution.md) | Adopt agent safety principles | 001 | Complete |
| [003](003-accept-agent-domain-model.md) | Accept the agent domain model | 001, 002 | Complete |
| [004](004-decide-persistence-strategy.md) | Decide and prove the persistence strategy | 003 | Complete |
| [005](005-add-database-migrations.md) | Add the database and migration framework | 004 | Complete |
| [006](006-migrate-neutral-workspace-data.md) | Migrate existing neutral workspace data | 005 | Complete |
| [007](007-add-repository-domain.md) | Add Repository persistence and API | 006 | Complete |
| [008](008-secure-repository-paths.md) | Validate and constrain repository paths | 007 | Complete |
| [009](009-add-repository-git-inspection.md) | Add read-only Git repository inspection | 008 | Complete |
| [010](010-build-repository-management-ui.md) | Build Repository management UI | 009 | Complete |
| [011](011-add-harness-accounts.md) | Add Harness Account configuration | 006 | Complete |
| [012](012-add-agent-profiles.md) | Add Agent Profile configuration | 011 | Complete |
| [013](013-add-agent-assignments.md) | Add project-scoped Agent Assignments | 007, 012 | Complete |
| [014](014-build-agent-management-ui.md) | Build the Agent management surface | 012, 013 | Complete |
| [015](015-add-agent-tasks-and-conversations.md) | Persist Agent Tasks and Conversations | 013 | Complete |
| [016](016-spike-openai-harness.md) | Prove the Codex CLI harness boundary | 011, 015 | Complete |
| [017](017-implement-chat-only-agent-runs.md) | Implement chat-only Agent Runs | 016 | Complete |
| [018](018-stream-runs-and-support-cancellation.md) | Stream run events and support cancellation | 017 | Complete |
| [019](019-build-agent-conversation-ui.md) | Build the conversational task UI | 014, 018 | Complete |
| [020](020-add-read-only-repository-tools.md) | Add constrained read-only repository tools | 009, 018 | Complete |
| [020a](020a-build-agent-repository-explorer.md) | Build the Agent Repository explorer | 019, 020 | Complete |
| [021](021-add-run-approval-model.md) | Add durable run approvals | 018 | Complete |
| [022](022-manage-isolated-git-worktrees.md) | Manage isolated Git worktrees | 008, 021 | Complete |
| [023](023-add-guarded-code-editing.md) | Add guarded code editing | 020, 022 | Complete |
| [024](024-add-test-command-policies.md) | Add approved test command execution | 023 | Complete |
| [025](025-persist-run-artifacts.md) | Persist run summaries and artifacts | 023, 024 | Complete |
| [026](026-build-run-review-ui.md) | Build diff, test, and approval review UI | 019, 025 | Complete |
| [027](027-connect-issues-to-agent-tasks.md) | Connect Issues to Agent Tasks | 015, 026 | Complete |
| [028](028-add-explicit-issue-writeback.md) | Add approved Issue status write-back | 027 | Complete |
| [029](029-add-run-recovery-and-observability.md) | Add recovery and operational visibility | 018, 025 | Complete |
| [030](030-complete-agent-mvp-acceptance.md) | Complete the first Agent MVP | 026–029 | Pending |
| [031](031-add-opencode-harness-provider.md) | Accept the OpenCode CLI Harness provider | 011, 016 | Complete |
| [032](032-run-opencode-read-only-agent-turns.md) | Run OpenCode read-only Agent turns | 031 | Complete |

Task 031 was implemented ahead of the pending Task 030 at the product owner's
direction; it changes no Codex behavior and does not alter the MVP acceptance
scope.

## Milestones

- **Specification accepted:** 001–003
- **Durable foundation:** 004–006
- **Repository registry:** 007–010
- **Agent configuration:** 011–014
- **Conversational agents:** 015–019
- **Safe repository work:** 020–026
- **Issue-to-agent workflow:** 027–028
- **MVP hardening:** 029–030
- **Additional harness providers:** 031–032
