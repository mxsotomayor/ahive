# 014: Build the Agent Management Surface

Status: **Complete**  
Depends on: **012, 013**

## Description

Add an **Agents** navigation surface for managing Harness Accounts, Agent
Profiles, and Project Assignments before execution exists.

## Objective

Make all Agent configuration understandable and manageable through the UI.

## In scope

- Agents navigation item and page.
- Profile list/cards and create/edit forms.
- Harness, model, description, traits, instructions, and active state.
- Assignment management with Project/Product/Repository context.
- Configuration readiness, empty, loading, and error states.

## Out of scope

- Conversations, fake agent responses, or execution controls.

## Deliverables

- Agent management UI, styles, API wiring, and UI-level tests where available.

## Verification

- Exercise Harness Account, Profile, and Assignment workflows using real local data.
- Confirm no dummy Agents appear.

## Approval criteria

- [x] The user can configure an Agent without editing storage files.
- [x] Provider, model, traits, and assignments are visible and editable.
- [x] The UI distinguishes ready, inactive, sign-in-required, and CLI-unavailable states.
- [x] No button implies that execution is implemented.
- [x] Existing navigation remains responsive.

## Completion evidence

The sidebar now includes an **Agents** destination. Its real-data page manages
the Codex CLI Harness, reusable Agent Profiles, and Project Assignments through
their local APIs. Forms expose provider/adapter status, model controls,
description, traits, operational instructions, active state, and filtered
Project/Product/verified-Repository scope. Unused records can be removed, while
server relationship guards direct linked records toward deactivation.

The Profile form presents eight supported OpenAI models in a fixed selector.
The same server-owned catalog is available at `GET /api/agent-models`, and
Profile writes reject model identifiers outside that catalog.

Loading, error, empty, ready, inactive, sign-in-required, and CLI-unavailable
states are represented explicitly. The page labels itself “Configuration only,”
contains no Run/chat/start controls, and never seeds dummy Agents. The mobile
menu now opens a dismissible navigation drawer at narrow widths.

Automated UI render tests cover empty and configured states, real API wiring,
configuration visibility, absence of execution controls, and responsive CSS.
The isolated server suite exercises complete Harness/Profile/Assignment CRUD
against real persisted records. Live static assets and endpoints returned 200.
The in-app browser backend was unavailable during verification, so no visual
browser screenshot or automated click-through is claimed.
