# SP-OPS-04B — Final readiness

## Portée et point d'arrêt

Ce dossier prépare le premier essai réel contrôlé de Sentinelle Population.
Il n'autorise ni provisionnement, ni permission de production, ni destinataire
personnel, ni activation LIVE, ni SMS, ni courriel réel.

Référence applicative vérifiée avant le lot :
`e987591a93dd6ac99e66baad85a39fb87cbbddec`.

## Infrastructure

- Les PR #211 et #212 sont incluses dans la référence active rapportée.
- Le provisionneur compilé et le calcul budgétaire sont présents dans ce SHA.
- La tête de migration rapportée et inspectée est
  `20261127010000_population_sms_delivery_webhooks` (174 migrations).
- Les cinq conteneurs et PostgreSQL ont été inspectés sains après la livraison
  de #212.
- Le TFN approuvé est verrouillé dans le code à `+18335886812` pour le test
  contrôlé.
- LIVE demeure désactivé et STOP actif. PAUSED/BLOCK restent prioritaires.

## Point d'entrée de dry-run préparé

Le workflow `Production Population Controlled Test Readiness` :

1. ne comporte aucune entrée libre;
2. exige l'environnement GitHub `production`;
3. utilise le groupe de concurrence commun `coro-production-maintenance`;
4. acquiert aussi `/run/lock/coro-production-deployment.lock` sur l'hôte;
5. n'accepte qu'un SHA déjà ancêtre de `origin/main`;
6. exécute le véritable provisionneur déjà compilé;
7. l'enveloppe dans `SET TRANSACTION READ ONLY`;
8. ne contient aucune branche de provisionnement;
9. retire ses temporaires;
10. refuse une preuve contenant un courriel, un identifiant d'acteur ou un
    secret.

Ce workflow doit être fusionné avant de pouvoir être exécuté. Sa fusion et son
exécution en production ne sont pas présumées autorisées par le présent commit.

## Cible déterministe

| Ressource | Identifiant prévu |
| --- | --- |
| Organisation | `916f54ec-af22-45e0-99db-a369d9630002` |
| Client fictif | `d3000001-0000-4000-8000-000000000002` |
| Bâtiment QA | `6a1b6f2e-38b2-5f41-a740-48252fd11224` |
| Profil RUE | `22db9950-e293-58db-9c72-b23386e53a51` |
| Scénario | `d66cc1d7-8144-51e1-8d55-66c736a7466d` |
| Zone | `e44f97c5-bdc3-54f9-8c5f-5d2627e600a5` |
| Programme | `915d3ef5-8e6b-5cb3-94d5-c038ddbe06d7` |
| Audit | `c00d0a14-729e-5a4e-9e5f-c6397af45504` |
| Slug | `coro-sp-ops-04b-test` |

État prévu : `CONFIGURING / SANDBOX / DUAL_CONTROL`, inscription, SMS et
courriel désactivés, zéro abonné et aucun destinataire.

## Gouvernance humaine

Deux comptes Démo existants sont évalués sans publier leurs identifiants :

- préparateur A : rôle `CLIENT_MANAGER`, permission attendue
  `POPULATION_PREPARE`;
- approbateur B : rôle `CLIENT_CORPORATE`, permission attendue
  `POPULATION_APPROVE`.

Le dry-run doit confirmer leurs permissions réelles et leur client. Le bâtiment
QA n'existant pas encore, aucune affectation ne doit être créée pendant cette
inspection. Toute attribution ultérieure constitue une écriture de production
et exige une autorisation distincte.

Le modèle testé refuse l'auto-approbation, persiste l'approbateur et invalide le
cycle après modification. L'approbation ne crée pas de livraison.

## Message proposé

### SMS

> EXERCICE / TEST CORO — AUCUNE URGENCE RÉELLE
>
> Essai technique Sentinelle Population pour un événement fictif. Aucune action requise.

### Courriel

> EXERCICE / TEST CORO — AUCUNE URGENCE RÉELLE
>
> Ceci est un essai technique de Sentinelle Population concernant un événement industriel fictif.
>
> Aucune action n’est requise.
>
> Ce message permet de vérifier le fonctionnement des notifications et leur traçabilité dans CORO.

