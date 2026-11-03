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
