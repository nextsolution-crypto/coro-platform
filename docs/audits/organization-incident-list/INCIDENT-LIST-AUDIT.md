# Correction CORO Incident — lot 1 : liste

## Verdict

**ACCEPTATION_INTÉGRÉE_PASS — PR_READY.**

La liste est paginée côté serveur, son contrat est minimal, ses compteurs couvrent tout le périmètre autorisé et les statuts/exercices sont rendus sans ambiguïté. L’acceptation a été exécutée avec PostgreSQL 16, le backend et le portail réels, puis dans Chrome sur 12 configurations.

## Références

- Baseline auditée : `4871f31823682a73bbd3e5af9e1c12ac3bbc52d2`.
- Audit repris : `5015272c907687700009491c827a4cf6f9e2599a` (cherry-pick `ca99eddd`).
- Candidat produit testé initial : `1c176c4eb2fe1812ba8ef3fd98132c2a098926fc`.
- HEAD final de la PR #170 : `ecd844c1767ac4b43a61ce280aceef32d74de862` (le HEAD accepté `feeb846926e3b3f1eac9e3849c31566dee39733b` a été complété par la correction du consommateur Population).
- SHA fusionné, livré et réconcilié : `082f396bf3d6e9ae85c5d47e980d09bac0df13fc`.
- Branche corrective : `fix/organization-incident-list`.
- Aucune migration produit.

## Correction

- Pagination explicite (`page`, `pageSize` borné à 100), total filtré et ordre stable avec `id` comme départage.
- Filtres avant pagination; toute recherche, filtre ou tri ramène à la première page.
- Recherche sur les seuls champs non sensibles disponibles : code/libellé du type et `procedureCode`.
- Tri sur date de survenue, statut ou type.
- Compteurs complets : total, états non terminaux, ventilation par statut, exercices et incidents réels.
- Projection explicite excluant instantanés, fiche d’intervention, jeton public et contenus détaillés.
- Libellés propres à `PRE_ALERT`, `ACTIVE`, `CONTAINED`, `RESOLVED`, `CANCELLED`; repli « Statut inconnu ».
- Marqueurs et filtre canoniques « Exercice » / « Incident réel ».
- Protection par identifiant de requête contre les réponses obsolètes.
- États distincts : chargement, vide, filtre vide, erreur, refus et données périmées avec reprise.
- Cibles interactives de 44 px minimum.
- Le registre Population présente explicitement sa page comme les 25 incidents récents sur le total et renvoie vers l’historique paginé complet; il ne traite plus une page comme l’historique exhaustif. Aucun consommateur Organisation du endpoint Incident n’existe dans le dépôt.

## Acceptation intégrée

- 137 incidents synthétiques accessibles sur 6 pages, 137 identifiants uniques, sans omission ni doublon.
- Dates identiques : ordre déterministe par date puis identifiant.
- Recherche + statut + nature + tri combinés : résultat exact.
- Compteurs : 137 total, 83 ouverts, 35 exercices, 102 incidents réels.
- `PRE_ALERT` et `CANCELLED` conservés; exercice/réel rendu depuis `isExercise`.
- Contrat réseau minimal; aucun champ sensible de la fixture dans la réponse.
- Corporate et manager affecté autorisés; sans bâtiment 403, autre tenant 404, anonyme 401; paramètres invalides 400.
- Détail autorisé 200 et refus inter-tenant 404.
- Panne 503 visible sans faux zéro, filtres et 46 résultats précédents conservés, puis reprise réussie.
- Deux recherches reçues dans l’ordre inverse : seule la dernière sélection est affichée.
- F5, clavier/focus et zoom 200 % réussis; aucune erreur console critique.

## Chrome et tests

12/12 PASS : 390×844, 768×1024, 1440×900 et 2560×1440 sous Classic, Glass Light et Glass Dark. Les captures ont été inspectées : aucun débordement horizontal, contenu long lisible, pagination utilisable et aucune cible sous 44 px.

