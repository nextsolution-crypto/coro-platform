# CORO Email E2E — matrice de traçabilité

| Exigence | Code principal | Test ou contrôle | Preuve | Résultat |
|---|---|---|---|---|
| Invitation client | `client-auth.service.ts`, `email.service.ts` | tests du service courriel; acceptation QA | run `email-qa-20261025-001` | QA réel PASS |
| Demande de récupération neutre | `client-auth.controller.ts`, `client-auth.service.ts` | `client-password-reset.spec.ts` | tests automatisés | PASS |
| Jeton de récupération robuste et haché | `client-auth.service.ts` | `client-password-reset.spec.ts` | tests automatisés | PASS |
| Expiration et usage unique du reset | `client-auth.service.ts` | `client-password-reset.spec.ts` | automatisé + rejeu QA réel | PASS, niveaux de preuve distincts |
| Révocation des jetons concurrents | `client-auth.service.ts` | `client-password-reset.spec.ts` | tests automatisés | PASS |
| Révocation des sessions | `client-auth.service.ts`, `client-jwt.guard.ts` | test de jeton antérieur synthétique | tests automatisés | PASS automatisé; session QA réelle non vérifiée |
| Demande Magic Link neutre et limitée | `client-auth.controller.ts`, `client-auth.service.ts` | `client-magic-link.spec.ts` | tests automatisés | PASS |
| Magic Link 15 minutes et haché | `client-auth.service.ts` | `client-magic-link.spec.ts` | tests automatisés | PASS |
| Rejeu Magic Link refusé | `client-auth.service.ts` | `client-magic-link.spec.ts` | automatisé + QA réel | PASS |
| MFA après Magic Link | `client-auth.service.ts`, `app/magic/page.tsx` | tests backend et contrat portail | QA réel | PASS |
| Aucun JWT direct depuis Magic Link | `app/magic/page.tsx` | `magic-link-request.contract.test.mjs` | test automatisé | PASS |
| URLs du portail gouvernées | `runtime.config.ts`, `client-auth.service.ts`, `email.service.ts` | tests runtime et auth | QA réel pour URLs QA | PASS |
| Liaison Docker et QA | `main.ts`, `runtime.config.ts` | `runtime.config.spec.ts`; build | tests automatisés | PASS |
| CORS compatible et restrictif | `runtime.config.ts`, `main.ts` | `runtime.config.spec.ts` | tests automatisés | PASS |
| Route `/magic-link` gouvernée | `route-registry.ts` | `portal-glass.test.cjs`, `test:skin` | CI portail | PASS |
| Aucun secret ou preuve QA dans Git | `.gitignore`, workflow backend, revue de diff | scan du patch et inventaire Git | contrôle automatisé + revue | PASS |
| Livraison production | configuration et images de release | contrôles post-déploiement | aucune preuve à ce stade | NOT_RUN |
