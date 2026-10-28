# Audit ciblé de l’éditeur documentaire CORO

Date : 2026-10-28

Branche : `audit/organization-document-editor`

Baseline immuable testée : `12766061c5b0458894dd2d0b3b9dac7a161a2296`

Baseline production vérifiée : même SHA, déploiement GitHub `7385896986`, statut `success`
Verdict : **FAIL — CORRECTION PRODUIT REQUISE AVANT ACCEPTATION DE L’ÉDITEUR**

## Périmètre et préservation

Audit seulement de `/editor/[projectId]`, de ses composants, des API de document et de l’historique de versions. La génération complète, l’approbation, la signature, l’export PDF aval, Knowledge, CORO AI et le portail client ne sont pas acceptés par ce dossier.

- PR #115 `audit/project-document-history` : ouverte, SHA `894dc1c2...`, contrôles verts, inchangée.
- PR #116 `fix/organization-document-generation` : ouverte, SHA `81a6dda0...`, contrôles verts, inchangée et non déployée.
- Candidat WEB-AI gelé : `12766061...`, inchangé.
- Aucun code produit, migration, push, PR, fusion, déploiement ou appel fournisseur n’a été effectué.

## Architecture observée

| Élément | Autorité actuelle | Observation |
|---|---|---|
| Route | `coro-frontend/app/editor/[projectId]/page.tsx` | Route legacy sensible, sans shell applicatif. |
| Lecture | `GET /generator/document/:projectId` | Applique `projectAccessWhere(actor)`. |
| Sauvegarde texte | `PUT /generator/document/:documentId/module/:moduleId/section/:sectionId` | Remplace directement `Document.content`; aucun contrôle d’état, permission d’édition, version attendue ou audit. |
| Modules spécialisés | `Module2Section` à `Module8Section` et éditeur de procédures | Utilisent plusieurs API métier distinctes; aucun contrat commun de lecture seule fourni par la page. |
| Validation | `GET /generator/validate/:projectId` | Filtre seulement par `organizationId`, pas par le périmètre projet canonique. |
| Versions | `/projects/:projectId/versions` | Lecture, création, restauration et suppression sous le seul contrôle d’accès au projet. |
| Concurrence | `Document.updatedAt`, sans jeton attendu | Dernière écriture gagnante; aucun `lockVersion`, ETag ou conflit HTTP 409. |
| Rendu | `formatContent()` + `dangerouslySetInnerHTML` | Le contenu est interpolé sans échappement/assainissement. |

## Environnement QA

- PostgreSQL 16.15 jetable; 157 migrations appliquées.
- Images locales construites depuis le SHA exact : backend `sha256:262940...`, frontend `sha256:25edcb...`.
- Backend réel `127.0.0.1:3170`, application réelle `127.0.0.1:3171`.
- Identités synthétiques, MFA local protégé, stockage privé QA, fournisseurs simulés.
- Réseau Docker interne deny-by-default; aucune donnée de production copiée.
- Preuve : `D:\CORO-QA\audits\organization-document-editor\2026-10-28`.

## Résultats fonctionnels

La campagne documentaire existante a obtenu 13/14 contrôles. Les parcours d’accès au projet, persistance de section, isolation inter-tenant, PDF synthétique ouvrable, soumission et approbation indépendante ont réussi. L’unique échec était un ancien payload `configData` désormais refusé par la validation stricte (HTTP 400); il n’invalide pas les mesures de l’éditeur.

La campagne adversariale de l’éditeur a démontré :

- écriture HTTP 200 sur un document `VALIDATED`;
- écriture HTTP 200 sur un document de projet `ARCHIVED`;
- deux écritures concurrentes HTTP 200/200, avec perte silencieuse d’une valeur;
- création d’une version HTTP 201 sur un projet `VALIDATED`;
- retour du snapshot complet dans la liste de versions;
- injection stockée rendue puis exécutée dans Chrome réel;
- isolation inter-tenant de la lecture documentaire : PASS;
- nettoyage : contenu synthétique et statut restaurés, version de test supprimée.

Contrôles techniques complémentaires : build de production frontend et TypeScript réussi pendant la construction de l’image; 17/17 tests de sécurité projet backend réussis; suite `test:design-system` réussie hors sandbox; syntaxe du runner et `git diff --check` réussis. L’installation verrouillée signale 3 vulnérabilités npm `high` dans les dépendances de développement backend; aucune dépendance n’a été modifiée dans cet audit.

## UX, responsive et accessibilité

Les 12 configurations géométriques (390, 768, 1440 et 2560 px; Classic, Glass Light, Glass Dark demandés) n’ont produit aucun débordement horizontal. Cependant la route est déclarée `legacy-only`: les essais Glass ont conservé `data-ui="legacy"`. Ils prouvent la géométrie sous les préférences demandées, pas une implémentation Glass native.

La lecture seule visuelle du module texte principal est affichée sur les 12 configurations. Elle ne protège pas le serveur et n’est pas propagée aux modules spécialisés. Les actions de version sont cachées par opacité au repos sur desktop, ce qui réduit leur découvrabilité clavier/tactile. Les erreurs de lecture, sauvegarde et version sont principalement envoyées à `console.error`; elles ne fournissent pas une reprise utilisateur gouvernée.

La page n’installe aucun `beforeunload` et ne garde aucun état sale commun. Un changement de section, de langue ou de route réinitialise l’édition locale sans confirmation. Ce contrôle est **FAIL par inspection déterministe du chemin exécuté**; une correction devra ajouter une recette navigateur dédiée.

## Types documentaires

PMU : exercé avec données synthétiques. PSI et PCA : chemins présents, non acceptés de bout en bout dans ce lot. PGC, PRA et PUE : valeurs de schéma disponibles, mais support réel de génération/édition non démontré; statut `NOT_VERIFIED`, sans développement de support.

## Conclusion

L’éditeur ne peut pas être accepté dans son état actuel. La faille d’injection stockée et l’absence de verrou serveur sur les documents finalisés/archivés sont bloquantes. La correction doit rester distincte de PR #115 et PR #116 et commencer par les frontières serveur avant l’amélioration UX.
