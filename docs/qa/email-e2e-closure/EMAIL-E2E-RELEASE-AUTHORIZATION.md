# CORO Email E2E — fiche d'autorisation de release

## Portée proposée

Autoriser, en deux décisions distinctes:

1. l'intégration des PR `#82`, `#83`, `#84` et `#85` dans `main`, dans cet ordre, avec changement de base GitHub de chaque PR descendante vers `main` après la fusion précédente;
2. après vérification du SHA final, un unique déclenchement manuel du workflow de production pour ce SHA.

L'autorisation d'intégration ne vaut pas autorisation d'envoi de courriel réel, de changement de secret, de migration de données ou de rollback.

## Références préparées

| PR | Branche source | SHA contrôlé avant approbation | Contenu |
|---|---|---|---|
| #82 | `integration/email-e2e-runtime` | `16c0579895f1a4e0dffb5ba7ec2dc9ac52f497ef` | runtime, CORS et CI backend |
| #83 | `integration/email-e2e-security` | `26b8a61605a4ff1d477675fb746d5ddfffada861` | sécurité auth/reset/Magic Link |
| #84 | `integration/email-e2e-ui` | `c89bfec191d76fb8c49df6a3314f83e4a27d68b8` | interface et gouvernance Liquid Glass |
| #85 | `integration/email-e2e-qa-tooling` | tête à vérifier immédiatement avant fusion | outillage QA et dossier G10 |

Le SHA final de `main` n'existe pas encore; il doit être relevé après les quatre fusions et devenir l'unique `release_commit` autorisable.

## Résultats préalables

- PR fusionnables, sans conflit et sans auto-merge.
- CI backend dédiée: PASS, y compris sur la PR #83.
- CI portail: PASS.
- Tests sécurité ciblés: 42/42 PASS sur la version consolidée.
- Build NestJS, TypeScript, Prisma et Docker Compose: PASS.
- Build Next.js isolé: PASS, 26 pages générées et route `/magic-link` présente.
- `test:skin`: 26/26 PASS; contrat Magic Link: 4/4 PASS.
- Aucun changement Prisma Email E2E; aucune migration dédiée.
- Preuve QA: empreinte conforme et fichier inchangé.

## Impact et risques

Les fusions vers `main` exécutent les validations mais ne construisent ni ne publient d'images. La production ne peut être modifiée que par `workflow_dispatch`. Les risques résiduels acceptables avant intégration sont consignés dans `EMAIL-E2E-OPEN-ITEMS.md`; la configuration et la santé production restent à contrôler avant et après release.

## Conditions d'arrêt

Arrêter si un SHA diffère, un check échoue, le diff d'une PR change hors périmètre, un secret apparaît, une migration inattendue est détectée, la configuration QA peut atteindre la production, un mécanisme MFA/session devient contournable ou le rollback n'est plus sûr.

## Retour arrière

Avant déploiement, revenir en annulant les merges par commits de revert contrôlés. Après déploiement, utiliser uniquement le workflow de restauration d'images immuables avec autorisation distincte. Aucune restauration de base n'est attendue pour ce chantier sans migration.

## Décision attendue

`AWAITING_EXPLICIT_HUMAN_APPROVAL` pour la fusion dans `main`. Le déploiement de production doit ensuite faire l'objet d'une confirmation explicite séparée ou d'une autorisation regroupée qui le nomme sans ambiguïté.
