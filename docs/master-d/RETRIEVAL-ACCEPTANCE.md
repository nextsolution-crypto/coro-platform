# Retrieval acceptance

Statut : `PARTIAL_SECURITY_REDESIGN_REQUIRED`.

La recherche historique applique un filtre tenant et des critères d'effectivité, mais repose sur `KnowledgeDocument` et un acteur interne `AdviserActor`. Elle ne démontre pas les autorisations ClientUser, Network, bâtiment, historique ProjectFile ni la révocation moderne.

## Décision de conception

- Préfiltrer par tenant, building/project et état canonique ProjectFile.
- Résoudre les permissions par les autorités existantes, jamais par rôle seul.
- Intersecter les résultats lexicaux/sémantiques avec les sources autorisées.
- Revalider chaque citation immédiatement avant réponse ou navigation.
- Retourner `UNKNOWN`/limitation si la fraîcheur ou l'autorité ne peut être prouvée.
- Masquer l'existence des ressources non autorisées.

## Matrice requise

Client local, régional, corporatif, opérateur explicitement délégué, utilisateur non affecté, identité révoquée et tenant B; lecture courante, historique, accès direct, export et citation. Aucune de ces lignes n'est encore validée E2E sur la baseline actuelle.
