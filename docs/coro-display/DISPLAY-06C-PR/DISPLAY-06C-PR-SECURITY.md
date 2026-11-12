# DISPLAY-06C-PR — Sécurité

- Authentification appareil distincte de la session utilisateur.
- Secrets d’enrôlement et jetons à durée limitée, hachés ou vérifiés côté serveur selon leur nature.
- Autorisation tenant/site/appareil contrôlée côté serveur; aucun identifiant fourni par le client ne fait autorité seul.
- Manifestes privés validés avant activation; cache activé atomiquement après intégrité.
- CSP du Player restrictive; rendus privés sans script actif arbitraire.
- Audit runtime npm : **0 vulnérabilité**.
- Scan ciblé du diff : aucune clé privée, secret ou fichier de configuration sensible ajouté.

Réserves : la revue authentifiée manuelle n’est pas exécutée et les vulnérabilités de l’outillage de développement sont suivies séparément. Aucune prétention de sécurité absolue n’est formulée.
