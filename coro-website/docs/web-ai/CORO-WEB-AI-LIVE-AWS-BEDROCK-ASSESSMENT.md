# CORO Web AI — évaluation AWS Bedrock

Date : 2026-10-27

Appel réel effectué : NON

## Modèle proposé

`ca.amazon.nova-lite-v1:0` depuis `ca-central-1` demeure le candidat initial.

La documentation AWS actuelle confirme :

- le modèle Nova Lite est actif, accepte le texte et l'API Converse;
- le client-side tool calling est pris en charge;
- les structured outputs natifs ne sont pas pris en charge;
- le profil géographique canadien est bien `ca.amazon.nova-lite-v1:0`;
- depuis `ca-central-1`, les destinations documentées sont `ca-central-1` et `ca-west-1`;
- le routage géographique est facturé au tarif de la région source, sans supplément de routage.

Sources officielles :

- [Nova Lite — modèle, API et disponibilité](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-lite.html)
- [Disponibilité régionale des modèles](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html)
- [Inférence géographique interrégionale](https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html)
- [Profils d'inférence pris en charge](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)
- [Protection des données Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html)

## Aptitude fonctionnelle

Nova Lite convient à une première campagne documentaire publique : coût faible, fenêtre de contexte de 300 000 jetons, sortie maximale de 10 000 jetons, Converse et tool calling. CORO conserve néanmoins ses limites plus strictes : quatre sources, 4 800 caractères de contexte par source, 800 jetons de sortie et température zéro.

Le modèle n'offrant pas de structured outputs natifs, le contrat outillé et la validation serveur sont obligatoires. Toute sortie hors schéma, citation inconnue, réponse sans citation, contradiction ou information insuffisante doit échouer en abstention.

## Résidence et flux

Le profil CA documenté limite le traitement à Montréal et Calgary. Les prompts et résultats peuvent transiter et, selon les mécanismes de détection d'abus applicables, être conservés dans la région de destination. AWS recommande de vérifier les destinations par `GetInferenceProfile` depuis chaque région source et de ne pas se fier au préfixe seul.

Avant une campagne réelle, il faut conserver une preuve datée de :

- `GetInferenceProfile` depuis `ca-central-1`;
- l'état actif du profil dans le compte CORO;
- les quotas `Converse`/cross-region disponibles;
- les règles de rétention applicables à Nova Lite au moment du test;
- CloudTrail dans la région source et l'identification de la région d'inférence.

## État du compte CORO

La configuration Roles Anywhere et l'authentification du rôle `COROAIProductionBedrockRole` ont été rapportées par le Founder. Elles n'ont pas été reverifiées dans cette phase. Aucun appel de contrôle AWS ni invocation n'a été exécuté.

| Contrôle                            | Statut                                   |
| ----------------------------------- | ---------------------------------------- |
| Modèle/profil documenté par AWS     | PASS                                     |
| Compatibilité Converse/tool calling | PASS                                     |
| Structured outputs natifs           | NON DISPONIBLE — validation CORO requise |
| Disponibilité dans le compte CORO   | NOT_VERIFIED                             |
| Quotas du compte                    | NOT_VERIFIED                             |
| Destinations effectives du profil   | NOT_VERIFIED dans le compte              |
| Invocation depuis le conteneur      | NOT_VERIFIED                             |
| Qualité documentaire réelle         | NOT_VERIFIED                             |

## Politique IAM minimale proposée

Autoriser uniquement `bedrock:InvokeModel` sur :

- le profil d'inférence canadien exact;
- Nova Lite dans les deux régions de destination requises;
- avec condition `bedrock:InferenceProfileArn` lorsque supportée.

Ne pas accorder `bedrock:*`, la création de modèles, agents, knowledge bases, batch jobs, guardrails ou profils applicatifs. Les actions de contrôle nécessaires à une vérification ponctuelle doivent être confiées à une identité d'inspection séparée, pas au rôle runtime.
