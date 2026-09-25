# CORO Website V2 --- Project Documentation

This folder is the operational source of truth for the CORO Website V2
project.

## Current state

Design Lab complete (LAB-01 to LAB-08). **Design System V1.0 is frozen
(LAB-09)**; the freeze takes effect when it is validated by a human and
committed. Production pages have not been migrated yet.

## Start here

1.  Read `00-governance/MASTER-INDEX.md`.
2.  Read `00-governance/DESIGN-SYSTEM-V1-FREEZE.md` --- the frozen state,
    statuses, open items and manual QA still required.
3.  For any Codex or agent task, also read
    `00-governance/CODEX-WEBSITE-RULES.md` and section 0 of
    `00-governance/CODEX-MASTER-RESUME-PROMPT.md`.
4.  To migrate a page: its row in
    `05-migration/CONTENT-MIGRATION-MATRIX.md`, then
    `02-design/CORO-COMPONENT-LIBRARY.md`, then the per-page checklist
    in `04-quality/QA-ACCEPTANCE-CHECKLIST.md` section 0.

**DO NOT REDESIGN THE DESIGN SYSTEM DURING PAGE MIGRATION.** Use approved
components first; escalate gaps.

## Folder map

-   `00-governance/` --- authority, rules, freeze register, agent resume
    prompt.
-   `01-strategy/` --- brief, target information architecture, homepage
    blueprint.
-   `02-design/` --- visual language (with the authoritative prohibited
    patterns), design system V1.0, component library V1.0, motion, page
    families, Design Lab specification, visual references.
-   `03-content/` --- editorial voice and terminology.
-   `04-quality/` --- responsive, accessibility and QA acceptance
    (including the per-page migration checklist).
-   `05-migration/` --- inventory, migration matrix (with migration
    priority and risk) and SEO migration plan.

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

Lifecycle: `DRAFT → REVIEW → APPROVED → LOCKED`. The V1.0 register uses
`LOCKED`, `APPROVED`, `REVIEW`, `REJECTED`, `MIGRATION-ONLY` and
`LEGACY-DEBT` (definitions in the freeze register).

A `LOCKED` page/component must not be changed indirectly to make another
page easier to implement.

## Critical migration rule

No existing public URL, useful content or SEO equity may disappear
silently. Every current URL must be preserved, rebuilt, merged,
redirected, archived with approval, or explicitly reviewed.

## Repository destination

This folder lives at `coro-website/docs/website-v2/`.
