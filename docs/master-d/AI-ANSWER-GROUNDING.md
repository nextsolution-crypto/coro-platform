# AI answer grounding

Statut : `VALIDATED_E2E_LOCAL_SIMULATED_PROVIDER_ONLY`.

Le moteur déterministe répond uniquement depuis les extraits ProjectFile autorisés, sélectionne la phrase pertinente, cite la version et son SHA-256, signale les conflits et s'abstient sous le seuil de preuve. Les questions/réponses brutes ne sont pas conservées.

## Contrat de réponse

- `DOCUMENTED_FACT`: affirmation soutenue par une ou plusieurs citations exactes.
- `OPERATIONAL_DATA`: valeur issue d'une autorité opérationnelle avec horodatage.
- `RECOMMENDATION`: conseil explicitement non exécutoire.
- `MISSING_INFORMATION`: preuve autorisée insuffisante.
- `UNCERTAINTY` ou `CONFLICT`: sources contradictoires ou fraîcheur indéterminée.

Chaque citation doit contenir document/version ProjectFile, page ou section, bâtiment pertinent et timestamp source. Une citation inventée ou devenue inéligible invalide la réponse entière.

Le fournisseur simulé est le seul mode accepté dans ce dossier. `CORO_AI_PROVIDER=bedrock` reste interdit tant que la décision fournisseur n'est pas approuvée.
