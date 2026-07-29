# 024: Add Approved Test Command Execution

Status: **Pending**  
Depends on: **023**

## Description

Allow Agent Runs to execute only Project-configured verification commands inside
their managed worktree.

## Objective

Give Agents evidence about their changes without exposing a general-purpose
shell interface.

## In scope

- Project/Repository verification-command configuration.
- Exact executable and argument-array storage.
- Working-directory, environment allowlist, timeout, output, and concurrency limits.
- Process-tree cancellation.
- Structured exit status and sanitized output artifact.

## Out of scope

- Model-generated arbitrary commands.
- Package installation, network enablement, or privileged execution.

## Deliverables

- Command policy, process runner, configuration API, Run integration, and tests.

## Verification

- Run passing, failing, timed-out, cancelled, and disallowed commands in test repositories.

## Approval criteria

- [ ] Only preconfigured executable/argument combinations can run.
- [ ] Commands always run inside the assigned worktree.
- [ ] Time, output, environment, and concurrency limits are enforced.
- [ ] Cancellation terminates child processes.
- [ ] Results distinguish pass, fail, timeout, cancel, and launch error.
