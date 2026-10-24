# CP-004 — Périmètre des agrégations Intelligence

## Défaut reproduit

`GET /client-portal/intelligence/overview` transmettait uniquement
`organizationId`. Les bâtiments, scores, compteurs et recommandations étaient
donc agrégés sur toute l'organisation, y compris pour un `CLIENT_MANAGER`
limité à un client et à quelques bâtiments.

## Règle appliquée avant agrégation

- `CLIENT_MANAGER`: organisation + client + liste de bâtiments affectés;
- `CLIENT_CORPORATE`: organisation expressément autorisée;
- rôle inconnu: refus avant toute lecture;
- aucune donnée d'une autre organisation.

Le filtre est appliqué dans la requête serveur qui sélectionne les bâtiments,
avant de calculer scores, statuts, recommandations et compteurs. Un bâtiment
hors périmètre ne peut donc influencer ni une ligne détaillée ni un total.

## Preuves

- test unitaire de la requête exacte et du refus fail-closed;
- matrice PostgreSQL synthétique: deux clients de la même organisation et une
  seconde organisation;
- vue manager limitée à son bâtiment;
- vue corporate conservant les deux bâtiments de son organisation;
- absence du bâtiment de l'autre organisation dans tous les résultats.
