# Urgence persistante

`EmergencyStateStore` protège l’état par HMAC, écriture atomique, version monotone et priorité. Le processus enfant restaure `EMERGENCY_REAL`. Une sortie non gouvernée est refusée; la même transition avec `governedClear: true` est acceptée.

Aucun timer ne réinitialise l’urgence. Aucun système d’alarme réel n’est connecté. Résultat : PASS synthétique.
