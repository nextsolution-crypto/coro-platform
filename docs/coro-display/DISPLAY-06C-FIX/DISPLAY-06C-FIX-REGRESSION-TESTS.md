# Régressions

- DISPLAY : 21 suites / 99 tests PASS avec PostgreSQL et Chromium.
- Backend complet : PASS hors sandbox; la première passe sandbox avait un seul faux négatif `spawn EPERM` sur `credential_process`.
- Backend TypeScript, Prisma validate et build Nest : PASS.
- Frontend TypeScript, contrat Display Manager et build Next 16 : PASS.
- ESLint ciblé frontend : 0 erreur, 1 avertissement historique `no-img-element`.
- Audit runtime backend : 0 vulnérabilité.
- Audit complet : 30 vulnérabilités de développement, dont 3 high; corrections disponibles uniquement via montées majeures cassantes, donc non appliquées aveuglément.
- OCR : `NOT_VERIFIED` faute de `pdftoppm` local connue de la revue précédente.
