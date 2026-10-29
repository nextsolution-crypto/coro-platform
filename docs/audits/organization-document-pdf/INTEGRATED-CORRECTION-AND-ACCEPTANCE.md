# Correction et acceptation intégrée de l’export PDF CORO

## Candidat et dépendance

- Base auditée : `4045fa6fedbaa8624df07488e509c53085832214`.
- Dépendance empilée : PR #124, HEAD vérifié `a99af3ed6e9deef8b96b247c8b4329b002528714` au démarrage du lot.
- Commits du lot : `3782abd6` (produit et migration), `bd00e509` (acceptation PDF), `17900c4d` (compatibilité du runner de révision avec la nouvelle clé étrangère).
- Environnement : PostgreSQL 16 jetable, 161 migrations, backend/frontend réels, stockage privé simulé, MFA local et réseau deny-by-default.
- Production : non consultée et non modifiée par ce lot.

## Contrat livré

### Aperçu

L’aperçu conserve son contrat distinct : il peut rendre le document courant selon l’autorité projet existante, sans créer un export final durable. Le filigrane d’aperçu reste présent.

### Nouvel export final

Un nouvel export final exige côté serveur : projet actif, statut `VALIDATED` ou `EXPORTED`, autorité projet canonique, demande de révision `APPROVED`, version de décision et snapshot intègre de schéma 2. `DRAFT`, `ARCHIVED`, projet désactivé, acteur non affecté, autre organisation, session révoquée et accès anonyme sont refusés avant rendu et sans création d’export.

### Téléchargement

Le téléchargement d’un résultat existant vérifie à nouveau l’accès au projet, l’état `AVAILABLE`, la langue, la taille et le SHA-256 de l’objet privé. La clé de stockage n’est jamais exposée dans le contrat public. Le téléchargement d’artefacts historiques autorisés reste un chemin distinct.

## Autorité approuvée et provenance

Le rendu final utilise le snapshot immuable approuvé, et non `Document.content` courant. Le snapshot inclut le document, le projet, le client, le bâtiment, le conseiller et les plans approuvés. Le résultat conserve les identifiants document, demande de révision et `ProjectVersion`, le hash source, la langue, les options, les versions du gabarit/générateur, la taille et le SHA-256 du fichier.

Une mutation contrôlée du document courant et du nom de bâtiment après approbation n’a pas modifié l’export final. Les snapshots historiques de schéma 1 ne reçoivent aucune approbation rétroactive : un nouvel export final gouverné exige une nouvelle approbation explicite.

## Traitement durable et reprise

`DocumentPdfExport` fournit les états `PROCESSING`, `AVAILABLE` et `FAILED`, une clé d’idempotence unique par projet, un hash de demande, un bail de traitement, une erreur persistée et un endpoint de reprise. Des verrous consultatifs PostgreSQL protègent les demandes concurrentes entre processus.

- Même clé et même demande : même export et une seule ligne.
- Même clé et demande différente : HTTP 409.
- Rendu ou stockage en échec : état `FAILED`, sans faux succès, puis reprise du même export.
- Objet écrit avant panne SQL : manifeste d’artefacts persisté et objet vérifié/réutilisé, sans second rendu.
- Processus interrompu : reprise seulement après expiration du bail.
- Changement d’état ou d’autorité avant publication : publication refusée et aucun audit de succès.
- Objet privé corrompu : téléchargement refusé.

Les tests ciblés couvrent panne moteur, stockage, publication SQL simulée, bail expiré, changement d’état, objet corrompu et idempotence. L’intégration réelle a couvert concurrence et réponse récupérable; aucune panne d’infrastructure externe réelle n’a été provoquée.

## Résultats intégrés

Le parcours génération → édition → sauvegarde → soumission → révision indépendante → décision → réouverture en lecture est `PASS` pour PMU, PSI et PCA sur `17900c4d`. L’auto-approbation, l’archive, le projet inactif, le hors-périmètre, l’inter-tenant et la demande obsolète sont refusés. L’outbox QA a démontré création, échec fournisseur simulé, reprise et un seul événement durable par décision.

