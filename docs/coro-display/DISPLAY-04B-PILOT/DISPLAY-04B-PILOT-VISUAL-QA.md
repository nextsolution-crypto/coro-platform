# DISPLAY-04B-PILOT — Visual QA

## Automated checks

- Original digest matched before rendering.
- Raster output is a valid 5100×3300 PNG.
- All three output canvases have their exact requested dimensions.
- Source and profiles preserve the 17:11 plan ratio; no crop or stretch operation is used.
- Every output and the contact sheet has a SHA-256 recorded in `pilot-manifest.json`.

## Visual inspection performed

The full contact sheet and four 2550×1650 source quadrants were inspected. The “Vous êtes ici / You are here” marker, primary and alternate evacuation paths, exits, stairs, elevator, extinguishers, manual stations, fire panel, AED, first-aid kit, assembly point, room numbers, bilingual legend/instructions, north orientation, credits, and CORO/Groupe Vision logos remain visible. No clipping or distortion was observed.

Private evidence folder: `F:\coro-platform\.worktrees\.private-coro-display-04b-pilot` (not committed).

## Required human decision

Automated and engineering review cannot certify the correctness of an evacuation plan. A qualified human must compare the rendered plan with the approved professional PDF and approve it before real publication or physical display use.
