# DISPLAY-06B-REVIEW — Kiosque et CSP

La CSP théorique fixe `default-src 'none'`, scripts/styles/connexions locaux, et interdit objets, cadres, formulaires, base externe et ancêtres. `unsafe-eval` est absent.

Correction : les flags dangereux sont comparés par nom, donc `--remote-debugging-port=9222` et autres formes avec valeur sont refusés. Une configuration complète refuse origine distante, bind public, DevTools, téléchargements et extensions; la sandbox reste obligatoire.

Le shell Chromium, les en-têtes réellement émis, permissions OS, mises à jour et navigation runtime sont **NOT_IMPLEMENTED/NOT_VERIFIED**. Aucun serveur public n'a été démarré.
