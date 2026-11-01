# Audit intégré de l’écran Bibliothèque CORO

## Références

- Branche locale : `audit/organization-library`
- Base : `origin/main` `65f58ddb10b3eb61878627d33bb5befc385499df`
- Référence produit active observée : `cedbcbf40db4279ac6d7dec82dc58ec6f5976a38`
- Date : 2026-11-01
- Périmètre : `/library`, APIs `library`, procédures standard/custom et réutilisation Module 4.

## Résumé exécutif

L’écran nommé « Bibliothèque centrale » est un visualiseur authentifié de trois référentiels globaux : codes incidents, rôles et procédures officielles. Il n’est pas une bibliothèque de fichiers et ne démontre ni ProjectFile, ni versions documentaires, ni stockage privé, ni Knowledge.

La lecture globale fonctionne en production. Deux blocages structurants empêchent toutefois l’acceptation complète : les mutations du catalogue n’ont pas d’autorité fonctionnelle et écrivent une source que l’écran ne relit jamais; les lectures de procédures contextualisées par projet n’appliquent pas systématiquement la politique canonique d’accès au projet. Les custom procedures élargissent ce risque aux imports et appels IA.

## Architecture réelle

| Surface | Autorité réelle | Portée |
|---|---|---|
| `/library/incident-codes` | tables `IncidentCode` actives | globale |
| `/library/roles` | tables `Role` actives | globale |
| `/library/procedures` GET | registre TypeScript `getAllProcedures()` | globale, code-versionnée |
| `/library/procedures` POST/PUT | table Prisma `Procedure` | globale, mais non relue |
| `/procedures` | `ProcedureDefault` + `ProcedureOverride` | défaut, organisation, projet |
| `/custom-procedures` | `CustomProcedure` | organisation/projet/global |
| ProjectFile / Knowledge | aucune intégration dans cet écran | séparée |

## Production en lecture seule

Une session déjà autorisée a ouvert `https://app.getcoro.io/library`. État observé : titre et sous-titre attendus, onglets `Codes incidents 28`, `Rôles 43`, `Procédures 43`; aucune action de mutation ou de stockage exposée dans cet écran. Aucune donnée étrangère n’a été recherchée et aucune action métier n’a été exécutée.

## Validation locale

Le runner `qa/organization-library-audit/library-contract.test.cjs` caractérise les contrats du candidat :

- mutations non protégées par permission fonctionnelle;
- sources lecture/écriture divergentes;
- absence de portée canonique sur les lectures projet;
- erreur de chargement console-only;
- absence de fonctions documentaires dans `/library`.

Ces tests démontrent l’état actuel; leur réussite ne signifie pas conformité.

Résultats exécutés :

- caractérisation Node : `5/5 PASS`;
- build frontend Next.js : `PASS` (route `/library` générée);
- build backend Nest : `PASS` après génération locale du client Prisma verrouillé;
- `git diff --check` : `PASS`.

## UX et responsive

La grille et les retours de ligne limitent les débordements les plus évidents. La production desktop est lisible. La recette synthétique 12/12 et le lecteur d’écran réel restent `NOT_VERIFIED`; aucune affirmation PASS n’est faite. L’absence d’état d’erreur visible est confirmée dans le code.

## Sécurité

- Authentification et organisation active : présentes.
- Permission de mutation du catalogue : absente.
- Isolation du projet sur les lectures de procédures : insuffisante.
- Isolation des custom procedures : organisation sur l’objet, mais parent projet non résolu canoniquement pour plusieurs routes.
- Aucun Platform Authority fallback démontré dans `/library`; le problème est au contraire l’absence d’autorité fonctionnelle précise.
- Aucun secret ou contenu privé n’a été produit dans les preuves.

## Décision

`AUDIT_COMPLETE_CORRECTION_REQUIRED`

Le catalogue en lecture peut être démontré comme référentiel global, à condition de ne pas le présenter comme une bibliothèque documentaire ou Knowledge. Les opérations d’administration et la réutilisation projet ne doivent pas être déclarées acceptées avant les lots 1 et 2.

## Restrictions respectées

- `PRODUCT_CODE_CHANGE: NO`
- `PRODUCTION_MUTATION: NO`
- `PUSH_PR_MERGE: NO`
- `APPLICATION_DEPLOYMENT: NO`
- `REAL_NOTIFICATION: NO`
- `WEB_AI_ACTIVATION: NO`
