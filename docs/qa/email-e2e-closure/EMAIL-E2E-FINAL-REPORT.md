# CORO Email E2E — rapport exécutif

## Objet et périmètre

Ce dossier couvre l'invitation client, la récupération de compte et la connexion par Magic Link du portail client CORO. Il consolide les travaux G1 à G10: acceptation QA réelle, isolation du runtime, durcissement des jetons et sessions, compatibilité production, intégration Git empilée et préparation de release.

## Résultat démontré

- Run QA conservé: `email-qa-20261025-001`.
- Empreinte SHA-256 vérifiée: `E6966BC4B4129DB350F0BFE3F65FF3BBA1DB66278080875FAEB1326A66E1E4E1`.
- Invitation: livraison, réception, connexion, MFA et session vérifiées en QA.
- Password Reset: livraison, changement de mot de passe, MFA, nouvelle session, ancien mot de passe refusé et rejeu du lien refusé en QA.
- Magic Link: livraison, MFA, session et rejeu du lien refusé en QA.
- Les nouveaux Magic Links expirent après 15 minutes, sont stockés sous empreinte et consommés atomiquement.
- La révocation par `sessionVersion`, les jetons expirés et les jetons concurrents sont couverts par tests automatisés isolés.
- Les builds NestJS et Next.js ainsi que les contrôles Liquid Glass sont conformes avant release.

## Intégration

La pile de PR est ordonnée `#82 → #83 → #84 → #85`. Un workflow de validation backend sans accès production a été ajouté afin que la sécurité de la PR #83 soit contrôlée par GitHub Actions. La stratégie retenue consiste à fusionner les quatre PR dans l'ordre, sans déploiement intermédiaire, puis à lancer une seule release manuelle sur le SHA final approuvé.

## Production

État à la création de ce rapport: `PRODUCTION_UNCHANGED`. Aucun envoi supplémentaire, migration, changement de secret ou déploiement n'a été exécuté par G10. Les valeurs de production et les digests d'images doivent être inscrits dans `EMAIL-E2E-DEPLOYMENT.md` après autorisation et observation directe.

## Réserves

Les réserves ouvertes sont maintenues dans `EMAIL-E2E-OPEN-ITEMS.md`. Elles distinguent les preuves humaines QA, les tests automatisés et les contrôles de production non encore exécutés.

## Verdict au stade pré-release

`CORO EMAIL E2E — RELEASE READY / AWAITING PRODUCTION APPROVAL`, sous réserve que les checks GitHub de la tête finale restent verts et que l'autorisation de fusion et de déploiement soit explicitement accordée.
