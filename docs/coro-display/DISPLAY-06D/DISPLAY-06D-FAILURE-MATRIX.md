# Matrice de pannes

| Injection | Observé | Verdict |
|---|---|---|
| Gateway indisponible | cache vérifié restauré, réseau dégradé journalisé | PASS |
| Chromium arrêté/bloqué | décision restart avec backoff, circuit borné | PASS logique |
| Cache altéré | refus, génération précédente tentée | PASS |
| État urgence altéré | erreur explicite, aucune remise à zéro | PASS |
| Journal altéré | HMAC refuse la lecture | PASS |
| Version révoquée localement | restauration refusée | PASS |
| TLS/DNS/horloge prolongée | non exécuté intégralement | NOT_VERIFIED |
| Panne électrique réelle/stockage saturé | non exécuté physiquement | NOT_VERIFIED |
