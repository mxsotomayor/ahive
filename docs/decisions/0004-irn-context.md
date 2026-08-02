# 0004: Model the IRN Organizational Context

Status: **Accepted**  
Date: **2026-07-18**

## Context

The first real delivery context spans Rezzilla, Labs, Accenture, and IRN
Portugal. Other Rezzilla, Labs Projects may be unrelated to Accenture, so provider or
account ownership cannot define the domain hierarchy.

## Decision

Represent Rezzilla, Labs, Accenture, and IRN Portugal as Organizations participating in an
optional IRN Engagement with explicit roles. Rezzilla, Labs Developers owns the initial
IRN Project, which contains an initial IRN Product. Matching Project and Product
names are valid.

Initial IRN Product Source contexts are:

- GitLab and OpenProject for Accenture / IRN.
- GitHub Projects and Excel or Google Sheets for Rezzilla, Labs.

Provider containers attach to the IRN Product as Product Sources through
Connector Accounts.

## Consequences

- The operational hierarchy remains Organization, Project, Product, and Issue.
- Participant relationships can be represented without duplicating the Project.
- One Connector Account may serve Sources in several Products.
- Product assignment cannot be inferred from statements such as "GitHub means
  Rezzilla" or "GitLab means IRN."

## Follow-up

Refine participant roles if they become necessary in the interface. They remain
optional business context and do not change the operational hierarchy.
