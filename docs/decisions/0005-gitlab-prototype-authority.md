# 0005: GitLab Authority Is Prototype-Scoped

Status: **Accepted**  
Date: **2026-07-18**

## Context

Before the broader domain was clarified, the prototype made GitLab the global
source of truth and cached assigned GitLab issues directly. This works for the
current IRN experiment but conflicts with the Product-centered neutral model.

## Decision

Retain the GitLab-first behavior only as a temporary prototype mechanism for the
current dataset. It is not a constitutional rule and must not be copied into the
neutral domain model. No outbound publishing is activated until neutral Issue
identity and External Issue Links exist.

## Consequences

- Current GitLab pull, create, close, and reopen behavior remains usable.
- Active UI language may still mention GitLab authority until migration.
- The next architecture milestone replaces hard-coded authority with an Issue
  origin Product Source.
- The current JSON cache is migration input, not the final database schema.

## Follow-up

Create the neutral Organization, Project, Product, and GitLab Product Source;
then migrate cached GitLab issues before adding the first real outbound target.
