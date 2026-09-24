# CORO Website V2 --- Project Documentation

This folder is the operational source of truth for the CORO Website V2
project.

## Start here

1.  Read `00-governance/MASTER-INDEX.md`.
2.  For any Codex task, also read
    `00-governance/CODEX-WEBSITE-RULES.md`.
3.  Before implementation begins, run the read-only audit using
    `00-governance/CODEX-MASTER-RESUME-PROMPT.md`.
4.  Do not redesign or implement Website V2 before the audit-dependent
    documents are completed and reviewed.

## Folder map

-   `00-governance/` --- authority, rules, Codex operating instructions.
-   `01-strategy/` --- brief, target information architecture, homepage
    blueprint.
-   `02-design/` --- visual language, design system, component library,
    motion, Design Lab, visual references.
-   `03-content/` --- editorial voice and terminology.
-   `04-quality/` --- responsive, accessibility and QA acceptance.
-   `05-migration/` --- audit-dependent inventory, migration and SEO
    documents.

## Visual references

The files in `02-design/references/` define direction and quality, not
pixel-perfect implementation.

-   REF-01 --- Homepage
-   REF-02 --- Sentinelle
-   REF-03 --- Documents
-   REF-04 --- Incident
-   REF-05 --- Sentinelle Population
-   REF-06 --- Résilience
-   REF-07 --- Mobile

## Governance

Statuses: `DRAFT → REVIEW → APPROVED → LOCKED`.

A `LOCKED` page/component must not be changed indirectly to make another
page easier to implement.

## Critical migration rule

No existing public URL, useful content or SEO equity may disappear
silently. Every current URL must be preserved, rebuilt, merged,
redirected, archived with approval, or explicitly reviewed.

## Repository destination

Place this folder at:

`coro-website/docs/website-v2/`

Commit the documentation as project capital so future Codex sessions and
contributors can work from the same references.
