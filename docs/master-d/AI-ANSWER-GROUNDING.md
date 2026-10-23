# AI answer grounding

Statut : `IMPLEMENTED_UNPUBLISHED_WITH_FAKE_PROVIDER_ONLY`.

Le moteur historique impose une sortie structurée, refuse les affirmations sans source, rejette les identifiants/dates/nombres absents des preuves et sait exprimer information manquante et conflits. Ces mécanismes sont réutilisables après migration vers les citations ProjectFile.

## Contrat de réponse

- `DOCUMENTED_FACT`: affirmation soutenue par une ou plusieurs citations exactes.
- `OPERATIONAL_DATA`: valeur issue d'une autorité opérationnelle avec horodatage.
- `RECOMMENDATION`: conseil explicitement non exécutoire.
- `MISSING_INFORMATION`: preuve autorisée insuffisante.
- `UNCERTAINTY` ou `CONFLICT`: sources contradictoires ou fraîcheur indéterminée.

Chaque citation doit contenir document/version ProjectFile, page ou section, bâtiment pertinent et timestamp source. Une citation inventée ou devenue inéligible invalide la réponse entière.

Le fournisseur simulé est le seul mode accepté dans ce dossier. `CORO_AI_PROVIDER=bedrock` reste interdit tant que la décision fournisseur n'est pas approuvée.
