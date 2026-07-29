# 030: Complete the First Agent MVP

Status: **Pending**  
Depends on: **026, 027, 028, 029**

## Description

Validate the complete local Agent workflow, close documentation gaps, and
declare the first Ahive Agent MVP complete only when the agreed scenario works.

## Objective

Deliver a reliable workflow in which a configured OpenAI Agent can inspect a
registered Repository, discuss an Issue-backed task, make approved isolated
changes, run approved tests, and present results for human review.

## In scope

- Full end-to-end acceptance scenario.
- Security and regression test pass.
- Documentation, setup, recovery, and troubleshooting guides.
- Feature status and decision record updates.
- Accurate UI labels and removal of obsolete Maxwell/GitLab-first messaging.

## Out of scope

- Automatic push/PR creation.
- Scheduled, autonomous, multi-user, or multi-agent operation.
- Hosted execution.

## Deliverables

- Acceptance report, final regression evidence, and updated living specification.

## Verification

1. Configure a Codex CLI Harness Account and Agent Profile.
2. Register and verify a local Project Repository.
3. Start an Agent Task from a real Issue.
4. Complete a read-only planning turn.
5. Approve an isolated code change.
6. Run an approved verification command.
7. Review the diff and test result.
8. Retain or discard the worktree deliberately.
9. Approve or deny Issue status write-back.
10. Restart Ahive and confirm history and final state remain accurate.

## Approval criteria

- [ ] The complete acceptance scenario passes without manual storage edits.
- [ ] The base Repository is never modified before explicit acceptance.
- [ ] Every consequential action is attributable and observable.
- [ ] Cancellation and restart recovery work.
- [ ] Existing GitLab and Google Sheets integrations still pass regression tests.
- [ ] All documentation and feature statuses describe actual behavior.
- [ ] Deferred capabilities are clearly identified as deferred.
