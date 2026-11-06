# SP-OPS-04B — Matrice Brevo → CORO

| Événement Brevo normalisé | Historique CORO | Projection de livraison | Terminal |
|---|---|---|---|
| Accepted | ACCEPTED | SENT | Non |
| Sent | SENT | SENT | Non |
| Delivered | DELIVERED | DELIVERED | Oui |
| Soft bounce | SOFT_BOUNCE | SENT + résultat non confirmé | Non |
| Hard bounce | HARD_BOUNCE | FAILED | Oui |
| Blacklisted / Blocklisted | BLOCKED | FAILED | Oui |
| Rejected | REJECTED | FAILED | Oui |
| Skip / Skipped | SKIPPED | FAILED | Oui |
| Replied | chemin entrant existant | aucune projection de livraison | Non applicable |
| Subscribe | chemin entrant existant | aucune projection de livraison | Non applicable |
| Unsubscribe / STOP | chemin entrant existant + suppression | aucune projection de livraison | Non applicable |
| Inconnu | aucune mutation | journal technique assaini | Non applicable |

## Règles de précédence

1. `DELIVERED` prévaut sur tout événement antérieur ou reçu ultérieurement.
2. Sans `DELIVERED`, un échec permanent prévaut.
3. Sans résultat terminal, un échec temporaire conserve `SENT` et marque le
   résultat comme non confirmé.
4. `Accepted` et `Sent` établissent seulement la remise technique au transport.
5. Une livraison annulée ou supprimée n'est jamais rouverte par un événement tardif.

La projection utilise l'ensemble de l'historique persistant plutôt que l'ordre
d'arrivée HTTP.
