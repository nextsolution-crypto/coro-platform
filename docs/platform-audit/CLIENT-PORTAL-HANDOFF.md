# Point de reprise — chantier CORO Client

Mise à jour : 24 octobre 2026, America/Toronto.

## Objectif et périmètre

Corriger le faux état vide de l’historique des incidents, clarifier les deux
historiques, valider et déployer le correctif, puis reprendre les constats de
cloisonnement dans l’ordre de risque. Aucun événement d’urgence, communication,
invitation, signature ou changement de permission n’est autorisé pour la recette.

## Autorisations acquises

- Utilisation en lecture/recette du compte de démonstration Martin Gagnon —
  Groupe Immobilier Prémont.
- Corrections, tests, PR, release gouvernée et recette ciblée.
- Aucun mot de passe, jeton ou secret n’est enregistré ici.

## Références

- Branche : `fix/client-incident-history-states`.
- Base : `origin/main` au SHA `da13a066b3b4531756bfac2fa5cb3ac61243e10f`.
- Production observée : release GitHub de ce SHA réussie; inspection active à
  confirmer lors de la release du correctif.
- Worktree isolé : `D:\CORO-QA\worktrees\client-incident-history-fix`.
- Worktree principal `F:\coro-platform` et travaux P-5 : préservés, non modifiés.

## Modifications en cours

- Machine d’état de l’historique des incidents.
- Erreurs 401/403/techniques distinctes et bouton Réessayer.
- Distinction vide bâtiment / filtre sans résultat.
- Données précédentes marquées anciennes si l’actualisation échoue.
- Réponse tardive d’un ancien bâtiment ignorée.
- Libellés « Historique des présences » et « Historique des incidents ».
- Cibles tactiles de 44 px et navigation clavier des lignes.

## Tests exécutés

- `npm run test:incident-history` : 11/11 PASS.
- `npm run test:sentinelle-auth` : 5/5 PASS.
- TypeScript : PASS après exécution autorisée dans le worktree D:.
- `npm run build` : PASS, Next.js 16.4.2.

## Constats ouverts

Voir `CLIENT-PORTAL-FINDINGS.md`, CP-001 à CP-007. CP-001 est À VÉRIFIER;
CP-002 à CP-007 demeurent À INVESTIGUER et interdisent un feu vert commercial
global.

## Opérations au résultat incertain

- Aucune mutation métier, migration, communication ou production n’est en cours.
- Le statut HTTP exact de la requête production CP-001 n’est pas encore connu;
  la console ne conserve que le message frontend générique.

## Prochaine action concrète

Revoir le diff exact, exécuter les derniers contrôles, créer le commit/PR,
attendre la CI, déployer par le pipeline gouverné, puis recetter CP-001 sur la
version active. Ensuite seulement, commencer CP-002 avec un test synthétique
de deux clients appartenant au même prestataire.
