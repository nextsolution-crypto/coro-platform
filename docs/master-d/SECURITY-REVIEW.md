# Security review

## Frontières préservées

- ProjectFile reste l'autorité documentaire et de téléchargement.
- Isolation tenant, bâtiment, projet, Network et historique fail-closed.
- L'IA ne reçoit aucune Platform Authority et ne devient jamais autorité de commande.
- Aucune donnée documentaire ne part vers un fournisseur réel pendant QA.
- Les contenus récupérés sont des données non fiables : leurs instructions sont ignorées.

## Défauts confirmés de la branche historique

1. Autorité documentaire et approbation Knowledge parallèles.
2. Politique AI limitée aux rôles internes `SUPER_ADMIN/ADMIN/OPERATOR`, sans résolution canonique moderne.
3. Absence de preuve ClientUser, Network, historique et révocation actuelle.
4. Absence d'OCR gouverné.
5. Aucune décision approuvée autorisant AWS Bedrock avec données CORO.

## Tests obligatoires

Prompt injection dans document/question, exfiltration inter-tenant, identifiant direct, citation révoquée entre retrieval et rendu, document expiré/remplacé, source contradictoire, index corrompu, modèle indisponible, quota/timeout, fuite de storageKey, journalisation sensible, révocation de session et throttling.

## Décision Founder requise

Avant toute activation réelle : fournisseur et modèle exacts, budget, catégories de données admissibles, région/résidence attestée, politique de rétention et d'entraînement, journalisation, IAM, endpoint privé, conditions de désactivation et protocole d'incident. Sans décision, `AI_PROVIDER_REAL: DISABLED`.
