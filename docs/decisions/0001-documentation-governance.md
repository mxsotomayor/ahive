# 0001: Documentation Governance

Status: **Accepted**  
Date: **2026-07-18**

## Context

The prototype evolved through conversation and code changes, leaving the root
README with stale assumptions. We need a shared, durable record of principles,
scope, implementation status, and rationale.

## Decision

The `docs/` directory is the shared specification. Material decisions receive
immutable decision records. Accepted decisions are changed by adding a new
record that supersedes the old one, not by silently rewriting history.

## Consequences

- Future work begins by checking relevant specification files.
- Code changes that alter documented behavior also update documentation.
- Feature completion is recorded only after implementation and verification.
- Open questions remain visible instead of being resolved by assumption.

## Follow-up

Review the specification together after the four open product questions are
answered.
