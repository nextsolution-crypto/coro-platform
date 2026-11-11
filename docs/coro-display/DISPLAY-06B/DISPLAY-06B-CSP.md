# DISPLAY-06B — CSP

La CSP part de `default-src 'none'` et limite scripts, styles, images, médias, polices et connexions à `self`/blob nécessaires. Objets, frames, formulaires et base URI sont interdits; aucun `unsafe-eval`.

Son application HTTP réelle et les rapports de violation restent à tester avec le shell.
