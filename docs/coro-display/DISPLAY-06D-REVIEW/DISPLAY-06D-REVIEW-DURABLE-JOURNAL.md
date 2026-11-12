# Journal local durable

## Constats

Le journal est séquencé, chaîné par SHA-256, protégé par HMAC, écrit atomiquement, borné à 5 000 événements et acquitté idempotemment. L'altération sans clé est détectée.

## Tests

Append, chaîne, pending, double acknowledge et modification d'entrée: PASS. Les événements E2E produits possèdent identifiants et séquences synthétiques.

## Limites

Le secret HMAC vient de l'environnement; aucun ancrage distant, compteur matériel ou signature de périphérique n'empêche un attaquant contrôlant stockage et secret de réécrire toute la chaîne. Saturation disque et écriture physiquement interrompue: NOT_VERIFIED. Le journal est authentifié localement, pas inviolable.
