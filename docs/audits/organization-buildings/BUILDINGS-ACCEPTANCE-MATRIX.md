# Bâtiments — matrice d'acceptation

Statuts : `PASS`, `FAIL`, `PARTIAL`, `NOT_VERIFIED`, `NOT_APPLICABLE`.

## Routes et actions

| Surface | Action | Autorité actuelle | Statut |
|---|---|---|---|
| Application interne | Lister les bâtiments | JWT, organisation active, `organizationId` | PASS serveur |
| Application interne | Lire un bâtiment | JWT, organisation active, `organizationId` | PARTIAL : inactifs lisibles directement |
| Application interne | Lister les projets du bâtiment | JWT seulement après route | FAIL BLD-001 |
| Application interne | Créer/modifier/désactiver | JWT + organisation active | FAIL : permission fonctionnelle absente |
| Application interne | Affecter un responsable | Courriel global | FAIL BLD-002 |
| Portail client | Lister/lire | `ClientJwtGuard`; manager client+bâtiments, corporate organisation | PASS serveur ciblé |
| Documents bâtiment | Lister | Parent serveur + tenant + visibilité/lifecycle | PASS ciblé |
| Documents bâtiment | Déposer | Parent serveur; client grant/assignment; tout User interne actif | PARTIAL BLD-012 |
| Documents bâtiment | Télécharger direct | Parent serveur exact + stockage privé | PARTIAL BLD-007 |
| Documents bâtiment | Gérer les grants | Manager responsable/superviseur; admin interne | PASS ciblé |
| Knowledge | Indexer/rechercher/citer | version approuvée, source et bâtiment autorisés | PASS tests ciblés; E2E complet NOT_VERIFIED |

## Matrice d'acteurs

| Acteur synthétique | Liste | Lecture directe | Mutation | Documents | Verdict |
|---|---|---|---|---|---|
| User interne habilité | organisation | organisation | aucune permission dédiée | lecture + dépôt | PARTIAL |
| User interne non habilité | organisation | organisation | mutation encore atteignable | dépôt encore permis | FAIL |
| CLIENT_MANAGER affecté | client + bâtiments affectés | par listes portées | aucune mutation Bâtiment | shared; dépôt selon assignment/grant | PASS ciblé |
| CLIENT_MANAGER hors bâtiment | refus | refus indirect | N/A | refus | PASS tests ciblés |
| CLIENT_CORPORATE | organisation sur portail | organisation | N/A | même client seulement | DÉCISION BLD-011 |
| Autre organisation | refus attendu | `/buildings/:id/projects` fuit | N/A | refus | FAIL BLD-001 |
| Identité inactive/révoquée | refus | refus | refus | refus | PASS tests ciblés |

## Formats documentaires

| Famille | Dépôt | Extraction/indexation annoncée | Limite honnête |
|---|---|---|---|
| PDF, TXT, MD, CSV, TSV, DOCX, XLSX | Oui | Oui | dépend de l'approbation et du job d'ingestion |
| JPEG, PNG, TIFF | Oui | Oui | OCR local seulement selon extracteur; pas d'OCR universel |
| XLS, DOC | Oui | Non | conservé/téléchargeable, Knowledge `UNSUPPORTED` |
| WebP | Oui | Non | conservé/téléchargeable |
| DWG, DXF, IFC | Oui | Non | aucune extraction annoncée |
| EXE/autre | Non | Non | refus explicite |

## Navigateur et responsive

- Chrome headless réel, données synthétiques, serveur local du worktree.
- `/dashboard` et `/buildings` : 320, 390, 768, 1440, 2560 px, soit 10/10 PASS.
- Largeur maximale mesurée : 445 px; aucun débordement horizontal.
- Captures et mesures : `evidence/building-layout/`.
- Classic : PASS pour ce sous-parcours.
- Glass Light/Dark : `NOT_APPLICABLE` en production portail (le registre confirme Classic uniquement hors build préproduction); campagne bêta Glass non exécutée.
- Fiche, création, édition, désactivation, documents et Knowledge en navigateur authentifié multi-acteurs : `NOT_VERIFIED`, car les défauts serveur bloquants interdisent une acceptation honnête.
- Lecteur d'écran réel : `NOT_VERIFIED`.

## Tests exécutés

| Contrôle | Résultat |
|---|---|
| Jest Buildings/Documents/Portal/Knowledge | 30/30 PASS |
| Runner de reproduction audit | 3/3 PASS |
| Portail `test:skin` | 26/26 PASS |
| Build portail + TypeScript | PASS |
| Chrome géométrie synthétique | 10/10 PASS |
| Inspection production existante 41099241216 | SUCCESS, lecture seule |

Les PASS existants ne neutralisent pas les FAIL reproduits.

## Matrice du candidat correctif

| Domaine | Résultat | Preuve |
|---|---|---|
| Autorité liste/directe/projets | PASS | API réelle QA, autre tenant 404, opérateur affecté limité. |
| Mutation et DTO | PASS | opérateur 403; payload système 400. |
| Idempotence et audit | PASS | double requête 201/201 même ID; rejeu identique; conflit 409; 1 bâtiment/1 audit. |
| Portail Manager/Corporate | PASS | Manager affecté seulement; Manager sans bâtiment vide; Corporate tenant; autre tenant 404. |
| Documents privés | PASS | upload 201, download 200, 30 octets identiques; autre tenant 404. |
| Migration | PASS | 164 depuis zéro; 163→164 avec relations historiques conservées. |
| Build et Design System | PASS | backend, frontend, portail et suite Design System. |
| Chrome organisation | 12/12 PASS | 4 viewports × 3 thèmes. |
| Chrome portail | 12/12 PASS | 4 viewports × 3 thèmes, cartes ≤445 px. |
| F5 / zoom 200 % / console | PASS | deux interfaces; aucune erreur critique. |
| Lecteur d'écran réel | NOT_VERIFIED | Runtime fiable indisponible dans le harnais isolé. |

Evidence sanitée : `D:\CORO-QA\tracking\organization-buildings\api-acceptance.json` et dossier `browser` (24 captures + rapport JSON).

## Réconciliation de production

| Contrôle | Résultat | Preuve |
|---|---|---|
| PR et candidat | PASS | PR #137 fusionnée; SHA `2e6c06ef2ca2a2606e779c0480f64e6cea3d6a0c`. |
| CI du main exact | PASS | 41133503417 `SUCCESS`. |
| Images immuables | PASS | backend `2c0c9e9f…130b`; frontend `aa33859a…04b4`; portail `04c8e950…3d1f`; website `d727ebc0…f632`. |
| Release et réconciliation | PASS | 41134179928 `SUCCESS`; état `SUCCEEDED/COMPLETED`. |
| PostgreSQL | PASS | 16.15; 164 migrations; tête Bâtiments; 0 migration échouée. |
| Sauvegarde/restauration | PASS | backup distant vérifié et restore drill `RESTORE_VERIFIED`. |
| Services | PASS | quatre services actifs, restart count 0; PostgreSQL `healthy`. |
| Rollback | PASS avec limite documentée | 4/4 images disponibles; ancienne application vulnérable sur le périmètre Bâtiments, suspension des routes requise en cas de rollback. |
| Capacité | PASS | 36 529 483 776 octets libres; marge release 16 823 746 510 octets. |
| Lecteur d'écran réel | NOT_VERIFIED | Aucun runtime fiable disponible pendant la campagne. |

Verdict : `VALIDATED_INTEGRATED_MERGED_DEPLOYED_RECONCILED`.
