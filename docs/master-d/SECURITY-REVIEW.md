# Security review

## Frontières préservées

- ProjectFile reste l'autorité documentaire et de téléchargement.
- Isolation tenant, bâtiment, projet, Network et historique fail-closed.
- L'IA ne reçoit aucune Platform Authority et ne devient jamais autorité de commande.
- Aucune donnée documentaire ne part vers un fournisseur réel pendant QA.
- Les contenus récupérés sont des données non fiables : leurs instructions sont ignorées.

## Défauts historiques éliminés dans le candidat

1. L'autorité Knowledge parallèle n'a pas été portée.
2. Les accès sont résolus par les autorités projet, ClientUser et Network actuelles, sans rôle seul.
3. Les sources expirées, remplacées et révoquées sont filtrées au moment de chaque retrieval.
4. Les questions/réponses ne sont pas journalisées en clair; empreintes et citations suffisent à la provenance.
5. L'échec du fournisseur simulé renvoie `PROVIDER_FAILURE` sans réponse ni citation.

## Tests exécutés

Prompt injection, tenant B, mauvais bâtiment/portée vide, citation révoquée, absence de preuve, contradiction, intégrité SHA, fournisseur indisponible, absence de `storageKey`, MFA local et throttling non contourné : PASS. OCR local demeure non implémenté et échoue fermé.

## Décision Founder requise

Avant toute activation réelle : fournisseur et modèle exacts, budget, catégories de données admissibles, région/résidence attestée, politique de rétention et d'entraînement, journalisation, IAM, endpoint privé, conditions de désactivation et protocole d'incident. Sans décision, `AI_PROVIDER_REAL: DISABLED`.
