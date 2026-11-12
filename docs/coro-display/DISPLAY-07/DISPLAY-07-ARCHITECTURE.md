# Architecture

Parcours réalisé : API authentifiée → autorité Display par organisation/bâtiment → incident CORO actif si réel → ciblage spatial → document publié applicable → transaction événement/commande/livraisons/outbox/journal Incident → Gateway M2M → vérification Player → état local intègre → accusés → supervision.

Les responsabilités sont séparées : `DisplayOperationalEvent` conserve la provenance; `DisplayOperationalCommand` la décision signée; `DisplayCommandDelivery` l’état par appareil; `DisplayCommandOutbox` la publication durable; `DisplayOperationalEscalation` les échecs actionnables.
