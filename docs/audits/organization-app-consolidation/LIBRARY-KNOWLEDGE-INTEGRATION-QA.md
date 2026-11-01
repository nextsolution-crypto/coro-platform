# Bibliothèque → Knowledge / CORO AI authentifié

## Architecture livrée

- `ProjectFile` demeure une source canonique inchangée.
- Le catalogue Bibliothèque est lu à la demande depuis `ProcedureDefault` et `ProcedureOverride`; aucune copie concurrente n’est créée.
- L’autorité effective est `PROJECT` puis `ORGANIZATION` puis `GLOBAL`. Une surcharge inactive retire la source de la récupération courante.
- Une demande avec `projectId` vérifie le projet côté serveur avant de lire le catalogue. Un `CLIENT_MANAGER` doit conserver son client canonique et une affectation au bâtiment; `CLIENT_CORPORATE` reste dans son organisation.
- L’audit de réponse accepte désormais une source typée `PROJECT_FILE` ou `LIBRARY_PROCEDURE`, avec référence, version et empreinte obligatoires. Les FK ProjectFile existantes sont préservées et restent obligatoires pour ce type.
- La citation Bibliothèque ouvre une route authentifiée qui recalcule la source effective et ses droits avant affichage.
- Le chat public reste câblé exclusivement sur `PublicKnowledgeModule` et `PublicKnowledgeSearchService`.

## Preuves locales

- Migration additive `20261119010000_library_knowledge_source_authority`: chaîne complète 166/166 sur PostgreSQL 16 jetable; colonnes typées obligatoires; FK citation/chunk rendues optionnelles uniquement sous contrainte de type.
- Tests Knowledge ciblés: 27/27 PASS.
- Suite backend: 2 385 PASS, 2 ignorés; les sept écarts sont exclusivement les sous-processus interdits par le sandbox. Rejeu hors sandbox: credential process PASS, cinq extracteurs Office PASS; test PNG restant `NOT_VERIFIED` car `pdftoppm` n’est pas installé sur Windows.
- Build backend PASS; build portail client PASS, route `/knowledge/library-sources/[id]` incluse.
- Inventaire public statique: aucune importation de `KnowledgeModule` ou `LibraryKnowledgeRetrievalService` dans le chat public.

## Couverture fonctionnelle déterministe

| Scénario | Résultat |
| --- | --- |
| information présente uniquement dans le catalogue | PASS, source `LIBRARY_PROCEDURE` |
| portée globale / organisation / projet | PASS par priorité déterministe |
| citation ouvrable, version et SHA-256 | PASS côté contrats, autorisation serveur et build; navigateur authentifié production `NOT_VERIFIED` faute de session autorisée disponible |
| modification | PASS, version et empreinte changent; ancien résultat absent |
| retrait/inactivation | PASS, aucun résultat courant |
| projet hors périmètre / inter-tenant | PASS, refus avant lecture du catalogue |
| ClientUser sans identité client canonique | PASS, refus sans accès supplémentaire |
| assistant public | PASS, corpus séparé; catalogue non injecté |

## IA et coûts

Les preuves ci-dessus sont des preuves de récupération et de réponse déterministe simulée. Aucun fournisseur réel n’a été activé, aucune invocation Bedrock n’a été effectuée et aucune preuve de génération réelle n’est revendiquée.

## Livraison

- PR #157, HEAD testé `dbe7d7c9fb9ebfd2c9487d54c311b1ecbecb1ed7`, fusion `c91543efdf34c6429d1877a0b92f0a28567b5bb7`.
- CI PR et main : PASS; release `41360598223` SUCCESS.
- Inspection `41361880281` : `PASS/GO`, SHA actif exact, migration 166, services sains, backup/restore et quatre rollbacks vérifiés.
- Statut : `RETRIEVAL_AUTHORITY_DEPLOYED_AND_RECONCILED`; `REAL_PROVIDER_GENERATION_NOT_VERIFIED`.
- La preuve navigateur authentifiée de l’ouverture d’une citation reste une intervention humaine minimale; elle ne remet pas en cause la récupération déterministe déployée et ne doit pas être déclarée PASS sans session réelle.
