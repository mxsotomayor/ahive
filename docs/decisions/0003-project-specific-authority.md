# 0003: Configure Authority per Project

Status: **Superseded**  
Date: **2026-07-18**  
Superseded by: [0006](0006-product-scoped-sources-and-issue-origin.md)

## Context

This proposal assumed that every Project would select one authoritative
connector. Further domain refinement introduced Products with multiple Sources
and required every Issue to retain its own original Source.

## Former proposal

Every Maxwell Project would declare one authoritative connector or a
Maxwell-local authority.

## Reason for supersession

Authority at Project level is too broad. Two Issues in the same Product can
originate in different Sources, and Source configuration belongs to the Product.
The accepted model therefore records authority per Issue through its origin
Product Source.
