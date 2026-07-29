# 0006: Product-Scoped Sources and Issue Origin

Status: **Accepted**  
Date: **2026-07-18**  
Supersedes: [0002](0002-source-agnostic-issues.md) and
[0003](0003-project-specific-authority.md)

## Context

Maxwell must manage work for multiple employers and initiatives. A Project may
contain Products, and each Product may use several platforms. A task imported
from one platform must retain its origin and may later be represented in other
platforms serving the same Product.

Project-wide provider authority cannot express this safely because Issues in the
same Product may originate in different Sources.

## Decision

1. Use the required hierarchy `Organization -> Project -> Product -> Issue`.
2. Configure provider containers as Product Sources, not Project-wide Sources.
3. Allow a Product to have any number of Product Sources.
4. Give every imported Issue exactly one origin Product Source.
5. Represent the origin and all replicas with stable External Issue Links.
6. Treat the origin as authoritative for that Issue in the initial model.
7. Permit publication only to other Sources belonging to the same Product.
8. Allow Project and Product display names to match because IDs define identity.
9. Do not automatically merge similar tasks from different Sources. Stable
   external links or an explicit user action establish identity.

## Consequences

- Authority is specific to an Issue instead of globally tied to a provider.
- Product is the synchronization and configuration boundary.
- One Connector Account can support multiple Product Sources.
- A repeated pull is idempotent when its external identity is already linked.
- Duplicate real-world work can appear temporarily, which is acceptable for the
  first milestone.
- Publishing must save the returned external ID before another attempt.

## Follow-up

- Decide how edits made directly to replicas are handled.
- Decide whether Maxwell-local Issues are allowed without an external origin.
- Design an optional manual duplicate merge workflow after the neutral model is
  operational.
