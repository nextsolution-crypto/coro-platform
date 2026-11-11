# DISPLAY-06B-INTEGRATION — Kiosque et CSP

La politique interdit sandbox désactivée, Web Security désactivée, certificats ignorés, remote debugging, proxy, extensions, DevTools, téléchargements, origine distante et bind public, y compris les formes `--flag=value`.

La CSP théorique part de `default-src 'none'` et n'autorise pas `unsafe-eval`. Aucun shell Chromium ni en-tête navigateur réel n'existe : application effective **NOT_VERIFIED**.
