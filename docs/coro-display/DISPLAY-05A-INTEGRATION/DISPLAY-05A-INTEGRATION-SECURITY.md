# DISPLAY-05A-INTEGRATION — Sécurité

## Autorisation et données privées

Les contrôles tenant/bâtiment/permission s'exécutent dans les services. Les variantes privées sont récupérées après contrôle et vérification SHA-256; aucune clé de stockage ou URL publique permanente n'est projetée. Le lecteur opérationnel refuse les versions suspendues/révoquées; la gestion historique reste réservée aux droits d'audit.

## Dépendances

`axios@1.20.0` résout `follow-redirects@1.16.3` par override verrouillé. La version vulnérable `1.16.1` n'est plus installée.

- Audit production backend : 0 vulnérabilité.
- Audit production frontend : 0 vulnérabilité.
- Audit complet backend : 30 constats dans l'outillage de développement.
- Audit complet frontend : 8 constats modérés dans l'outillage ESLint/TypeScript.

Les corrections automatiques proposées exigent des versions majeures cassantes; aucun `audit fix --force` n'a été exécuté.

## Contrôle du diff

Aucune migration nouvelle, dépendance inutile, configuration de production, document client, secret ou fichier temporaire. Le scan a signalé seulement des mots `password`/`access_token` dans du code de test et des signatures de méthodes, sans valeur secrète. `git diff --check` : PASS.
