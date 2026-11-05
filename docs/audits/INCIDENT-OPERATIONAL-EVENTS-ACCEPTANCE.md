# CORO Incident — événements opérationnels critiques

Date de recette : 2026-11-04

Branche : `feature/incident-operational-events`

Baseline : `origin/main` à `82ebbd2f`

## Périmètre livré

Six événements opérationnels sont maintenant des types Incident canoniques :

- `ELEVATOR_ENTRAPMENT` — personne coincée dans un ascenseur — P012;
- `FIRE_PROTECTION_IMPAIRMENT` — protection incendie compromise — P032;
- `HAZARDOUS_ATMOSPHERE` — atmosphère dangereuse ou ventilation de sécurité indisponible — P029;
- `EMERGENCY_POWER_FAILURE` — perte de l’alimentation électrique d’urgence — P030;
- `SEVERE_ICE_CONDITIONS` — conditions dangereuses liées au verglas — P025;
- `CRITICAL_SAFETY_SYSTEM_LOSS` — perte d’un système essentiel à la sécurité — P031.

Le produit coordonne la réponse opérationnelle. Les textes n’autorisent ni diagnostic technique, ni réparation, ni entrée dans une gaine d’ascenseur, ni activation automatique du PCA.

## Autorité et intégrité

- Le type est validé par DTO et par l’enum PostgreSQL.
- L’auteur est dérivé de l’identité authentifiée; une valeur `triggeredBy` fournie par le navigateur est ignorée.
- Les contrôles organisation, bâtiment, permission individuelle et affectation Incident restent obligatoires.
- La procédure et la fiche d’intervention sont figées lors du déclenchement.
- La provenance du projet et du document approuvés est enregistrée avec identifiants, type, statut, version et dates.
- La sélection de la source est déterministe (`updatedAt`, version et identifiant).
- Aucun fournisseur réel ni communication externe n’a été activé pendant la recette.

## Validation technique

- Prisma : génération et validation du schéma réussies.
- Migration depuis zéro : 170 migrations appliquées sur PostgreSQL réel.
- Upgrade ciblé : enum historique créé, migration additive appliquée, 6/6 valeurs nouvelles vérifiées.
- Backend TypeScript : PASS.
- Portail TypeScript et build Next.js : PASS.
- Backend ciblé : 7 suites, 58 tests, PASS.
- Backend complet : 269 suites PASS, 3 ignorées, 2470 tests PASS. Le seul contrôle non exécutable est l’OCR PNG historique faute de `pdftoppm` sur l’hôte; il est indépendant de ce lot.
- Contrat portail des événements : PASS.
- `git diff --check` : PASS.

## Acceptation intégrée

Stack isolé `incop26`, PostgreSQL réel, backend et portail construits depuis le candidat, réseau sortant bloqué et MFA local normal.

- 6/6 événements déclenchés comme exercices synthétiques;
- correspondance type/procédure : 6/6;
- provenance projet/document/version : 6/6;
- auteur navigateur usurpé : refusé 6/6;
- événements d’audit `INCIDENT_CREATED` : 6/6;
- activation PCA automatique : 0;
- erreurs console critiques : 0;
- persistance de session après F5 : PASS;
- matrice Chrome : 12/12 (390×844, 768×1024, 1440×900, 2560×1440; Classic, Glass Light, Glass Dark);
- débordement horizontal : 0;
- cible interactive sous 44 px après correction : 0.

Les captures et le rapport machine sont conservés sous `D:\CORO-QA\runs\incop26\incident-operational-events` et ne sont pas publiés dans Git.

## Remise en état

- incidents synthétiques actifs : 0;
- affectations synthétiques actives : 0;
- permission Incident temporaire du ClientUser : retirée;
- jetons publics des fixtures : neutralisés;
- preuves d’audit append-only : conservées;
- stack et conteneur PostgreSQL jetables : arrêtés/supprimés;
- données et preuves de la campagne : préservées sous le répertoire QA gouverné.

## Sources opérationnelles

Les procédures ont été confrontées aux sources officielles canadiennes et américaines répertoriées dans `INCIDENT-OPERATIONAL-EVENTS-PROCEDURE-SOURCES.md`. Elles restent des procédures de coordination CORO; les plans approuvés de l’immeuble, l’autorité compétente et les exigences locales prévalent.

## Limites

- Aucun événement réel, appel 9-1-1, avis à un service incendie, assureur ou fournisseur n’a été effectué.
- Aucun diagnostic d’équipement ni geste technique n’a été validé par cette recette.
- Le lecteur d’écran humain réel reste `NOT_VERIFIED`; les rôles, libellés, focus et dimensions ont été vérifiés par navigateur.
- La validation en production et la release restent à effectuer par le processus gouverné.

## Verdict QA

`ACCEPTATION_INTÉGRÉE_PASS — READY_FOR_PR`
