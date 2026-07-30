# 010: Build Repository Management UI

Status: **Complete**  
Depends on: **009**

## Description

Extend the Workspace surface so Projects can manage their registered local
Repositories and view verification and Git state.

## Objective

Allow repository configuration without editing JSON or environment-specific code.

## In scope

- Repository list within each Project.
- Create and edit form.
- Product association, access mode, and active state.
- Verify/refresh action.
- Branch, commit, remote host, dirty-state, and validation presentation.
- Empty, loading, and error states.

## Out of scope

- Agent selection or execution.
- Repository deletion.

## Deliverables

- UI rendering, event handling, styles, and server integration tests.

## Verification

- Exercise create, edit, deactivate, invalid path, and refresh flows locally.
- Check narrow and wide responsive layouts.

## Approval criteria

- [x] A Repository can be managed from its Project.
- [x] Unverified and inactive states are unmistakable.
- [x] Full filesystem paths are displayed only where useful in this local app.
- [x] No operation claims to modify repository contents.
- [x] Existing Workspace management remains functional.

## Implementation evidence

The Workspace renders Project-owned Repository cards and a create/edit modal.
Verification, inspection refresh, invalid-path, activation, and deactivation
flows are wired to the Repository API. The cards show explicit inactive,
unverified, invalid, verified, clean, and dirty states plus bounded Git metadata.
An isolated server integration test exercises create, edit, deactivate, invalid
path, verify, and refresh without touching the private workspace.

Automated checks and all 33 tests pass. The in-app browser was unavailable in
the implementation session; the responsive UI checklist was handed to the user,
who explicitly directed work to continue to the next planned task.
