# Passation — administration Incident

## Migration finale

La migration additive, jamais appliquée dans un environnement partagé avant cette PR, a été réconciliée après la tête de production `20261120010000_permanent_qr_codes` sous l'identifiant `20261121010000_incident_authority_idempotency`. La création depuis zéro et l'upgrade avec affectation historique synthétique préexistante sont validés; aucune permission individuelle n'est attribuée implicitement par la migration.

## Portée et autorisations

Implémentation, tests, migration additive, documentation, commit, push et PR sont autorisés. Fusion, release et attribution réelle en production sont exclues.

## État livré

- API dédiée ADMIN/SUPER_ADMIN pour consulter, attribuer, modifier et révoquer;
- double garde `permission individuelle ∩ affectation active` sur les lectures et mutations Client Portal;
- anciens endpoints ClientUser de délégation explicitement refusés;
- ancien endpoint générique empêché de modifier les permissions Incident;
- UI ajoutée au panneau Client existant et à sa vue plateforme;
- verrou transactionnel, verrou optimiste, idempotence persistée et audit avant/après;
- validation serveur du tenant, Client, bâtiment, incident et identité;
- dates d'effet/expiration non supportées et explicitement affichées.

## Preuves acquises

La recette PostgreSQL/API est `14/14 PASS`, l'upgrade historique est `PASS`, la matrice Chrome est `12/12 PASS`, et la panne 503/reprise est démontrée. Le lecteur d'écran réel demeure `NOT_VERIFIED`.

## Opérations restantes

1. créer les commits cohérents du candidat;
2. publier la branche et ouvrir la PR ciblée;
3. attendre la CI terminale du HEAD exact et corriger tout échec imputable au lot;
4. arrêter le stack QA en conservant les preuves.

## Après ce mandat

Une fusion ou une release exigera une autorisation distincte. Toute attribution réelle devra nommer le bénéficiaire, les permissions, le bâtiment ou l'incident et le motif; elle ne sera jamais déduite de cette livraison.

## Reprise après campagne synthétique

L'outillage ciblé est fusionné dans `main` au SHA `34a09e56c89b947e890c066bff42e337f8a9643f`. Il a démontré le dry-run, le verrou partagé, la sauvegarde, la préparation transactionnelle, l'absence d'effets externes, la finalisation indépendante et sa reprise idempotente. Aucune release applicative n'a été déclenchée.

La recette navigateur reste `NOT_VERIFIED` : l'identité synthétique existante `info@getcoro.io` n'est pas authentifiable par Mathieu avec les identifiants disponibles. Ne pas utiliser `admin@getcoro.io`, une identité homonyme ou un compte réel comme substitut. Toute nouvelle campagne doit d'abord disposer d'une identité QA distincte dont le parcours d'authentification et le MFA normaux sont utilisables.

État final vérifié : identité QA inactive, zéro permission Incident individuelle, zéro affectation active, zéro appareil de confiance, zéro lien actif, fixture synthétique annulée/inactive et aucun accès résiduel. Runs : préparation `41666211609`, finalisation `41668163043`, reprise idempotente `41668416320`.
