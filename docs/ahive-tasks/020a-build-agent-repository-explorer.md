# 020a: Build the Agent Repository Explorer

Status: **Complete**
Depends on: **019, 020**

## Description

Expose the Repository context of an Agent Task as a safe, user-facing file tree
inside the conversation surface.

## Objective

Let the user inspect the same bounded Repository context available to the Agent
without leaving the Task conversation or granting any new execution authority.

## In scope

- Full-screen Agent Task modal.
- Three-pane desktop layout: Repository, Conversation, and Context.
- Mobile Repository drawer.
- Lazy directory expansion and bounded text-file previews with line numbers.
- Existing Repository root, traversal, symlink, secret, binary, and size rules.
- Bottom-anchored conversation scrolling while the explorer is present.

## Out of scope

- File editing, creation, deletion, rename, upload, or download.
- Git operations, shell commands, and workspace mutation.
- Syntax highlighting or repository-wide browser indexing.

## Verification

- Run syntax checks and the Repository service, API, and Agent UI tests.
- Manually open a Repository-scoped Agent Task at wide and narrow widths.

## Approval criteria

- [x] The Agent Task modal occupies the full viewport.
- [x] Directories load only when opened and directories sort before files.
- [x] Safe text previews are limited to 200 lines.
- [x] Traversal, symlink escape, secret, binary, and oversized-file protections remain enforced.
- [x] A Task without a Repository does not render a misleading explorer.
- [x] The Repository explorer exposes no mutation controls.

## Completion evidence

Task-scoped `tree` and `file` routes reuse the constrained Repository service,
which re-resolves the stored Repository identity and canonical allowed root for
every request. The browser presents a persistent full-screen conversation with
a Repository tree on desktop and a Files drawer on narrow screens. Focused
service, API, and UI tests pass.
