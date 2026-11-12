# Matrice de panne

| Panne | Comportement constaté | État |
|---|---|---|
| PostgreSQL/Gateway indisponible | appels refusés; dernier cache théorique conservé | PARTIAL |
| Réseau/DNS/TLS invalide | protocole ne commit pas un rendu incomplet | PASS unitaire |
| Horloge incorrecte | preuve/manifeste refusés selon fenêtre | PASS unitaire |
| Manifeste/rendu corrompu | signature/SHA refusés | PASS |
| Appareil/publication/clé révoqué | serveur/validateur refusent | PASS ciblé |
| Cache corrompu | génération précédente tentée, jamais non authentifiée | PASS unitaire |
| Stockage saturé | erreur attendue, matériel non essayé | NOT_VERIFIED |
| Crash Chromium/redémarrage | watchdog logique seulement | NOT_IMPLEMENTED OS |
| Urgence active | HMAC/version empêchent effacement silencieux | PASS unitaire |
| Télémétrie indisponible | ne prouve rien physiquement | DOCUMENTED |

Le comportement réel connecté reste non vérifiable car le binaire n’orchestrait pas ces composants.
