# Sécurité et résilience

- Player non privilégié et surface d'écriture bornée.
- Signature externe obligatoire; aucune clé privée dans le runtime.
- Priorités préservées : `EMERGENCY_REAL > EMERGENCY_EXERCISE > PERMANENT_PLAN > NORMAL_CYCLE`.
- Une urgence persistée survit aux redémarrages; le cache corrompu échoue de façon sûre.
- Télémétrie validée et bornée; aucun secret, environnement complet ou contenu privé.
- Registre de révocation signé, séquencé et anti-rollback logiciel.
- Sources machine `CORO_OPS`/`CORO_INCIDENT` toujours refusées sur les routes humaines avec `MACHINE_EVENT_SOURCE_REQUIRES_TRUSTED_ADAPTER`.

Tests ciblés Player/policy/résilience : 22/22 PASS. Audit runtime : 0 vulnérabilité. Dette d'outillage : 3 élevées, 23 modérées, 4 faibles, non embarquées dans l'image runtime; suivi requis sans `npm audit fix --force`.
