# Retrieval acceptance

Statut : `VALIDATED_E2E_LOCAL`.

La recherche portée n'utilise plus `KnowledgeDocument`. Elle part des projections ProjectFile et revalide, à chaque requête, le tenant, le bâtiment, la visibilité, l'affectation Network et le cycle de vie canonique.

## Décision de conception

- Préfiltrer par tenant, building/project et état canonique ProjectFile.
- Résoudre les permissions par les autorités existantes, jamais par rôle seul.
- Intersecter les résultats lexicaux/sémantiques avec les sources autorisées.
- Revalider chaque citation immédiatement avant réponse ou navigation.
- Retourner `UNKNOWN`/limitation si la fraîcheur ou l'autorité ne peut être prouvée.
- Masquer l'existence des ressources non autorisées.

## Matrice démontrée

CLIENT_CORPORATE autorisé, CLIENT_MANAGER sans bâtiment, autre tenant et source révoquée sont démontrés E2E. Les contrats couvrent l'utilisateur interne affecté, local/régional Network, identité inactive et portée bâtiment. Une source non autorisée est indistinguable d'une source absente.
