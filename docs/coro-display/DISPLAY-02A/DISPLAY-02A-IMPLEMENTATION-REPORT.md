# DISPLAY-02A — Rapport d’implémentation

## Fichiers produit

- `coro-backend/prisma/schema.prisma`
- `coro-backend/prisma/migrations/20261129010000_coro_display_spatial_foundations/migration.sql`
- `coro-backend/src/spatial/**`
- `coro-backend/src/app.module.ts`

## Fichiers de test

- `src/spatial/*.spec.ts`
- `src/spatial/dto/spatial.dto.spec.ts`
- `test/spatial-foundations.postgres-spec.ts`

## Choix d’architecture

1. Modèle spatial commun, non encapsulé dans Display.
2. `DisplayLocation` consomme étage/zone canoniques.
3. Permissions explicites sans héritage de rôle.
4. Autorisation relue en base à chaque requête.
5. Verrou consultatif par bâtiment et `lockVersion` par ressource.
6. Audit transactionnel réutilisant `AdminAuditService`.
7. Archivage, jamais suppression physique via API.
8. Aucune conversion automatique de `Building.floors`.

## Exclusions respectées

Aucun Player, Manager complet, Controller, SSE, long-poll, appareil, playlist, publicité, publication de plan, commande d’urgence, intégration Incident active, PAI ou mode substitutif.

## Hors ligne — invariants réservés

Le futur Player devra conserver seulement un plan approuvé et intègre, basculer vers le plan permanent hors ligne, ne jamais poursuivre la publicité hors connexion, maintenir une urgence déjà activée et refuser tout cache altéré. Aucun de ces comportements n’est prétendu implémenté ici.

## État du dépôt

Le worktree principal, déjà modifié avant DISPLAY-02A, n’a pas été touché. Le worktree DISPLAY-01 n’a pas été modifié. Aucun push, PR, fusion ou déploiement n’a été effectué.
