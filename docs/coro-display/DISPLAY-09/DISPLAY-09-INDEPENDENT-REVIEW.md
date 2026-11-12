# Revue indépendante

Revue exécutée dans le worktree isolé `coro-display-09-review` à partir du commit de développement `f2debc8b507cf0d2ebaf379f8afd806fc33f9600`.

Constats corrigés :

- la migration référençait l'identité composite de `DisplayLocation` sans créer l'index unique correspondant; l'index est désormais créé avant les clés étrangères;
- la clé publique WebCrypto était seulement validée par sa forme; elle est désormais importée cryptographiquement par Node, limitée à EC P-256 et refusée si elle contient une composante privée ou des coordonnées invalides;
- un test négatif couvre une clé P-256 structurellement plausible mais cryptographiquement invalide.

Preuves après correction : build Nest PASS, ESLint ciblé PASS, suite `display-web.service.spec.ts` 5/5 PASS, PostgreSQL 16 depuis zéro 187/187 PASS et seconde passe sans migration en attente.

Risque résiduel assumé : le jeton navigateur reste copiable et le stockage Web ne constitue pas une identité matérielle. Le profil demeure donc strictement `WEB_VIEW_ONLY`; `WEB_MANAGED_KIOSK` et `WEB_EMERGENCY_ELIGIBLE` restent désactivés et exigent une preuve de possession par requête et une validation physique distincte.
