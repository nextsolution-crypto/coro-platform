# Durcissement kiosque

Arguments : kiosque, extensions/synchronisation/traduction/background networking/component updates désactivés, aucun premier lancement ni debug distant. `--no-sandbox`, contournement TLS/CSP, proxy et extensions chargées sont refusés, y compris sous forme `--flag=value`.

L’interception bloque les requêtes hors de l’origine loopback; CSP interdit objets, frames, formulaires et navigation externe. Chromium est lancé sans privilège administrateur dans la cible. La résistance physique aux raccourcis clavier reste `NOT_VERIFIED`.
