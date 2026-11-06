# SP-OPS-04B — Rapport sécurité webhook SMS

## Contrôles

| Contrôle | État |
|---|---|
| Secret webhook obligatoire et comparaison constante | IMPLÉMENTÉ |
| Validation avant accès aux données | IMPLÉMENTÉ |
| Corrélation fournisseur/canal/message exacte | IMPLÉMENTÉ |
| Corrélation précoce par tag UUID unique | IMPLÉMENTÉ |
| Payload incapable de sélectionner un tenant | IMPLÉMENTÉ |
| Ambiguïté refusée sans mutation | IMPLÉMENTÉ |
| Verrou transactionnel et revalidation sous verrou | IMPLÉMENTÉ |
| Déduplication persistante | IMPLÉMENTÉ |
| Transitions recalculées depuis l'historique | IMPLÉMENTÉ |
| Événement inconnu sans faux succès | IMPLÉMENTÉ |
| Journaux sans payload, téléphone ou contenu | IMPLÉMENTÉ |
| Réponses et STOP préservés | IMPLÉMENTÉ |

## Modèle de menace traité

- usurpation d'un événement sans secret;
- identifiant de message inventé ou absent;
- collision/ambiguïté entre deux livraisons;
- doublon ou rejeu;
- événement reçu dans le désordre;
- concurrence entre deux webhooks;
- événement tardif après annulation ou suppression;
- tentative de faire passer un événement inconnu pour une livraison réussie.

## Données conservées

Seuls le type normalisé, les horodatages, l'identifiant fournisseur déjà lié à
la livraison et des empreintes cryptographiques sont persistés. Le payload brut,
la destination et le contenu ne sont pas ajoutés à l'historique transactionnel.

## Restrictions maintenues

Ce lot ne modifie ni LIVE, ni PAUSED/BLOCK/STOP, ni les secrets, ni les
programmes Population. Il n'effectue aucun appel fournisseur.
