# Canonical Knowledge architecture

## Autorité

`ProjectFile` et sa version constituent l'unique autorité documentaire. Knowledge est une projection dérivée, reconstructible et sans pouvoir d'approbation.

Chaque projection doit porter : `projectFileId`, organisation, projet/bâtiment, version, SHA-256, catégorie, confidentialité, date d'indexation, effectivité source, expiration, état de révocation/remplacement et provenance. Les pages, sections, chunks et ancres citent cette identité exacte.

## Invariants

1. Seul un ProjectFile `APPROVED`, effectif et non expiré peut être présenté comme courant.
2. `SUPERSEDED` et `REVOKED` sont retirés de la recherche courante; l'historique ne suit que l'autorisation historique ProjectFile.
3. Un index ne confère jamais un accès. L'autorisation ProjectFile est vérifiée avant la recherche et avant présentation.
4. Toute divergence de SHA-256, version, tenant ou statut rend la projection inéligible et déclenche une réconciliation.
5. Les projections peuvent être supprimées et reconstruites sans perdre la preuve canonique.
6. Aucun rôle seul, Platform Authority ou index ne crée de permission client.

## Modèles additifs proposés

- `ProjectFileKnowledgeProjection` : identité source, état, fraîcheur, empreinte et lockVersion.
- `ProjectFileKnowledgePage`, `Section`, `Chunk`, `CitationAnchor` : contenu dérivé et repères.
- `ProjectFileKnowledgeLexicalIndex` et `SemanticIndex` : index dérivés avec profil/version.
- `ProjectFileKnowledgeIngestion` : exécution idempotente, échec, reprise et audit.
- `CoroAiInteraction` et `CoroAiInteractionSource` : question, résultat, limitation, sources autorisées et provenance typée.

Ces modèles ne contiennent ni approbation documentaire ni téléchargement public.

## Gate externe

Le fournisseur réel demeure désactivé. L'adaptateur fake est autorisé pour QA. L'activation AWS Bedrock requiert une décision séparée sur budget, région/résidence, rétention, journalisation, classification admissible, IAM et connectivité privée.
