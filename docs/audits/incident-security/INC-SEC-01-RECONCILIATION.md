# INC-SEC-01 — Réconciliation de l’audit

## Baselines

- Audit historique : `22ef2c2b74c56023d25ce03fe48bc272fcc6ae0d`.
- Base de correction : `c4fbde54e87bedd21def72a6f303add49a1342c0` (`origin/main`).
- Écart : 902 commits.

Le worktree historique est sale et a été préservé. La correction est isolée sur
`fix/inc-sec-01-security`.

## Constats P0 réévalués

| Contrôle | État actuel | Décision |
| --- | --- | --- |
| Impression Incident et injection HTML | Déjà corrigé par le lot Incident 2 : échappement de toutes les valeurs dynamiques et ouverture d’un Blob, sans `document.write` | Test de non-régression; ne pas réimplémenter |
| Jeton public dans les réponses ordinaires | Déjà corrigé; projection explicite du détail et retrait des secrets | Conserver |
| Snapshots sensibles | Déjà minimisés dans `getIncidentDetail` | Conserver |
| Double autorité tenant/bâtiment/incident | Déjà livrée par les lots 1–2 et Administration Incident | Conserver et tester |
| Auteur et dates techniques | Déjà imposés côté serveur | Conserver |
| Transitions et concurrence | `updateMany` conditionné par état et `lockVersion`, audit transactionnel, rejeu idempotent borné | Conserver |
| Motif de résolution | DTO obligatoire, borné, non vide | Conserver |
| Corps de commandes Incident | Plusieurs commandes utilisent encore des types inline, sans métadonnées de validation à l’exécution | Corrigé dans INC-SEC-01 |
| Parcours panique historique | Corps libre et interpolation HTML de valeurs métier dans le courriel | Corrigé dans INC-SEC-01 |

## Correctifs ciblés

- DTO explicites pour réassignation, politique d’escalade, activation PCA,
  attribution/révocation d’autorité et partage d’accès.
- Validation Incident locale stricte : transformation, liste blanche et rejet
  des propriétés inconnues.
- DTO strict du bouton panique du portail client.
- Échappement des valeurs dynamiques du courriel HTML de panique.
- Aucun changement de transition métier, de permission ou de schéma Prisma.

## Sécurité et régression

- Aucune communication réelle n’est exécutée par les tests.
- Les contrôles de plateforme et l’affectation Incident restent cumulatifs.
- Les limites tenant et bâtiment restent résolues côté serveur.
- Les transitions PRE_ALERT, ACTIVE, CONTAINED, RESOLVED et CANCELLED ne sont
  pas modifiées.
- La résolution reste distincte de la clôture documentaire; les tâches ouvertes
  ne sont pas artificiellement marquées terminées.

## Résultats QA locaux

- Backend : 5 suites ciblées, 34 tests PASS (DTO, injection HTML, détail,
  gouvernance, concurrence/escalades).
- Backend TypeScript/Nest : build PASS.
- Portail : test d’échappement d’impression 2/2 PASS.
- Portail : régressions historique 8/8 PASS et capacités détail 5/5 PASS.
- Portail Next.js : compilation webpack et vérification TypeScript PASS; un
  avertissement préexistant concerne l’export de `PublicPortalSharing`.
- ESLint des quatre nouveaux fichiers backend : PASS.
- ESLint global : dette historique préexistante dans les grands contrôleurs et
  services Incident; aucune règle n’a été désactivée.
- PostgreSQL intégré et navigateur authentifié : NOT_VERIFIED dans ce lot local.

Le build Next.js signale également que la version courante est concernée par un
avis de sécurité connu. La montée de version est hors périmètre INC-SEC-01 et
doit faire l’objet d’un chantier séparé pour ne pas mélanger les risques.

## Déploiement et retour arrière

Le changement est applicatif et sans migration. Le déploiement devra utiliser
le pipeline immuable gouverné habituel après revue. Le retour arrière consiste
à restaurer l’image backend et portail précédemment approuvée. Une ancienne
image qui réintroduit les corps libres ou l’interpolation HTML ne doit pas être
considérée sûre uniquement parce qu’elle est disponible.

