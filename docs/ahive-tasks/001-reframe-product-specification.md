# 001: Reframe the Product Specification

Status: **Complete**  
Depends on: **None**

## Description

Change the documented product purpose from a cross-platform issue tracker to a
local-first developer work orchestration platform. Issues remain work records
and become one source of context for agents.

## Objective

Establish one unambiguous product statement and prioritized roadmap for Ahive.

## In scope

- Update product name and statement.
- Define the primary user loop from Project context to Agent execution.
- Reclassify issue synchronization as a supporting capability.
- Reprioritize the roadmap around the Agent MVP.
- Resolve the `ahive` package versus Maxwell documentation naming mismatch.

## Out of scope

- Runtime code, persistence, API, or UI changes.
- Final agent entity schemas.

## Deliverables

- Updated product, overview, architecture, and feature documents.
- A decision record accepting the product repositioning and product name.

## Verification

- Search active documentation for contradictory primary-goal statements.
- Check every documentation link from the root README.

## Approval criteria

- [x] Ahive has one accepted product statement.
- [x] Issues are explicitly retained as agent task context.
- [x] Agent management is the highest-priority milestone.
- [x] Deferred connector work is clearly marked rather than reported complete.
- [x] No runtime behavior changed.

## Completion evidence

- Product, overview, architecture, feature, constitution naming, and root README
  documents now use the accepted Ahive direction.
- Decision 0011 records the product name, primary purpose, retained Issue model,
  first Agent milestone, and transitional runtime status.
- Active documentation contains no conflicting primary product statement;
  remaining Maxwell references explicitly describe the legacy runtime/history.
- `pnpm run check` passes.
- All 23 automated regression tests pass.
