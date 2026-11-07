# Audit REX et actions correctives

## Référence

- Baseline : `56ff5eec1df6a85d7456e35762a7d24d0e39ddd2` (`origin/main` au démarrage).
- Branche isolée : `feature/rex-corrective-actions`.
- Base QA : PostgreSQL 16 jetable, 168 migrations appliquées depuis zéro jusqu'à `20261121010000_incident_authority_idempotency`.
- Données : synthétiques uniquement; aucune communication externe.

## Parcours réellement présent

Le produit relie une source canonique unique (événement Population, incident ou rapport d'exercice) à un `OperationalReview`. Le REX porte des constats et recommandations. Une recommandation acceptée peut produire plusieurs actions correctives idempotentes. L'action conserve son rattachement à l'organisation, au bâtiment et à sa source; elle suit `PLANNED → IN_PROGRESS → COMPLETED → VERIFIED → CLOSED`, avec rejet vers `IN_PROGRESS` et annulation gouvernée. Les preuves sont append-only, privées pour les fichiers et retirées logiquement. Les tentatives de vérification et l'audit sont conservés.

## Surfaces

- Portail Client : création/consultation du REX Population, constats, recommandations, décisions, création et cycle complet des actions, preuves, rapports REX et rapports de suivi.
- Organisation : administration des permissions REX/actions correctives et rapports administratifs existants.
- Le parcours opérationnel interactif équivalent complet dans l'application Organisation est absent : `NON_APPLICABLE` pour la symétrie d'interface, sans réduire les autorités serveur.

## Autorités et sécurité observées

- `ClientJwtGuard`, identité active, organisation, client, bâtiment affecté et visibilité sont appliqués avant lecture.
- Les mutations ClientUser exigent une permission fonctionnelle explicite.
- La confidentialité `ADVISOR` reste interdite au portail.
- Les identifiants et clés de stockage ne sont pas exposés par les projections publiques.
- Le téléchargement de preuve exige l'accès à l'action, un objet privé et une intégrité taille/SHA-256 valide.
- Les rapports PDF sont privés, versionnés, contrôlés par tenant et vérifiés par SHA-256.

## Résultats initiaux

- Tests unitaires ciblés principaux : 81/81 PASS.
- Suite élargie rapports et suivi : 66/66 PASS.
- PostgreSQL : 35/35 PASS.
- Build backend : PASS.
- Build Portail Client Next.js 16.4.2 : PASS.
- Chrome authentifié 12/12 : en attente de la campagne intégrée.

## Limites conservées

- Aucun fournisseur réel n'est requis ou activé par ce parcours.
- Aucune règle de quorum, d'échéance réglementaire ou de cascade Incident → REX → actions n'est inventée.
- La vérification de production restera strictement en lecture seule.
- Lecteur d'écran réel : `NOT_VERIFIED` tant qu'aucune observation humaine fiable n'est disponible.
