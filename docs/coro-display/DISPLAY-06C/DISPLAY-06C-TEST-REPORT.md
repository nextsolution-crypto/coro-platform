# Tests DISPLAY-06C

- Prisma validate/generate : `PASS`.
- Migration PostgreSQL 16 jetable : 183 migrations appliquées, seconde passe sans migration en attente, `PASS`.
- Enrôlement concurrent, consommation unique et journal append-only : `PASS`.
- Tests ciblés gateway, HTTP, runtime, 06A et 06B : 22 tests, `PASS`.
- Test PostgreSQL DISPLAY-06C : `PASS`.
- Régression unitaire globale : 302 suites et 2 795 tests réussis; trois tests Display Manager corrigés et revérifiés. Une suite OCR demeure `NOT_VERIFIED` faute de `pdftoppm` local.
- Régression PostgreSQL globale : 80/81 suites et 429/435 tests réussis. Les six échecs sont limités à l’ancienne extraction PDF (`PDF_INVALID`) liée à Poppler; aucune régression DISPLAY-06C.
- TypeScript avec la heap documentée du dépôt : `PASS`.
- ESLint des sources de production modifiées : `PASS`. Les spécifications ne sont pas incluses dans ce contrôle ciblé.
- Build Nest : `PASS`, code 0.
- Audit des dépendances de production : 0 vulnérabilité. Audit complet : 30 vulnérabilités de développement/transitives (4 faibles, 23 modérées, 3 élevées), aucune critique; aucun `audit fix` automatique appliqué.
- Chromium headless réel sur origine loopback : `PASS`; CSP active, `object-fit: contain`, débordement masqué et origine `127.0.0.1` vérifiés.

La recette sur écran physique, le keystore matériel et la supervision OS réelle restent `NOT_VERIFIED`.
