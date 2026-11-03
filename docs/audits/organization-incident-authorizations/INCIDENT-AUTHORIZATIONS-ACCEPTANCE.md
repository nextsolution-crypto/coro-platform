# Acceptation — administration des autorisations Incident

## Candidat

- Branche : `fix/incident-authorization-administration`.
- Baseline : `f0f2442871e4301d94e98fdfe451c6e2117ab71e`.
- Commit produit testé : `9ba80c73`.
- HEAD de PR : renseigné après le commit de preuves.
- Stack : PostgreSQL 16, backend et frontend réels; données et acteurs exclusivement synthétiques.

## Résultats

| Contrôle | Résultat |
|---|---|
| TypeScript/build backend | PASS |
| TypeScript/build frontend | PASS |
| Services Clients et autorisations Incident | 25/25 PASS |
| Régressions portail/gouvernance Incident | 23/23 PASS |
| Contrat frontend Incident | 3/3 PASS |
| Migration depuis zéro (168 migrations) | PASS |
| Upgrade depuis la tête parente avec affectation historique | PASS |
| API/PostgreSQL réels | PASS, 14/14 |
| Chrome, 4 viewports × 3 thèmes | PASS, 12/12 |
| F5, zoom 200 %, focus clavier | PASS |
| 503 déterministe, erreur visible et reprise | PASS |
| Console hors panne injectée | PASS, aucune erreur critique |
| Lecteur d'écran réel | NOT_VERIFIED : aucune restitution vocale fiable disponible |

## Preuves

- `D:\CORO-QA\tracking\organization-incident-authorizations\api-acceptance.json`;
- `D:\CORO-QA\tracking\organization-incident-authorizations\migration-upgrade.json`;
- `D:\CORO-QA\tracking\organization-incident-authorizations\browser\browser-acceptance.json`;
- 12 captures réelles dans le même dossier `browser`.

## Invariants démontrés

- permission individuelle seule : refus fail-closed;
- affectation seule : refus;
- permission et affectation active compatibles : lecture autorisée;
- attribution atomique, rejeu idempotent et révocation optimiste;
- révocation effective sur la requête suivante avec la session existante;
- ClientUser désactivé refusé côté serveur;
- autre organisation et autre bâtiment refusés sans écriture;
- trois événements d'audit exacts : permission, attribution, révocation;
- un ClientUser ne peut pas déléguer;
- les lectures active, historique et détail appliquent la double garde;
- le panneau n'expose aucune affectation d'un autre client.

## Limites

- Les dates futures d'effet et d'expiration ne sont pas prises en charge; l'interface l'indique explicitement.
- Aucun fournisseur, alarme, communication externe ou compte de production n'a été utilisé.
- La restitution par lecteur d'écran réel reste `NOT_VERIFIED`.

## Réconciliation de migration avant intégration

- Ancien identifiant local jamais partagé : `20261103020000_incident_authority_idempotency`.
- Tête de production vérifiée : `20261120010000_permanent_qr_codes` (167 migrations).
- Identifiant final : `20261121010000_incident_authority_idempotency`.
- Création depuis zéro : PASS, 168 migrations dans l'ordre attendu.
- Upgrade depuis la tête de production : PASS avec affectation historique conservée et aucune permission individuelle attribuée implicitement.
- Preuve : `D:\CORO-QA\tracking\organization-incident-authorizations\migration-upgrade-20261121010000.json`.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS — PR_READY`, sous réserve de la CI terminale du HEAD publié.

## Livraison gouvernée du 3 novembre 2026

- HEAD final revu : `59596909384b40c080f9e510d42440fae3cbc43b` (migration réconciliée après la tête réelle de production).
- PR `#175` fusionnée dans `d9eb6d84668a5773257ec75b7a06c062b7786384`.
- CI main : `41637714878`, `SUCCESS`.
- Capacité pré-release : `41638346616`, `SUCCESS`.
- Inspection pré-release : `41638351647`, `PASS / GO`.
- Release unique : `41638570059`, `SUCCESS`; la réconciliation intégrée a produit `RECONCILIATION_SUCCEEDED`.
- Inspection post-release : `41640868682`, `PASS / GO`.
- Production active : `d9eb6d84668a5773257ec75b7a06c062b7786384`.
- PostgreSQL 16.15 : 168 migrations, tête `20261121010000_incident_authority_idempotency`, aucune migration en échec.
- Services applicatifs et PostgreSQL : tous actifs, aucun redémarrage; verrou de déploiement libre.
- Sauvegarde : `REMOTE_VERIFIED`; restauration : `RESTORE_VERIFIED`.
- Capacité post-release : 36 532 028 KiB libres sur `/dev/vda1` (55 % utilisés).

