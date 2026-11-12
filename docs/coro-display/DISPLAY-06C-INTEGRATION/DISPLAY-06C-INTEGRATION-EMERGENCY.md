# Urgence

L’état d’urgence est écrit atomiquement avec HMAC, version et priorité. Le processus redémarré restaure `EMERGENCY_REAL`. Une baisse de priorité non gouvernée est refusée; `governedClear` autorise explicitement la sortie.

Aucun timer de retour automatique et aucun panneau d’alarme réel.