Le préfixe impose UCS-2 au SMS. Le nombre de segments et le coût exact seront
calculés par le code de production avec les tarifs runtime; un tarif absent,
invalide ou un total supérieur à 100 cents CAD provoque un refus avant transport.

## Fournisseur et webhooks

Preuves conservées : TFN approuvé, expéditeur courriel annoncé vérifié, domaine
authentifié, routes webhook SMS/courriel présentes, secrets runtime précédemment
constatés présents et connectivité DNS/TLS réussie. Ces éléments ne prouvent pas
un envoi.

Le dry-run rapportera uniquement `SET/UNSET`, `MATCH/NO_MATCH` et les booléens
de sécurité. L'authentification API Brevo par un endpoint non transactionnel et
la concordance fournisseur des webhooks restent distinctes d'une simple présence
de variable.

La réconciliation simulée couvre `ACCEPTED`, `SENT`, `DELIVERED`, rejets,
bounces, blocage, doublons, désordre, identifiant inconnu, réponses et STOP.
`DELIVERED` signifie uniquement livraison technique, jamais lecture humaine.

## Résultats techniques du candidat

| Contrôle | Résultat |
| --- | --- |
| Tests workflow et preuve assainie | 4/4 PASS |
| Tests ciblés Population, sécurité et transport | 126/126 PASS |
| Tests provisionneur + budget (sous-ensemble précédent) | 22/22 PASS |
| TypeScript backend | PASS |
| Build NestJS | PASS |
| `git diff --check` | PASS |
| PostgreSQL provisionnement livré | 29 tests PostgreSQL PASS dans #211 |
| Migration complète depuis zéro | PASS dans #211/#212 |
| Communication réelle | NON EXÉCUTÉE |

Les 29 tests PostgreSQL et la chaîne de migrations ne sont pas attribués au
nouveau workflow : ils demeurent les preuves des candidats fonctionnels #211 et
#212, dont le code applicatif n'est pas modifié ici.

## Plan d'arrêt et remise en état

- Avant essai réel : `ENABLED=false`, `STOP=true`, programme SANDBOX et canaux
  désactivés.
- Un changement PAUSED/BLOCK/STOP doit toujours interrompre avant transport.
- Aucun retry automatique facturable n'est autorisé.
- En cas d'échec futur : conserver les événements, remettre STOP, retirer
  uniquement les permissions/destinations temporaires approuvées, révoquer les
  sessions temporaires et vérifier l'absence de livraison résiduelle.
- Le provisionneur n'offre aucune suppression. Toute suppression nécessiterait
  une autorisation distincte.

## Registre des blocages

| Blocage | État | Fermeture attendue |
| --- | --- | --- |
| Dry-run PostgreSQL production | EN ATTENTE | Fusion autorisée du workflow puis exécution protégée |
| Collisions réelles | EN ATTENTE | `collisionCheck=PASS` du dry-run |
| Deux acteurs réellement habilités | EN ATTENTE | Inventaire des permissions; aucune attribution automatique |
| Tarifs runtime exacts | EN ATTENTE | Calcul `PASS` avec tarifs contractuels configurés |
| Authentification API Brevo | NOT_VERIFIED | Appel non transactionnel gouverné, sans message |
| Destinataire personnel | ABSENT PAR CONCEPTION | Consentement et autorisation distincte |
| Simulation PostgreSQL/API/Chrome du programme créé | EN ATTENTE | Après autorisation de provisionnement |

## Verdicts actuels

| Domaine | Verdict |
| --- | --- |
| Infrastructure | GO |
| Gouvernance du code | GO |
| Point d'entrée dry-run | GO POUR REVUE |
| Provisionnement production | NO-GO AVANT DRY-RUN ET AUTORISATION |
| Fournisseur | PARTIAL / AUTHENTIFICATION API NOT_VERIFIED |
| Budget | GO CODE / RUNTIME EN ATTENTE |
| Destinataire | NO-GO, NON ENREGISTRÉ |
| Simulation locale | GO SUR LES PREUVES #211/#212 |
| Essai réel | NO-GO |

Le verdict `READY_FOR_CONTROLLED_LIVE_TEST` n'est pas attribué tant que les
blocages ci-dessus ne sont pas démontrés fermés.
