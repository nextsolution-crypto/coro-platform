# DISPLAY-06A — Architecture

## Décision

Une PWA locale durcie exécutée par Chromium en mode kiosque réutilise TypeScript, réduit la mémoire et la surface de maintenance, et permet un cache local contrôlé. Electron ajouterait un runtime et une chaîne de mises à jour sans bénéfice démontré à ce stade; une application native augmenterait le coût et fragmenterait la pile.

## Composants

- `player-contracts.ts` : contrats d'appareil, manifeste, contenu et journal.
- `manifest-validator.ts` : canonicalisation, Ed25519, portée, temps, séquence et SHA-256.
- `player-cache.ts` : protocole stage/commit/discard sans suppression préalable du plan valide.
- `offline-policy.ts` : décision explicite en ligne dégradée.
- `player-scheduler.ts` : cycle monotone et priorités gouvernées.
- `player-journal.ts` : événements locaux minimaux et rétention bornée.

Le Manager demeure l'autorité de publication. Le Player ne possède aucune méthode de mutation documentaire ou de gouvernance.
