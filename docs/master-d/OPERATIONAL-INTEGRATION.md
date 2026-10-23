# Operational integration

## Principe

Knowledge peut contextualiser ProjectFile, Incident, Ops, Sentinelle, Network, ExerciseReport et CorrectiveAction. CORO AI peut résumer, comparer, signaler les lacunes et recommander. Il ne peut ni déclencher, ni affecter, ni acquitter, ni fermer une opération critique.

Toute action proposée passe par l'interface canonique, une confirmation humaine explicite, l'autorisation existante et l'audit transactionnel du domaine concerné.

## Dégradé

- Les documents privés et parcours d'urgence restent accessibles sans IA.
- La recherche documentaire déterministe demeure utilisable si le modèle est indisponible.
- Une panne d'index affiche un état indisponible; elle ne retourne pas de contenu périmé comme courant.
- Une recommandation IA n'est jamais mise en file pour exécution automatique.

## État

Les cinq contextes `INCIDENT`, `SENTINELLE`, `NETWORK`, `EXERCISE_REPORT` et `CORRECTIVE_ACTION` sont résolus côté serveur en lecture seule avec tenant/bâtiment. Les contrats sont PASS et le contexte Network est PASS E2E. Aucun endpoint de mutation IA n'existe.