Preuves :

- `D:\CORO-QA\runs\organization-document-pdf\2026-10-29\review-final-head`
- `D:\CORO-QA\runs\organization-document-pdf\2026-10-29\pdf-final-head`
- `D:\CORO-QA\runs\organization-document-pdf\2026-10-29\browser-final-head`

## PDF réels

| Fichier | Pages | Taille | SHA-256 |
|---|---:|---:|---|
| PMU FR | 83 | 3 802 396 | `ba3255fa2d5493be1dc1de8b5160e5d0e66ec63e2a2e53ad902d4fdab73a660e` |
| PMU EN | 82 | 3 803 676 | `612bb1fc285dd43dcc7f719e9789e3a5a3b5d6877c919063232c755c68ac9458` |
| PSI FR | 56 | 1 331 777 | `3e3e25ab2c1c4a38d809edb868ff3333d1de53596e56819c99f877c3fe245773` |
| PCA FR | 74 | 2 184 955 | `5d60a7969c4a6b514ad5d6dff8e72c80fda45aa83fb309332700651bb930124c` |
| PMU FR depuis snapshot après mutation | 83 | 3 797 980 | `b140f11518d56ea8cf60162d10879693f1abf15e06cbb8b8fcdd155aee47b5c6` |
| Aperçu PMU FR | 83 | 3 806 399 | `b45ad434e0f5742f70732b0d747013ca7cc1e16d291fb0453b130a07a571ec1f` |

Tous sont PDF 1.7, format Letter, non chiffrés et sans JavaScript. Les couvertures, pages médianes et dernières pages PMU/PSI/PCA ont été inspectées visuellement; l’ensemble des pages a été rendu en PNG et reste disponible dans `pdf-final-head/renders`. Aucun tronquage, chevauchement ou glyphe cassé n’a été observé sur les échantillons inspectés.

## Navigateur

La matrice 390×844, 768×1024, 1440×900 et 2560×1440, en Classic, Glass Light et Glass Dark, est `12/12 PASS`. Le scénario authentifié a confirmé focus initial, confinement du focus, Escape, restauration du déclencheur, zoom 200 %, F5 avec récupération du même export, téléchargement du bon fichier et zéro erreur console critique.

## Migration

La migration `20261114010000_document_pdf_export_governance` est additive. Une base jetable a été montée exactement à la migration 160, peuplée d’un projet, document et review synthétiques préexistants, puis migrée à 161. Résultat : projet `REVIEW`, document version 3/lockVersion 4, review `PENDING`, aucune `decisionVersion` inventée et zéro export rétroactif.

## Accessibilité et limites

Le PDF contient désormais titre, auteur, sujet, créateur et langue de catalogue. Le texte est extractible et le rendu est lisible. Cependant Poppler rapporte `Tagged: no` : PDF/UA, structure sémantique complète, textes alternatifs et lecteur d’écran réel restent `NOT_VERIFIED`. Une refonte du moteur ou une alternative HTML accessible constitue un lot distinct.

PGC, PRA et PUE restent `NOT_VERIFIED`. La signature réelle, la valeur juridique, les notifications externes et les fournisseurs réels sont hors périmètre.

## Incident QA observé

Docker Desktop a provoqué une interruption d’appel système sur le bind-mount PostgreSQL et une récupération WAL. PostgreSQL a terminé sa récupération et est revenu sain; la campagne finale a ensuite réussi. Ce constat concerne l’infrastructure QA Windows, pas une base ni une opération de production.

## Verdict

**ACCEPTATION_INTÉGRÉE_PASS_AVEC_LIMITES_D_ACCESSIBILITÉ_PDF** pour PMU FR/EN, PSI FR et PCA FR sur le périmètre décrit. Serveur, navigateur, stockage privé et fichiers produits ont été vérifiés. La fusion et le déploiement restent exclus.
