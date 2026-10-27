# Audit ciblé — espace Documents d’un projet

## Périmètre et baseline

- Écran audité : application organisation, fiche projet, composant `ProjectFiles`.
- Baseline code : `b838a6abdbe673520d1585b1f16e3698b9465d3e` (`origin/main`, vérifiée le 27 octobre 2026).
- Production : même SHA selon la dernière inspection gouvernée disponible; aucune donnée documentaire de production n’a été consultée.
- Mandat : audit uniquement. Aucun code produit, permission, donnée, migration ou déploiement modifié.

## Architecture observée

La fiche projet charge `ProjectFiles`, qui appelle `GET /project-files/project/:projectId`. Les dépôts utilisent `POST` sur la même ressource. Les transitions documentaires utilisent `PUT /project-files/:id/{review|approve|revoke}`. Le contenu privé passe par `GET /project-files/:id/content`; une route historique `download` retourne encore la référence persistée.

Les nouveaux objets utilisent le stockage privé canonique, une clé tenant/bâtiment, un SHA-256 et une référence sentinelle `private:project-file`. La chaîne de versions, les états DRAFT/REVIEW/APPROVED/SUPERSEDED/REVOKED, les dates d’effet/expiration et les événements de cycle existent.

## Résultat fonctionnel

- Présents : liste groupée par catégorie, taille, auteur, date, version, visibilité, état, téléchargement, dépôt, nouvelle version, revue, approbation et révocation.
- Absents de cet écran : recherche, filtre interactif, tri, pagination, prévisualisation intégrée et indication explicite de langue.
- Le statut courant est calculé côté serveur, mais l’interface ne donne pas une hiérarchie suffisamment explicite entre racine, version courante et historique.
- Une indisponibilité de la liste est rendue comme une collection vide; aucun message différencié ni bouton de reprise n’existe.

## Autorisation et confidentialité

Le contrôleur exige une session JWT et une organisation active. Toutefois, les routes de liste, dépôt, contenu privé, historique, version courante et URL de téléchargement transmettent l’organisation, mais pas l’acteur ni le périmètre projet canonique. Le service sait accepter `permittedBuildingIds`, mais le contrôleur interne ne les fournit pas. La lecture canonique de `/projects/:id` utilise pourtant `projectAccessWhere(actor)` et exige `isActive: true`.

Conséquence : le contrat source ne prouve pas qu’un opérateur non affecté, mais appartenant à la même organisation et connaissant un identifiant, est refusé. Il ne prouve pas non plus la cohérence avec les projets désactivés. L’upload ne refuse pas explicitement un projet archivé.

La route historique `download` retourne directement `file.url`; le frontend ouvre lui aussi toute référence non privée dans une nouvelle fenêtre. Cela conserve une compatibilité historique, mais ne garantit pas que l’accès au contenu passe par l’autorité privée actuelle ni que les règles de révocation/expiration soient réévaluées.

## QA et limites de preuve

Le runner `qa/global-e2e/src/organization-project-documents-audit.mjs` produit une preuve contractuelle reproductible et échoue sur les invariants absents. Le moteur Docker local était indisponible et les dépendances du worktree isolé n’étaient pas installées; PostgreSQL, API réelle, téléchargement octet/hash et matrice navigateur 12/12 restent donc `NOT_VERIFIED`. Ces limites ne sont pas assimilées à des réussites.

## Verdict limité

`DÉFECTUEUX — CORRECTION DE SÉCURITÉ REQUISE AVANT ACCEPTATION DE CET ÉCRAN`.

L’interface contient une base documentaire riche et le stockage privé moderne est présent, mais l’homogénéité d’autorisation entre la fiche projet et ses sous-ressources n’est pas démontrée dans le code actuel. La recette navigateur et le téléchargement réel restent ouverts.

## Addendum de correction et validation — 27 octobre 2026

Le lot applique désormais `projectAccessWhere(actor)` aux listes, dépôts, contenus, historiques et résolutions de version de l’application organisation. Un guard exécuté avant l’intercepteur multipart refuse un dépôt hors périmètre, archivé ou désactivé avant lecture du fichier; le service réapplique la décision.

Les projets archivés actifs restent consultables et téléchargeables, mais leurs mutations documentaires sont refusées. Les projets désactivés ne sont plus accessibles par les sous-routes documentaires. Les téléchargements de l’interface passent tous par le contenu authentifié. Une ancienne référence n’est plus renvoyée au navigateur; seule sa clé persistée, syntaxiquement bornée, est résolue par le stockage privé. Aucune ACL ni référence historique de production n’a été modifiée.

L’interface sépare maintenant chargement, vide et erreur, fournit une action `Réessayer`, efface les données précédentes et ignore les réponses obsolètes après changement de projet.

Résultats : 33/33 tests backend ciblés, TypeScript et builds backend/frontend PASS, PostgreSQL 16 avec 155 migrations PASS, API/stockage/MFA 13/13, PDF synthétique téléchargé avec 41 octets et SHA-256 exact, matrice Chrome 12/12 et panne HTTP 503 suivie d’une reprise PASS.

Preuves assainies : `D:\CORO-QA\runs\organization-project-documents\2026-10-27`.

Verdict actualisé : `VALIDÉ_E2E_QA — LIVRAISON GOUVERNÉE REQUISE`. Ce verdict demeure limité à cet écran et ne valide pas la signature fournisseur, la génération officielle, l’éditeur ni Knowledge.
