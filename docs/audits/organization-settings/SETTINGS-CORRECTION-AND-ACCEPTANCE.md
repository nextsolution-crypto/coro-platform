# Correction et acceptation intégrée — Paramètres

## Périmètre et candidat

- Audit parent : `d6474dc673d023914a30d5aba8f9446efd7ac46d`.
- Branche : `fix/organization-settings-governance`.
- Candidat final : consigné dans la PR et dans les preuves externes après publication.
- Production rapportée au départ : `165b41a0b8ecd6ae1fd18f0b03325bc1c8c63b`; aucune production n’a été modifiée.

## Corrections

1. Annuaire administratif protégé; projection organisationnelle minimale séparée.
2. Logos et modèle Module 1 protégés avant traitement et stockage.
3. Données de présentation centralisées sur `Organization`; reprise historique déterministe et non destructive.
4. Changement de mot de passe avec secret actuel, politique existante, révocation cohérente et MFA conservé.
5. Invitations internes gouvernées par une outbox chiffrée, transactionnelle, idempotente et rejouable.
6. États d’erreur et reprise accessibles; outils alignés sur les permissions; dialogue clavier corrigé.
7. Manuel Paramètres réconcilié sans extension éditoriale hors périmètre.

## PostgreSQL et migration

Migration : `20261118010000_organization_settings_governance` (tête 165 du candidat).

- Depuis zéro : 165 migrations appliquées sur PostgreSQL 16.
- Upgrade : tête parent 164 vers 165 avec deux organisations et valeurs historiques synthétiques.
- Valeurs unanimes : copiées sur l’organisation.
- Valeurs divergentes : colonnes `User` conservées, valeur canonique laissée vide et lignes `OrganizationSettingsConflict` créées.
- Relations et historiques : conservés.
- Rollback applicatif : additif et compatible avec les anciennes colonnes `User`; ne pas supprimer les nouvelles tables/colonnes avant sauvegarde, revue des conflits et procédure de migration inverse approuvée.

## Acceptation API/PostgreSQL

Preuve assainie : `D:\CORO-QA\audits\organization-settings\api-acceptance.json`.

- annuaire ADMIN autorisé et OPERATOR refusé;
- isolation inter-tenant, rôle forgé et mass assignment refusés sans mutation;
- logo et Module 1 refusés avant effet;
- désactivation effective à la requête suivante, anciens jetons non restaurés;
- mot de passe incorrect sans mutation; rotation réussie, ancien secret/session/appareil refusés, nouveau secret + MFA acceptés;
- double clic/réponse perdue : même utilisateur et une intention;
- concurrence non idempotente : un 201, un 409, un utilisateur et un événement;
- panne fournisseur simulée : reprise jusqu’à `DELIVERED`, deux tentatives, une seule intention;
- renvoi : accès existant préservé et une seule intention.

`DELIVERED` signifie « accepté par le fournisseur simulé ». La livraison externe exactly-once n’est ni promise ni démontrée.

## Acceptation Chrome

Preuves : `D:\CORO-QA\audits\organization-settings\browser`.

- 390×844, 768×1024, 1440×900 et 2560×1440;
- Classic, Glass Light et Glass Dark : 12/12 PASS;
- huit routes Paramètres : 8/8 PASS;
- rôles ADMIN et OPERATOR, accès direct refusé, F5, 503/reprise;
- clavier/focus, fermeture Échap, zoom 200 %, aucun contrôle hors écran;
- aucune erreur console critique;
- captures représentatives inspectées visuellement.

Lecteur d’écran réel : `NOT_VERIFIED` faute d’un moyen fiable dans le runtime QA.

## Configuration avant release future

- `CLIENT_INVITATION_OUTBOX_KEY_BASE64` : obligatoire, base64 décodant exactement 32 octets; aucune valeur par défaut.
- `CLIENT_INVITATION_OUTBOX_KEY_ID` : identifiant stable de la clé active.
- `CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_BASE64` : objet JSON des anciennes clés conservées tant que des événements chiffrés les référencent.
- Les secrets ne doivent être présents ni dans Git, ni dans les logs, ni dans les preuves. Leur disponibilité production n’a pas été modifiée dans ce mandat.

## Décision

`ACCEPTATION_INTÉGRÉE_PASS — PRÊT_POUR_REVUE`

Décision métier restante : chaque conflit historique divergent doit recevoir une confirmation administrative explicite avant de devenir une valeur canonique. Cela ne bloque pas les organisations sans conflit ni la revue de la PR.
