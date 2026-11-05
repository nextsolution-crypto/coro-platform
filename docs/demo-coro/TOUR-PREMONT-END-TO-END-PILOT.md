# Pilote bout en bout — Tour Prémont

## Objectif

Utiliser le projet PMU et le bâtiment Tour Prémont du tenant canonique `CORO Démo` comme fil conducteur d'une recette complète, sans effacer ni recréer le PMU historique. Les nouvelles mutations doivent produire de nouvelles versions ou des fixtures explicitement rattachées au pilote.

Le registre produit est accessible dans SuperAdmin sous **Test Scenario Pilot**. Il est l'autorité de suivi des exécutions. Ce document décrit la gouvernance; il ne remplace pas les preuves enregistrées dans le registre.

## Cible verrouillée

- Organisation : `CORO Démo`
- `organizationId` : `916f54ec-af22-45e0-99db-a369d9630002`
- Client préservé : `Groupe Immobilier Prémont`
- Compte de référence : `demo@getcoro.io`
- Projet historique préservé : `PMU — Tour Prémont 2026`
- Projet complémentaire préservé : `PCA — Tour Prémont 2026`

L'identifiant canonique du bâtiment et celui du projet sont sélectionnés depuis les données serveur dans SuperAdmin. Un nom ou un identifiant fourni par le navigateur ne constitue pas une autorisation.

## Phases suivies

1. Fondation : client, bâtiment, projet, identités et isolation.
2. Configurateur du bâtiment.
3. Génération, édition, versionnement et fichier privé.
4. Révision interne et boucle de correction.
5. Portail client et approbation.
6. Knowledge et CORO AI simulée, avec citations.
7. Incident et Sentinelle.
8. Exercice, REX et actions correctives.
9. Résilience.
10. CORO Network.
11. Rendement et hypothèses financières de démonstration.
12. Sécurité, panne, reprise, audit et reset.

La liste canonique détaillée est versionnée dans `coro-backend/src/pilot-scenarios/pilot-scenario.checklist.ts`. Une nouvelle exécution copie cette version dans des contrôles persistants afin que les preuves historiques ne changent pas quand la liste évolue.

## Signification des statuts

- `PASS` : le contrôle a été exécuté et une observation a été enregistrée.
- `FAIL` : un écart reproductible a été observé.
- `BLOCKED` : l'exécution exige une dépendance ou une intervention précise.
- `NOT_APPLICABLE` : le contrôle n'appartient pas au périmètre de cette exécution.
- `NOT_RUN` : aucune preuve n'est encore acquise.

Une campagne n'est `PASSED` que si tous ses contrôles sont `PASS` ou `NOT_APPLICABLE`. Une clôture avec des contrôles ouverts ou bloqués devient `PARTIAL`; la présence de données ne produit jamais automatiquement un `PASS`.

## Protections

- Accès réservé à SuperAdmin, authentification normale requise.
- Cible limitée aux organisations actives possédant un `DemoEnvironment` actif.
- Bâtiment et projet actifs, avec appartenance organisationnelle vérifiée côté serveur.
- Audit administratif obligatoire pour la création, chaque résultat et la clôture.
- Aucune permission, notification, alarme ou mutation métier n'est déclenchée par le registre.
- Les communications métier de `CORO Démo` restent simulées ou bloquées selon sa politique.
- Les fournisseurs IA réels restent désactivés pendant la recette.

## Intervention humaine attendue

Codex exécute les contrôles serveur, PostgreSQL, API, stockage, compilation et les parcours navigateur automatisables. Mathieu intervient seulement lorsque l'authentification/MFA, une observation humaine d'accessibilité ou une décision métier ne peut pas être prouvée autrement. Le contrôle reste `BLOCKED` ou `NOT_RUN` jusqu'à cette preuve.

## Baseline QA du registre

La première acceptation du registre a été exécutée dans le stack QA isolé avec PostgreSQL 16, backend et frontend réels, neuf identités synthétiques et MFA local :

- migration depuis zéro : `PASS` (171 migrations);
- mise à niveau depuis la tête parente avec données historiques préexistantes : `PASS`;
- sélection de la cible depuis l'autorité serveur : `PASS`;
- refus anonyme : `PASS` (`401`);
- refus d'un acteur non SuperAdmin : `PASS` (`403`);
- création d'une exécution, mise à jour d'un contrôle, note de preuve et clôture partielle : `PASS`;
- persistance après actualisation : `PASS`;
- Chrome : `12/12 PASS` sur 390×844, 768×1024, 1440×900 et 2560×1440, en Classic, Glass Light et Glass Dark;
- clavier, focus et zoom 200 % : `PASS`;
- lecteur d'écran réel : `NOT_VERIFIED`.

Les captures et le rapport machine sont conservés hors Git sous `D:\CORO-QA\runs\tour-premont-pilot\browser`. Cette baseline prouve le registre et sa gouvernance; elle ne constitue pas encore l'exécution complète du pilote Tour Prémont en production Démo.

## Critère de clôture

Le pilote est utilisable uniquement lorsque la campagne correspondante est `PASSED`, que les accès temporaires sont révoqués, que les communications externes demeurent neutralisées et que le PMU historique est toujours présent avec son historique de versions.
