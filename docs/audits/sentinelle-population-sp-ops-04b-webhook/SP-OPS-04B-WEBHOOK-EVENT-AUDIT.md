# SP-OPS-04B — Audit des événements SMS Brevo

## Périmètre

Audit ciblé du webhook SMS de Sentinelle Population. Aucun appel fournisseur,
aucune communication et aucune modification de production n'ont été effectués.

## Sources fournisseur

- Brevo, *Transactional webhooks* :
  https://developers.brevo.com/docs/transactional-webhooks
- Brevo, *Transactional SMS endpoints* :
  https://developers.brevo.com/docs/transactional-sms-endpoints
- Brevo, *Get all SMS activity* :
  https://developers.brevo.com/reference/get-sms-events
- Brevo, *Secured webhooks* :
  https://developers.brevo.com/docs/secured-webhooks

Les contrats documentent notamment `Sent`, `Accepted`, `Delivered`, `Replied`,
`Soft bounce`, `Hard bounce`, `Subscribe`, `Unsubscribe`, `Skip`, `Blacklisted`
et `Rejected`. La réponse de l'envoi transactionnel contient le `messageId`
utilisé ensuite pour la corrélation.

## Constat avant correction

- Le contrôleur authentifiait déjà la requête avant le service.
- Le service vérifiait de nouveau le secret Bearer avec comparaison constante.
- Les réponses SMS, STOP, abonnement et désabonnement étaient persistés et
  dédupliqués.
- Les événements transactionnels de livraison n'étaient pas projetés dans
  `PopulationAlertDelivery`; ils étaient acquittés comme `UNSUPPORTED`.
- Le modèle de données possédait déjà un historique de fournisseur
  (`PopulationDeliveryProviderEvent`) et une contrainte d'unicité sur
  l'empreinte d'événement.

## Autorité de corrélation

CORO persiste le `messageId` retourné par l'API d'envoi Brevo dans
`providerMessageId`. Il transmet aussi l'identifiant immuable de la livraison
comme `tag` SMS afin de couvrir un webhook qui arriverait avant la persistance
du `messageId`. Le webhook est corrélé uniquement sur :

1. canal `SMS`;
2. fournisseur `BREVO`;
3. égalité exacte du `providerMessageId`; ou
4. tag UUID correspondant à l'`idempotencyKey` unique de la livraison.

Le payload ne choisit jamais l'organisation. Une correspondance absente ou
ambiguë ne modifie aucune livraison. L'organisation est héritée de la livraison
CORO déjà autorisée et persistée.

## Correction

- Parsing distinct des événements transactionnels et des réponses entrantes.
- Validation stricte du type, de l'identifiant et de l'horodatage.
- Historique transactionnel avant projection.
- Verrou PostgreSQL par livraison avant relecture, insertion et projection.
- Reprise sûre de la course où le webhook gagne le retour de l'appel fournisseur.
- Déduplication par empreinte unique.
- Projection recalculée depuis l'historique complet afin de tolérer le désordre.
- `DELIVERED` terminal et non régressif; il signifie livraison technique, pas
  lecture humaine.
- Échecs permanents séparés des résultats temporaires.
- Livraisons `CANCELLED` ou `SUPPRESSED` historisées sans être réactivées.
- Événements inconnus journalisés sans payload, destination ni donnée personnelle.

## Limites intentionnelles

- Aucun accusé de lecture humaine n'est inféré.
- Aucune livraison inconnue n'est créée depuis un webhook.
- Aucun appel de vérification vers Brevo n'est réalisé dans ce lot.
- Les réponses et désabonnements conservent leur chemin existant.
