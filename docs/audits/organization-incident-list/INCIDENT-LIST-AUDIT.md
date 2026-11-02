# Correction CORO Incident — lot 1 : liste

## Verdict

**ACCEPTATION_INTÉGRÉE_PASS — PR_READY.**

La liste est paginée côté serveur, son contrat est minimal, ses compteurs couvrent tout le périmètre autorisé et les statuts/exercices sont rendus sans ambiguïté. L’acceptation a été exécutée avec PostgreSQL 16, le backend et le portail réels, puis dans Chrome sur 12 configurations.

## Références

- Baseline auditée : `4871f31823682a73bbd3e5af9e1c12ac3bbc52d2`.
- Audit repris : `5015272c907687700009491c827a4cf6f9e2599a` (cherry-pick `ca99eddd`).
- Candidat produit testé : `1c176c4eb2fe1812ba8ef3fd98132c2a098926fc`.
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
- Portail Incident : 7/7 PASS.
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
- Production authentifiée : **NOT_VERIFIED**; aucune production n’a été utilisée ou modifiée.
- La route reste un historique par bâtiment. Responsable et sévérité globale ne sont pas ajoutés faute d’autorités canoniques approuvées.
