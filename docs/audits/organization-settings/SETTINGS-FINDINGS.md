# Constats Paramètres

## SET-001 — HIGH — Annuaire lisible par OPERATOR

- Reproduction : `GET /users/organization` avec l’OPERATOR synthétique.
- Observé : HTTP 200 et trois membres avec identité, courriel, rôle et statut.
- Attendu : accès réservé à ADMIN/SUPER_ADMIN, comme l’interface l’annonce.
- Cause : absence de `assertAdmin` sur la route GET.
- Impact : divulgation de l’annuaire interne et des rôles.
- Critère : 403 pour OPERATOR; liste tenant-scopée pour ADMIN; aucun contenu en cas de refus.

## SET-002 — MEDIUM — Surcollecte dans `/organizations/me/info`

- Observé : l’endpoint commun renvoie `users` à un OPERATOR.
- Cause : `findOne` sert à la fois l’administration et l’information courante.
- Impact : second chemin de divulgation contournant le masquage UI.
- Critère : DTO de lecture minimale ou route administrateur distincte.

## SET-003 — HIGH — Logo modifiable par OPERATOR

- Reproduction : `PUT /users/me/logo` avec un OPERATOR; HTTP 200.
- Effet QA restauré immédiatement.
- Cause : route authentifiée sans contrôle administrateur; validation serveur limitée au type chaîne.
- Impact : altération de l’identité visuelle et stockage de contenu arbitraire.
- Critère : autorisation serveur avant lecture du contenu, limites taille/MIME/contenu et audit.

## SET-004 — HIGH — Changement de mot de passe sans secret actuel

- Contrat : `PUT /users/me/password` ne reçoit que `newPassword`.
- Cause : aucun contrôle du secret actuel ni réauthentification récente.
- Impact : une session compromise peut remplacer le secret, malgré la révocation ultérieure des sessions.
- Critère : vérification du secret actuel ou preuve de réauthentification forte, politique unique et audit sans secret.

## SET-005 — MEDIUM — Panne des membres présentée comme liste vide

- Reproduction : interception déterministe 503 sur `/users/organization`.
- Observé : aucune alerte accessible, aucune action Réessayer.
- Cause : `fetchData` journalise seulement l’erreur puis termine le chargement.
- Impact : faux vide et diagnostic impossible.
- Critère : état erreur distinct, message `role=alert`, reprise et conservation de la saisie.

## SET-006 — HIGH — Modèle Module 1 modifiable par OPERATOR

- Reproduction : `PUT /organizations/module1-template`; HTTP 200 avec OPERATOR.
- Effet QA restauré immédiatement.
- Cause : contrôleur authentifié et tenant-scopé, mais sans autorité ADMIN.
- Impact : altération des modèles documentaires de toute l’organisation.
- Critère : ADMIN/SUPER_ADMIN uniquement, DTO strict, audit et refus sans écriture.

## SET-007 — HIGH — Présentation organisationnelle stockée par utilisateur

- Preuve code : nom, coordonnées et logos sont lus/écrits via `/users/me` et colonnes `User`.
- Impact : deux administrateurs d’une même organisation peuvent voir et enregistrer des identités visuelles divergentes; l’intitulé « Organisation » est trompeur.
- Critère : autorité canonique organisationnelle, migration gouvernée ou libellé explicitement personnel selon décision métier.

## SET-008 — HIGH — Invitation et renvoi non gouvernés par outbox

- Création : compte commité avant l’envoi; l’échec fournisseur est absorbé.
- Renvoi : mot de passe remplacé et sessions révoquées avant l’envoi; l’échec retourne tout de même un succès.
- Le renvoi n’écrit pas d’audit métier durable.
- Impact : compte créé ou verrouillé sans invitation livrée, faux succès et reprise non déterministe.
- Critère : outbox idempotente, statut observable, reprise, déduplication et audit; aucun secret dans UI/journal/preuve.

## SET-009 — MEDIUM — Outils administratifs exposés aux OPERATOR

- `/settings` montre Catégories timelog et Modèles de tâches à tous les rôles, alors que leurs mutations exigent ADMIN.
- Impact : parcours en impasse et erreurs 403 tardives.
- Critère : capacité expliquée et filtrage UI cohérent, sans remplacer le contrôle serveur.

## Constats positifs

- Mass assignment profil : refus 400, état inchangé.
- Injection `SUPER_ADMIN` par ADMIN : refus 403.
- Cible inter-tenant : 404 et aucun effet secondaire.
- Désactivation : prochaine requête 401; ancien jeton encore 401 après réactivation; nouvelle authentification requise.
- Identité inactive : connexion refusée.
- Audit durable des transitions active/inactive : présent.
