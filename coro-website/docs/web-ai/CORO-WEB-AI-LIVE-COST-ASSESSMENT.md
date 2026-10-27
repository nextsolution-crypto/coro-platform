# CORO Web AI — évaluation de coût

Date de référence : 2026-10-27

Devise des tarifs AWS : USD

## Modèle de coût

Le coût d'inférence est :

`(jetons entrée / 1 000 000 × tarif entrée) + (jetons sortie / 1 000 000 × tarif sortie)`.

AWS indique que le profil géographique est facturé au tarif de la région source sans supplément de routage. La page publique de tarification est dynamique et les montants Nova Lite propres à la source Canada n'ont pas pu être extraits de façon suffisamment fiable pendant cet audit. Les montants unitaires demeurent donc `NOT_VERIFIED` jusqu'à une capture datée de la console ou de l'API Pricing avant autorisation.

Source : [Amazon Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/).

## Enveloppes de consommation

Hypothèse de capacité CORO, indépendante du tarif : une conversation moyenne comporte quatre appels, chacun borné à 6 000 jetons d'entrée et 800 de sortie.

| Conversations | Appels | Entrée maximale | Sortie maximale |
| ------------: | -----: | --------------: | --------------: |
|           100 |    400 |           2,4 M |          0,32 M |
|         1 000 |  4 000 |            24 M |           3,2 M |
|        10 000 | 40 000 |           240 M |            32 M |

Ces plafonds sont conservateurs; la limite actuelle de contexte (quatre sources, 4 800 caractères chacune) devrait produire moins de jetons. Le coût final doit être recalculé avec les tarifs Canada vérifiés et les métriques réelles `inputTokens`/`outputTokens`.

## Première campagne proposée

- maximum 100 invocations;
- maximum 7 jours;
- 6 000 jetons d'entrée estimés par invocation;
- 800 jetons de sortie maximum;
- aucun streaming, batch, agent, knowledge base ou outil payant additionnel;
- budget autorisé proposé : **25 CAD maximum**, à confirmer par le Founder;
- alerte AWS à 10 CAD et arrêt applicatif à 20 CAD de consommation estimée;
- AWS Budgets est un signal retardé et ne constitue pas un coupe-circuit;
- le compteur applicatif est l'autorité d'arrêt immédiat.

## Mesures avant ouverture publique

- métriques par requête : jetons, latence, statut, modèle, région source, sans contenu;
- agrégats quotidiens et coût estimé;
- plafond dur de requêtes par campagne;
- rate limit par IP/session et plafond global;
- alerte sur écart entre métriques CORO et facturation AWS;
- révision des tarifs et quotas avant chaque campagne.

## Statut

Structure et plafond de campagne : READY. Tarifs Canada vérifiés et coût monétaire des scénarios : NOT_VERIFIED.
