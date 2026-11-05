# SP-OPS-03 — Implémentation de l'essai réel contrôlé

## Architecture

`PopulationControlledLiveTestService` complète, sans remplacer, les autorisations Population existantes. Il est inactif par défaut et ne s'applique qu'au couple organisation/programme configuré hors Git.

Le chemin conserve : incident/scénario scientifique, zone approuvée, population, brouillon, READY, approbation indépendante, gel du roster, preflight LIVE, claim atomique, transport, webhooks et réconciliation.

## Invariants ajoutés

- type canonique `TEST`;
- titre français commençant par `EXERCICE / TEST` et anglais, s'il existe, par `EXERCISE / TEST`;
- mode `DUAL_CONTROL` et approbateur distinct du créateur;
- exactement un abonné, un SMS et un courriel;
- destinations comparées à deux SHA-256 configurés hors Git;
- organisation et programme exacts;
- budget configuré de 1 à 500 cents CAD;
- expéditeur courriel explicitement attesté;
- TFN et transport SMS explicitement attestés;
- webhooks courriel et SMS configurés;
- arrêt prioritaire par `POPULATION_CONTROLLED_LIVE_TEST_STOP=true`;
- revalidation immédiatement avant la mutation de tentative fournisseur;
- opération transport dédiée `POPULATION_CONTROLLED_LIVE_TEST`.

Le preflight retourne uniquement des destinations masquées. Le portail les affiche avec le message final et les compteurs. Aucune valeur brute n'est ajoutée aux logs ou rapports.

## Configuration hors Git

Variables requises au moment de l'essai :

- `POPULATION_CONTROLLED_LIVE_TEST_ENABLED`
- `POPULATION_CONTROLLED_LIVE_TEST_STOP`
- `POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID`
- `POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID`
- `POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256`
- `POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256`
- `POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS`
- `POPULATION_BREVO_EMAIL_SENDER_VERIFIED`
- `POPULATION_SMS_TFN_APPROVED`

Les secrets Brevo et webhooks existants restent gouvernés par le mécanisme de production. Aucune valeur n'est fournie dans ce dépôt.

## Arrêt

Le premier arrêt est `POPULATION_CONTROLLED_LIVE_TEST_STOP=true`. La suspension du programme reste disponible et PAUSED/BLOCK reste prioritaire dans la politique Démo. Une alerte déjà acceptée par un fournisseur n'est pas rappelable; les webhooks et la réconciliation conservent alors la preuve de son résultat.

## Renforcement SP-OPS-03C

L'opération `POPULATION_CONTROLLED_LIVE_TEST` est désormais un libellé de transport, jamais une capacité autonome. Le worker transmet les identifiants du programme, de l'alerte et de la livraison seulement après les gardes Population. La politique Démo relit ensuite ces objets et leurs relations canoniques depuis PostgreSQL au seuil du transport.

Un autre appelant qui copie le nom d'opération, la destination ou même un identifiant isolé ne peut obtenir LIVE : tenant, programme, campagne, double approbation, roster, état de livraison, canal, destination et idempotence doivent tous concorder dans la même preuve serveur. Aucun jeton d'autorisation transmissible au navigateur et aucun nouveau secret n'ont été introduits.
