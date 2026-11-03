# Correction et acceptation REX / actions correctives

## Candidat local

- Branche : `feature/rex-corrective-actions`.
- Baseline : `56ff5eec1df6a85d7456e35762a7d24d0e39ddd2`.
- SHA correctif : à renseigner après commit.

## Changements produit

- Protection du brouillon REX contre l'actualisation de fond.
- Neutralisation des réponses obsolètes au chargement.
- Nettoyage des formulaires enfants uniquement après mutation réussie.
- Nouveau contrat de non-régression `test:rex-corrective-actions`.

## Validation exécutée

- Backend unitaires ciblés : 81/81 PASS.
- Backend rapports/suivi : 66/66 PASS.
- PostgreSQL 16, migration depuis zéro : 168/168 PASS.
- PostgreSQL métier REX/actions/suivi : 35/35 PASS.
- Portail, test du correctif : 5/5 PASS.
- TypeScript Portail : PASS.
- Build backend : PASS.
- Build Next.js Portail : PASS.
- `git diff --check` : PASS.

## Acceptation restante

- Stack HTTP intégré et Chrome authentifié 12/12.
- CI terminale du HEAD publié.
- Release gouvernée, inspection et lecture seule production.

Verdict courant : `CORRECTION_LOCALE_VALIDÉE_ACCEPTATION_INTÉGRÉE_EN_COURS`.
