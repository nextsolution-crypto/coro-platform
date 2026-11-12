# Matrice de panne

| Injection | Observé | Verdict |
|---|---|---|
| Gateway indisponible | cache vérifié restauré, heartbeat dégradé best-effort | PASS synthétique |
| PostgreSQL indisponible | Gateway échoue; Player conserve cache | PASS partiel |
| Réseau/DNS/TLS | clients refusent, fallback cache | PASS unitaire |
| Keystore indisponible | aucun adaptateur OS réel | NOT_VERIFIED |
| Cache corrompu | génération précédente essayée | PASS |
| Stockage saturé | non injecté physiquement | NOT_VERIFIED |
| Chromium arrêté/bloqué | politique watchdog sans action runtime | FAIL |
| Player arrêté | systemd statique seulement | NOT_VERIFIED |
| Redémarrage en urgence | état REAL restauré | PASS |
| État urgence corrompu | refus | PASS unitaire |
| Journal corrompu | refus HMAC | PASS |
| Réconciliation interrompue | événements pending conservés logiquement | PASS partiel |
| Horloge incorrecte | watchdog stale ajouté; manifest/revocations incomplets | FAIL partiel |

Chaque PASS est limité à l'injection réellement exécutée; aucune panne électrique ni coupure matérielle n'est incluse.
