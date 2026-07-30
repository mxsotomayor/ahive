# 0013: Projects Own Registered Local Repositories

Status: **Accepted**  
Date: **2026-07-29**

## Context

Agent work needs a durable relationship between business context and local code.
A single Project may use several repositories, while one Product may use a
subset or a preferred repository. Storing one raw path directly on Project or
accepting a path in each Run cannot represent this safely and would let clients
or models expand filesystem scope.

## Decision

Repository is a first-class entity owned by exactly one Project. A Repository
may optionally reference one Product from the same Project. Projects may own
multiple Repositories.

Repository stores the user-configured local path, server-resolved path,
verification state, access mode, and Git inspection metadata. Runs reference the
Repository ID. They do not accept a substitute filesystem path.

A Product association narrows context but does not change ownership. Repository
verification proves location and accessibility; it does not grant Agent write
authority.

Repositories are deactivated rather than deleted while historical Agent work
references them.

## Consequences

- Multi-repository Projects are supported without duplicating Projects.
- Repository and Product relationships can be validated before a Run starts.
- Path security and filesystem inspection remain server responsibilities.
- A Repository may later become the default for a Product without placing paths
  on the Product entity.
- Historical Runs can retain stable Repository identity even when a checkout is
  moved, unavailable, or inactive.

## Follow-up

Implement persistence and management, then define allowed roots, canonical path
verification, read-only Git inspection, and isolated modifying workspaces.

