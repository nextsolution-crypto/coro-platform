# DISPLAY-06A — Ordonnanceur

Le cycle normal est déterministe : plan 40 s, communication approuvée 10 s, consigne approuvée 10 s. Une horloge injectée rend les frontières testables et permet de recalculer la position après suspension ou redémarrage sans dépendre d'un `setInterval` non supervisé.

Si le contenu secondaire est absent, expiré, révoqué, non approuvé ou hors portée, le plan occupe son créneau. Les modes permanent et urgence affichent exclusivement le plan.
