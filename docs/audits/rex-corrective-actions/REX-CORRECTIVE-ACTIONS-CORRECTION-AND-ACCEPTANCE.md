# Correction et acceptation REX / actions correctives

## Candidat local

- Branche : `feature/rex-corrective-actions`.
- Baseline : `56ff5eec1df6a85d7456e35762a7d24d0e39ddd2`.
- SHA correctif et QA : `3f4be4296d762ce5f40fdb0d4f4a331673579858`.
- PR : `#186` (`feature/rex-corrective-actions`).

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
- CI GitHub du HEAD `3f4be4296d762ce5f40fdb0d4f4a331673579858` : PASS.
  - Client Portal checks : SUCCESS (`41723148659`).
  - TypeScript backend/frontend/portail/site, backend-tests et build portail : SUCCESS (`41723149150`).
- Stack QA isolé : PostgreSQL, backend et portail réels démarrés sur le produit `3ec5a18fb654696d0e02aa7a95cddf33b196be4f`; le commit suivant `3f4be4296d762ce5f40fdb0d4f4a331673579858` ajoute uniquement le script de fixture QA. Fixtures synthétiques REX/actions chargées.

## Acceptation restante

- Chrome authentifié et matrice 12/12 : `NOT_VERIFIED`. L'extension de contrôle échoue avant toute interaction avec `Cannot read properties of undefined (reading 'timeoutMs')`, y compris après reconnexion, redémarrage de Chrome et nouvelle liaison de l'onglet.
- Release gouvernée, inspection et lecture seule production.

Verdict courant : `CI_PASS_BROWSER_ACCEPTANCE_BLOCKED_NO_MERGE_NO_RELEASE`.