- Backend ciblé : 28/28 PASS.
- Portail Incident et compatibilité Population : 8/8 PASS.
- Design System/navigation : 26/26 PASS.
- TypeScript et builds backend/portail : PASS.
- PostgreSQL 16 : 167 migrations PASS depuis zéro.
- Harnais et `git diff --check` : PASS.

## Preuves

- `D:\CORO-QA\tracking\organization-incident-list\incident-list-api-acceptance.json`
- `D:\CORO-QA\tracking\organization-incident-list\incident-list-browser-acceptance.json`
- `D:\CORO-QA\tracking\organization-incident-list\browser\*.png`
- `D:\CORO-QA\runs\incident-fix\stack-manifest.json`

## Limites

- Fiche détaillée, communications, Ops et évacuation hors de ce lot.
- Lecteur d’écran réel : **NOT_VERIFIED**.
- Production authentifiée : **PARTIAL**. Une session Client réelle a ouvert le registre et la route Incident, puis confirmé le refus 403 explicite, stable après F5 et après « Réessayer », sans faux zéro ni contenu protégé. Le compte observé ne possède toutefois pas `INCIDENT_READ`; recherche, filtres, tri, pagination et états de données n’étaient donc pas observables en production et conservent leurs preuves QA.
- Console production : **PARTIAL / RÉSERVE**. Les 403 attendus sont journalisés; le service worker produit aussi des rejets non gérés lorsqu’une extension Chrome utilise un schéma `chrome-extension`. Aucun faux succès n’est affiché, mais le critère « absence d’erreur console critique » n’est pas déclaré PASS.
- La route reste un historique par bâtiment. Responsable et sévérité globale ne sont pas ajoutés faute d’autorités canoniques approuvées.

## Livraison gouvernée

- PR #170 fusionnée dans `082f396bf3d6e9ae85c5d47e980d09bac0df13fc`.
- CI du SHA fusionné : run `41551760955`, **SUCCESS**.
- Gate capacité pré-release : run `41552412893`, **SUCCESS**.
- Inspection pré-release : run `41552417723`, **PASS / GO**.
- Release unique : run `41552585795`, **SUCCESS**.
- Inspection post-release : run `41554507500`, **PASS / GO**.
- Capacité post-release : run `41554515301`, **HEALTHY**, 40 300 187 648 octets libres et 20 594 272 581 octets de marge sur le gate de release.
- Réconciliation : run `41554684601`, **SUCCESS**.
- PostgreSQL 16.15, 167 migrations, tête `20261120010000_permanent_qr_codes`; aucune migration ajoutée par ce lot.
- Sauvegarde `REMOTE_VERIFIED`, restauration `RESTORE_VERIFIED`, verrou de déploiement libre et quatre images de rollback disponibles.

Digests actifs :

- backend : `sha256:256b70e3257358dcbdff5f9b0eb20e210e6a1686364f7372b0315bef8d4427c9`;
- frontend : `sha256:a0aa13bc03f989db4feab5fb409c22e43fad6685cfb4057af805eb599d6309cf`;
- portail Client : `sha256:c520b08f01eb46a87e38374ea3a4fdcf1dfa6d3ed99e30bc0460e4f57a2d6fcc`;
- site public : `sha256:ba706a7156d2a68a49f83ae40bc942f876c3ec0b1d7b6ac26d76e868731bb1b3`.

## Vérification navigateur de production

- Session authentifiée conservée après F5 : **PASS**.
- Ouverture depuis le registre Sentinelle : **PASS**.
- Refus d’un acteur sans permission Incident : **PASS**, message visible et accessible, aucune donnée incidente affichée.
- Nouvelle tentative : **PASS**, le refus demeure cohérent et aucun faux succès n’apparaît.
- Rendu desktop et largeur réduite par DevTools : **PASS visuel**, aucun débordement constaté sur l’état de refus.
- Recherche, filtres, tri, pagination, statuts et exercices : **NOT_OBSERVABLE_IN_PRODUCTION** avec cette identité et l’absence de données autorisées; preuves QA conservées.
- Console : **PARTIAL**, erreurs 403 attendues et dette du service worker avec les requêtes d’extension; aucun défaut de données ou de navigation observé.
