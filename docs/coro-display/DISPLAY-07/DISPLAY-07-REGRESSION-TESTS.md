# Régressions

## Résultats locaux

- Backend build : PASS.
- Frontend TypeScript et build Next/Webpack : PASS.
- Portail client build Next/Webpack et contrat Display : PASS, avec un avertissement historique `PublicPortalSharing` sans effet sur le build.
- DISPLAY-07 ciblé : 22 PASS; PostgreSQL réel : 2 PASS.
- Backend complet : 2 833 PASS, 11 SKIPPED; les huit échecs initiaux provenaient du refus de processus enfants dans le bac à sable. Hors bac à sable, 39/40 repassent; le dernier test OCR reste `NOT_VERIFIED` car `pdftoppm` n'est pas installé sur l'hôte Windows.
- Contrat Display Manager : PASS.
- ESLint ciblé backend et nouveau composant frontend : PASS.
- Audit npm runtime backend : 0 vulnérabilité.
- Audit npm complet : 3 vulnérabilités élevées dans l'outillage de développement; les corrections automatiques proposées sont des mises à niveau majeures hors périmètre. Aucun paquet runtime affecté.
- Scan de secrets du diff et `git diff --check` : PASS.
- Design System complet : un échec historique de feuille générée obsolète, sans modification de sa source par DISPLAY-07; contrat Display ciblé PASS.

Les builds Turbopack ne peuvent pas suivre les jonctions `node_modules` hors worktree; les builds Webpack hermétiques réussissent. La CI Linux reste l'autorité finale pour OCR, dépendances locales et builds standards.
