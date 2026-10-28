# CORO Web AI — rapport de préparation fournisseur réel

Date : 2026-10-27

Branche : `feature/web-ai-03-live-readiness`

Base : `b96002fc20dd6c3d1c92011b72c23795dd6e945c`

## Résumé

L'architecture générale est saine : corpus public séparé, fournisseur simulé par défaut, adaptateur Bedrock privé strict, IAM Roles Anywhere sans secret long terme dans Git, runtime policy fail-closed, image glibc et identité SQL publique conçue en lecture seule.

Les sources AWS confirment que Nova Lite et son profil géographique canadien sont techniquement adaptés. Cependant, le chemin public réel n'est pas encore implémenté : l'orchestrateur refuse expressément tout fournisseur autre que `simulated`. L'adaptateur existant relève de CORO Knowledge privé et ne peut pas être réutilisé directement sans créer une politique et des types de sources publics.

En outre, aucune preuve actuelle n'a été obtenue dans cette phase pour la disponibilité du profil dans le compte, les quotas, les grants SQL de production, l'exécution du helper dans l'image active, son renouvellement ou les tarifs Canada. Aucun appel AWS ou modèle n'a été exécuté.

## Matrice

| Domaine                 | Statut             | Conclusion                                      |
| ----------------------- | ------------------ | ----------------------------------------------- |
| Modèle Nova Lite CA     | PASS documentaire  | Converse/tool calling, deux régions canadiennes |
| Résidence géographique  | PASS documentaire  | à revalider par `GetInferenceProfile` compte    |
| Fournisseur public réel | NOT_IMPLEMENTED    | fournisseur simulé volontairement imposé        |
| Isolation corpus public | PASS conception/QA | aucun type privé dans le schéma                 |
| Identité SQL production | NOT_VERIFIED       | grants réels non inspectés                      |
| IAM Roles Anywhere      | PARTIAL            | configuration rapportée, runtime non reverifié  |
| Compatibilité glibc     | PASS code          | Dockerfile Debian bookworm-slim                 |
| Renouvellement 900 s    | NOT_VERIFIED       | test réel interdit dans cette phase             |
| IAM moindre privilège   | NOT_VERIFIED       | politique effective non inspectée               |
| Coûts                   | PARTIAL            | modèle de calcul prêt, tarifs Canada à capturer |
| Kill switch             | PASS conception    | runtime policy fail-closed; exercice requis     |
| Dépendances runtime     | CONDITION          | audit npm : 1 critique, 8 élevées, 1 modérée    |
| Appel de modèle         | NON EXÉCUTÉ        | conforme au mandat                              |

## Validations locales exécutées

- Runtime policy et contrat de workflow : 15 PASS, 1 SKIP (contrôle root non applicable sous Windows).
- Adaptateur Bedrock simulé, gateway, orchestrateur public et service SQL : 54 PASS.
- `git diff --check` : PASS.
- `npm audit --omit=dev --audit-level=high` : FAIL, avec avis sur `proxy-addr`, `multer`, `body-parser`, `@xmldom/xmldom`, `qs` et `zod` transitif.

Aucune correction automatique n'a été appliquée. Avant une campagne réelle, les dépendances runtime critiques/élevées doivent être mises à jour ou faire l'objet d'une analyse d'exploitabilité documentée et acceptée. Cette dette existe indépendamment de Bedrock, mais un nouvel endpoint public ne doit pas l'ignorer.

## Conditions avant tests réels

1. implémenter et livrer l'adaptateur `WEB_PUBLIC` sans l'activer;
2. prouver l'identité SQL runtime de production et ses refus;
3. inspecter la politique IAM effective, profil, modèle et quotas;
4. valider helper, bibliothèques et renouvellement dans l'image exacte;
5. capturer destinations par `GetInferenceProfile`;
6. fixer les tarifs et approuver 25 CAD / 100 requêtes / 7 jours;
7. démontrer compteurs, alertes et arrêt immédiat;
8. corriger ou accepter formellement les avis runtime critiques/élevés;
9. obtenir l'autorisation explicite de campagne.

## Verdict unique

**READY_WITH_CONDITIONS**

Une campagne limitée est techniquement envisageable, mais elle n'est pas autorisable aujourd'hui tant que les neuf conditions ci-dessus ne sont pas démontrées.

## Bloc d'autorisation final

- APPELS BEDROCK OU ANTHROPIC : **NON**
- NOUVELLES PERMISSIONS DE PRODUCTION : **NON**
- CRÉATION OU MODIFICATION DE SECRET : **NON**
- ACTIVATION DES FEATURE FLAGS : **NON**
- FUSION : **NON**
- DÉPLOIEMENT : **NON**
- OUVERTURE AUX VISITEURS : **NON**

Prochaine décision : validation humaine de ce rapport puis, séparément, autorisation éventuelle d'une campagne plafonnée à 100 requêtes, 25 CAD et 7 jours.
