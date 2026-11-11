# DISPLAY-06A-REVIEW — PWA et kiosque

Le choix PWA/Chromium est raisonnable mais le durcissement n'est pas livré. DISPLAY-06B doit définir origine dédiée, CSP effective, Service Worker limité, IndexedDB privé, cache sans secrets, stockage OS, mises à jour signées, redémarrage supervisé, permissions minimales et isolation du processus.

Le navigateur ne doit accepter ni script tiers, ni navigation arbitraire, ni DevTools utilisateur, ni téléchargement public du plan. Un administrateur OS complet reste hors du modèle de protection du noyau.
