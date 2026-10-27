# CORO WEB-AI-03D — Étude du fournisseur

## Décision proposée

Conserver une passerelle fournisseur indépendante. AWS Bedrock en régions canadiennes avec Amazon Nova Lite demeure le candidat préféré, mais `REAL_PROVIDER_ACTIVATION: NOT_AUTHORIZED`.

## Configuration préparée, non utilisée

L'environnement déclaré par le Founder utilise IAM Roles Anywhere, le rôle `COROAIProductionBedrockRole`, le profil `coro-ai-production`, `/etc/coro-ai/aws-config`, des sessions de 900 secondes et la région `ca-central-1`. Aucun fichier de `/etc/coro-ai`, certificat, clé privée ou jeton n'a été lu ou copié. Aucune invocation de modèle n'a été lancée.

Le backend de production Alpine ne peut pas présumer que le credential helper glibc de l'hôte fonctionne dans son conteneur. L'activation devra fournir une intégration musl compatible ou un composant d'identité isolé et revu. La clé privée ne doit jamais entrer dans l'image ou Git. Un service de credentials localhost générique n'est pas recommandé sans frontière stricte, car tout processus local pourrait tenter d'y accéder.

## Vérifications nécessaires avant activation

1. Confirmer dans le compte AWS l'identifiant exact `ca.amazon.nova-lite-v1:0`, son accessibilité depuis `ca-central-1` et le traitement canadien annoncé. La documentation publique actuelle doit être rapprochée de la configuration réelle; aucune hypothèse n'est acceptée.
2. Valider l'authentification temporaire depuis l'image Alpine finale, la rotation, l'expiration, la révocation et l'absence de clé persistante.
3. Valider quotas, délais, streaming, sorties mal formées, garde-fous, journalisation et coupe-circuit.
4. Exécuter une campagne contrôlée séparée, avec budget et autorisation explicites.

## Coût

Hypothèse de planification uniquement : quatre requêtes par conversation, 2 000 jetons d'entrée et 300 de sortie par requête.

| Conversations | Entrée | Sortie | Formule fournisseur |
|---:|---:|---:|---|
| 100 | 0,8 M | 0,12 M | `0,8 × tarif_entrée + 0,12 × tarif_sortie` |
| 1 000 | 8 M | 1,2 M | `8 × tarif_entrée + 1,2 × tarif_sortie` |
| 10 000 | 80 M | 12 M | `80 × tarif_entrée + 12 × tarif_sortie` |

Les tarifs exacts, taxes, transferts, journaux et coûts d'infrastructure sont `NOT_VERIFIED`; aucun prix n'est inventé. La recherche PostgreSQL locale n'entraîne pas de coût d'embedding fournisseur dans cette architecture.

## Sources officielles à revoir lors de l'activation

- [AWS Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)
- [Amazon Nova Lite model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-lite.html)
- [Geographic cross-Region inference](https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html)
- [IAM Roles Anywhere credential helper](https://docs.aws.amazon.com/rolesanywhere/latest/userguide/credential-helper.html)

## Anthropic historique

La cause du mode dégradé Anthropic demeure `NOT_VERIFIED` : configuration, modèle, endpoint, quota, délai et analyse de réponse sont des hypothèses. Aucun appel réel n'était autorisé; la nouvelle architecture ne dépend pas de cette intégration.
