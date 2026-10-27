# CORO WEB-AI-02 — Runbook d'activation SQL

Ce runbook prépare une activation future. Il n'autorise pas l'activation publique.

## Séparation des identités

- L'identité de migration conserve l'application contrôlée des migrations Prisma.
- L'identité backend générale conserve les fonctions privées existantes.
- L'identité Public Knowledge reçoit uniquement `CONNECT`, `USAGE` sur le schéma et `SELECT` sur `PublicKnowledgeSource`, `PublicKnowledgeChunk` et `PublicKnowledgeCapability`.
- L'identité publique ne reçoit aucun droit sur `Organization`, `Building`, `ProjectFile`, `ClientUser` ou les autres tables privées, ni aucun droit d'écriture.
- La synchronisation reste une opération interne gouvernée utilisant l'autorité backend; elle n'est pas exposée par l'API publique.

## Configuration

1. Créer le rôle par le mécanisme d'administration PostgreSQL approuvé, avec un secret généré et stocké dans le gestionnaire de secrets.
2. Accorder les privilèges minimaux ci-dessus et rien d'autre.
3. Construire `PUBLIC_KNOWLEDGE_DATABASE_URL` sans journaliser sa valeur.
4. Vérifier avec ce rôle : lecture publique réussie, `ProjectFile` refusé et écriture publique refusée.
5. Garder `WEB_AI_PUBLIC_KNOWLEDGE_ENABLED=false` jusqu'à une décision d'activation distincte.
6. Lors de l'activation autorisée seulement, renseigner l'URL dédiée avant de passer le flag à `true`. L'application échoue fermée si l'URL dédiée manque.

## Révocation et rollback

- Remettre le flag à `false` coupe l'API avant toute recherche et empêche l'initialisation de la connexion dédiée au prochain démarrage.
- Révoquer les sessions du rôle, faire une rotation de son secret, puis retirer ses privilèges si nécessaire.
- Ne pas accorder l'identité backend générale à l'API publique comme solution de repli.
- La migration additive peut rester en place lors d'un rollback applicatif; elle ne modifie aucune table existante.

## Preuve locale

Le test PostgreSQL 16 crée une identité jetable équivalente. Il démontre : lecture des sources publiques, refus de `ProjectFile`, refus d'écriture et absence de relation publique vers une table privée.
