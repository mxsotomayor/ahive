# 024: Add Approved Test Command Execution

Status: **Complete**
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

- [x] Only preconfigured executable/argument combinations can run.
- [x] Commands always run inside the assigned worktree.
- [x] Time, output, environment, and concurrency limits are enforced.
- [x] Cancellation terminates child processes.
- [x] Results distinguish pass, fail, timeout, cancel, and launch error.

## Completion evidence

Repositories now store up to 20 content-addressed verification policies. Each
policy fixes one absolute non-shell executable, exact argument array,
worktree-relative directory, allowlisted non-secret environment, timeout, and
output limit. Replacing policies is available through `GET`/`PUT
/api/repositories/:id/verification-commands`; changing any policy field changes
its ID and invalidates approvals for the previous specification.

`lib/verification-commands.mjs` consumes one exact
`repository.run_verification` approval targeting
`<managed-worktree-id>:<policy-id>`, revalidates the ready worktree, starts the
process without a shell, and enforces per-Run/global concurrency, time, output,
environment, and process-tree cancellation boundaries. Structured bounded
output is ANSI/control-cleaned and credential-pattern redacted. Durable artifact
persistence remains Task 025.

The conditional Repository MCP exposes policy discovery and execution without
accepting executable, argument, environment, or working-directory input from
the model. The server also exposes approved execution at `POST
/api/agent-runs/:id/verifications/:policyId`. Structured traces contain policy
IDs and outcomes but omit command strings and command output.

Focused service, adversarial, API, process-tree, and real MCP tests pass. The
full regression suite passes all 74 tests.