### Images actives immuables

- Backend : `ghcr.io/nextsolution-crypto/coro-backend@sha256:e0d21e2632e048d75ff3300d620a7a6109ea417bd7851f86ec63ef01b97744fd`.
- Frontend : `ghcr.io/nextsolution-crypto/coro-frontend@sha256:279c718d0c3ad3dbb5c47128bee54e4f13782612ada6db4708d0c0c00ab7dcc0`.
- Client Portal : `ghcr.io/nextsolution-crypto/coro-client-portal@sha256:ca5f3158421e7e59c6a6f20630d776dc54ea268109c7b43234b4a2025c5898a6`.
- Website : `ghcr.io/nextsolution-crypto/coro-website@sha256:3c001027932b29388e5530ddf917d1b44650c1e0c53b5d2c34020afe7c91be12`.

### État d'acceptation production

- Mécanisme livré : `PASS`.
- Administration vérifiée par inspection technique : `PASS` (routes et migration actives).
- Administration vérifiée visuellement avec la session `SUPER_ADMIN` légitime de Mathieu : `PASS`; fiche Client, permissions individuelles, périmètres bâtiment/incident et affectations existantes consultés sans mutation.
- F5 : `PASS`; l'administration et l'état « Aucune affectation Incident » sont restitués après rechargement.
- Responsive : `PASS` à 390 × 844 et au viewport desktop courant; largeur documentaire 375 px pour 390 px, aucun débordement horizontal.
- Console : aucune erreur applicative critique; trois erreurs de canal d'extension Chrome sans effet produit observé.
- Attribution nominative : `EN_ATTENTE_APPROBATION`; aucune permission ni affectation de production n'a été modifiée.
- Activation/expiration programmées : non disponibles; aucune promesse de droit temporaire automatique.
- Lecteur d'écran réel : `NOT_VERIFIED`.

### Proposition nominative minimale à approuver

- Bénéficiaire : `Patrick JEAN-ERNEST` (ClientUser existant du Client `GELE SECURITE`).
- Organisation : organisation actuellement rattachée à ce Client; aucune portée inter-organisation.
- Bâtiment : `BUREAUX` uniquement.
- Permission individuelle : `INCIDENT_READ` uniquement.
- Affectation : bâtiment `BUREAUX`, portée bâtiment, permission `INCIDENT_READ` uniquement.
- Justification : recette en lecture seule de la liste et d'une fiche Incident autorisée; aucune commande de cycle de vie.
- Durée proposée : temporaire, avec révocation manuelle immédiatement après la recette, puisque l'expiration programmée n'est pas disponible.
- Révocation : écran Client > Autorisations Incident; retrait de l'affectation puis retrait de la permission individuelle, avec vérification du refus sur la session existante.

Cette proposition n'est pas une attribution approuvée. `INCIDENT_SUPERVISE` et `INCIDENT_COMMAND` restent exclus.

## Tentative nominative et remise en état

- Attribution approuvée : Patrick JEAN-ERNEST, Client `GELE SECURITE`, bâtiment `BUREAUX`, `INCIDENT_READ` uniquement.
- État initial relevé : aucune permission Incident individuelle; aucune affectation Incident active; permissions opérationnelles préexistantes inchangées.
- Permission individuelle `INCIDENT_READ` enregistrée à `2026-11-03T14:21:17.541Z`.
- Affectation bâtiment refusée par l'autorité serveur : « Le compte client n est pas affecte a ce batiment. »
- Aucun contournement : Patrick n'a pas été ajouté au bâtiment et aucun rôle, périmètre ou incident n'a été modifié.
- Permission individuelle retirée à `2026-11-03T14:24:47.186Z`.
- Après F5 : `INCIDENT_READ`, `INCIDENT_SUPERVISE` et `INCIDENT_COMMAND` absents; aucune affectation Incident active; état initial rétabli.
- Audit append-only observé dans Organization 360 / CORO Internal : deux événements `CLIENT_USER_INCIDENT_PERMISSIONS_CHANGED`, acteurs, cibles redacted et motifs distincts pour l'ajout et la révocation.

Verdict : `RECETTE_NON_REALISEE — BENEFICIAIRE_NON_ADMISSIBLE`.

## Campagne synthétique gouvernée du 3 novembre 2026

