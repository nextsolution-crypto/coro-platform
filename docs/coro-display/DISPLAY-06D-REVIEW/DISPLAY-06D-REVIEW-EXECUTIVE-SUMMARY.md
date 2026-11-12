# DISPLAY-06D-REVIEW — Synthèse exécutive

## Constats

La revue indépendante a été exécutée depuis `2914f13cba79dca1340ded34c42a79fabcd039f2`, après confirmation que la PR #252 est fusionnée dans `origin/main` au SHA `e39d3aaec3428fe380b260da49584b98742be965`. Les garanties de cache, de persistance d'urgence, d'authentification M2M et d'isolation PostgreSQL disposent de preuves synthétiques exécutées. Deux défauts ciblés ont été corrigés : échappement/symlink dans la vérification d'intégrité du runtime et DNS rebinding/méthodes non autorisées sur l'origine loopback.

## Preuves et tests

- 185 migrations appliquées depuis zéro sur PostgreSQL 16 jetable.
- 41 tests Display unitaires/adversariaux PASS.
- 2 tests PostgreSQL Display PASS.
- E2E PostgreSQL → Gateway → Player → Cache → Chromium → heartbeat PASS, avec trois organisations synthétiques. Les captures 1×1 noires prouvent le pipeline mais pas la fidélité visuelle.
- Builds backend, frontend et portail, TypeScript frontend/portail, ESLint ciblé et `git diff --check`: PASS.
- `npm audit --omit=dev`: 0 vulnérabilité runtime; audit complet: 30 vulnérabilités de développement, dont 3 élevées.
- Suite backend historique complète: résultat terminal non capturé, donc `NOT_VERIFIED`; aucun PASS ne lui est attribué.

## Limites et risques résiduels

Le watchdog est une politique pure non branchée au processus. Le Player utilise toujours une clé privée PEM exportable depuis l'environnement. La vérification d'intégrité n'est pas appelée au démarrage et son manifeste n'a pas de chaîne de confiance. Les révocations ne possèdent pas d'ancrage anti-rollback persistant et ne sont lues qu'au démarrage. systemd, TPM/CNG/PKCS#11, panne électrique physique et kiosque matériel ne sont pas vérifiés.

## Verdict

**NO-GO DISPLAY-06D-INTEGRATION.** Les corrections locales améliorent la défense en profondeur, mais les mécanismes P0 annoncés ne sont pas tous opérationnellement intégrés.
