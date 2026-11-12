# CSP effective

## Constats

La réponse loopback envoie `default-src 'none'`, scripts/styles/images/connect self, frames/objets/formulaires/base interdits et `frame-ancestors 'none'`. Aucun `unsafe-inline` ou `unsafe-eval`.

## Tests et limites

Les en-têtes réels et le style externe local sont chargés dans Chromium. Une balise script inline ne s’exécute pas; un script et une image `attacker.invalid` échouent avec la raison Chromium `csp` et aucune réponse externe. `navigate-to` n’est pas uniformément implémenté par Chromium; un intercepteur de navigation runtime reste recommandé.