- Outillage initial : `4fd5cd80c04e7ff05ea31d2c54d480e4bb9c7ce7`, PR `#178`, fusion `4376c30f7eda5b87e44c1c1bb8499032ae559705`.
- Résolution du conteneur Compose : `ae23fe31bd80991b6bbb6889864625143fe8cac0`, PR `#179`, fusion `847e670b1d4fea6ab0a4562b335f2677b4fa67bd`.
- Audit système typé : `bf0c0c71`, PR `#180`, fusion `34a09e56c89b947e890c066bff42e337f8a9643f`.
- CI terminales : `41662520758`, `41664464679` et `41665325225`, `SUCCESS`; aucune release applicative déclenchée.
- Dry-run initial : `41663459253`, `PASS`, aucune mutation, identité inactive, zéro droit, zéro affectation, zéro fixture.
- Première préparation : `41663699268`, `FAIL` sur `AuditLog_exactly_one_actor_check`; transaction annulée intégralement. Dry-run de réconciliation `41663979393` : baseline intacte.
- Préparation corrigée : `41666211609`, `PASS`; identité QA activée, exercice synthétique minimal créé, capacité publique désactivée à la création, zéro communication ou événement Population.
- Administration : `INCIDENT_READ` individuel et affectation `INCIDENT_READ` limitée à l'incident synthétique; aucune portée bâtiment, aucun `INCIDENT_SUPERVISE` ou `INCIDENT_COMMAND`.
- Recette navigateur authentifiée : `NOT_VERIFIED`. Mathieu ne dispose pas des identifiants de l'identité QA `info@getcoro.io`; la session Client ouverte appartenait à une autre identité et n'a pas été utilisée comme substitut.
- Finalisation : `41668163043`, `PASS`; identité inactive, permission individuelle absente, affectation révoquée, zéro appareil et zéro lien actif, fixture `CANCELLED` et inactive, capacité publique révoquée, `residualAccess:false`.
- Reprise idempotente : `41668416320`, `PASS`, `productionMutation:false`, `alreadyFinalized:true`, `residualAccess:false`.
- Vérification UI finale : compte marqué inactif, aucune permission Incident individuelle, affectation ciblée marquée révoquée et aucune permission effective.

Verdict de campagne : `OUTILLAGE_GOUVERNE_PASS — REMISE_EN_ETAT_PASS — ACCEPTATION_NAVIGATEUR_NOT_VERIFIED_IDENTITE_NON_AUTHENTIFIABLE`.

## Reprise de clôture après le correctif #182 — 3 novembre 2026

- Dry-run initial `41698375099` : `PASS`; identité inactive, aucune permission Incident individuelle, aucune affectation de campagne, aucune fixture active, aucun employé ni occupant synthétique résiduel.
- Préparation `41698697992` : `PASS`; ClientUser QA `7a366320-0505-4280-a915-e3e784d22407` activé et exercice synthétique `ab86b0a6-c70c-4c26-9ed7-ad596fea4cff` créé dans le bâtiment QA; capacité publique désactivée dès la création; zéro livraison externe, événement Population ou alerte Population.
- Attribution minimale : `NOT_VERIFIED`. Le workflow ne confère volontairement aucun droit Incident. La session `SUPER_ADMIN` disponible peut observer l'organisation QA, mais la fiche Client inter-organisation est en lecture seule et la route Client directe est refusée par le périmètre canonique. Aucun opérateur interne habilité n'existe dans l'organisation QA pour effectuer l'attribution; aucun contournement SQL ou utilisation d'une identité réelle n'a été tenté.
- Authentification, liste, fiche, F5 et responsive avec le ClientUser QA : `NOT_EXECUTED`, car la double autorité minimale n'a pas pu être constituée par un point d'entrée gouverné existant.
- Remise en état `41699393782` : `PASS`; identité inactive, `individualIncidentRead:false`, zéro affectation active, zéro appareil de confiance, zéro magic link, zéro lien de réinitialisation, fixture inactive et `CANCELLED`, capacité publique révoquée, `residualAccess:false`.
- Dry-run final `41699726935` : `PASS`, `productionMutation:false`, baseline de nouveau admissible et entièrement vide.

Verdict de cette reprise : `ACCES_AUTORISE_NON_DEMONTRE — REMISE_EN_ETAT_VERIFIEE`. Le refus d'une identité non autorisée n'est pas assimilé à l'acceptation d'une lecture autorisée. Patrick et les identités réelles n'ont pas été utilisés ou modifiés.
