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

Le fournisseur simulé reste le seul mode exécuté dans cette phase. L'adaptateur
Bedrock est préparé pour `ca.amazon.nova-lite-v1:0` dans `ca-central-1`, avec le
profil Roles Anywhere `coro-ai-production` et des sessions de 900 secondes.
L'activation exige les deux valeurs explicites `CORO_AI_PROVIDER=bedrock` et
`CORO_AI_BEDROCK_INVOCATION_ENABLED=true`. Aucune invocation réelle n'a été
effectuée pendant l'acceptation de cette branche.
