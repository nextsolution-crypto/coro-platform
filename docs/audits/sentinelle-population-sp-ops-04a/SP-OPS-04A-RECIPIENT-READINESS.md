# SP-OPS-04A — Préparation du destinataire

## Règle

La campagne SP-OPS-04B accepte exactement un destinataire logique : le propriétaire de CORO, avec une adresse courriel personnelle vérifiée et un mobile canadien vérifié. Les coordonnées brutes restent hors Git, hors rapports et hors ligne de commande persistante.

## Données hors Git à préparer

- adresse courriel vérifiée;
- numéro E.164 vérifié;
- consentement daté au SMS et au courriel uniques;
- `organizationId` et `programId` exacts;
- SHA-256 canonique de chaque destination;
- affichage masqué pour la double approbation.

## Statut

| Contrôle | Statut |
|---|---|
| limitation à un destinataire logique | VÉRIFIÉ TECHNIQUEMENT |
| maximum un SMS + un courriel | VÉRIFIÉ TECHNIQUEMENT |
| allowlist par empreinte | VÉRIFIÉ TECHNIQUEMENT |
| coordonnées enregistrées hors Git | NOT_VERIFIED |
| consentement daté | NOT_VERIFIED |
| identité du programme et du tenant confirmée | NOT_VERIFIED |

**DESTINATAIRE : NOT_READY.** Aucune coordonnée n'a été demandée dans la conversation et aucune valeur réelle n'a été créée ou enregistrée.

## Préparation sûre future

La saisie doit être effectuée directement sur le serveur dans un fichier root-only ou dans l'autorité de secrets approuvée. Les rapports ne conservent que les destinations masquées et leurs empreintes. L'adresse et le téléphone ne doivent pas être fournis dans GitHub, une commande visible ou la conversation.
