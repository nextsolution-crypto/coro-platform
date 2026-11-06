# SP-OPS-04A-FIX — Rapport technique

Date : 2026-11-05  
Base produit : `98a7de977935c9cfea41fc3333998df02ceb341b`  
Référence audit : `44f69bbf1c78938619794ea590ab4e24bdd11cbc`  
Branche : `fix/sentinelle-population-sp-ops-04a`

## Résultat

Le raccordement Docker Compose et le verrou d'expéditeur du test contrôlé sont corrigés. Le mode demeure désactivé et arrêté par défaut. Aucun secret, destinataire réel, SMS ou courriel réel n'a été utilisé.

## Correction

- Toutes les variables SP-OPS-03 nécessaires au backend sont maintenant déclarées dans `docker-compose.yml`.
- Les valeurs par défaut sont `ENABLED=false`, `STOP=true`, attestations fournisseur à `false` et identifiants/empreintes vides.
- `.env.example` documente les variables sans valeur confidentielle.
- La CI vérifie la configuration par défaut et la propagation d'une configuration entièrement synthétique jusqu'au processus backend.
- Le test contrôlé canadien exige exactement l'expéditeur E.164 approuvé `+18335886812`.
- L'expéditeur est revalidé dans le transport, sur la valeur placée dans le corps de la requête Brevo, immédiatement avant l'appel externe.
- Les expéditeurs absent, `CORO` ou différents sont refusés sans appel fournisseur.
- Le repli historique `CORO` reste limité aux autres usages SMS existants; il est impossible dans l'opération contrôlée.

## Contrôles de sécurité

Les scénarios demandés sont couverts par les tests SP-OPS-03 existants et les nouvelles non-régressions :

1. expéditeur conforme et réellement transmis;
2. expéditeur absent;
3. expéditeur `CORO`;
4. autre expéditeur;
5. variables Compose absentes avec valeurs sûres;
6. TFN non attesté;
7. organisation incorrecte;
8. programme incorrect;
9. destination hors allowlist;
10. double approbation invalide;
11. PAUSED/BLOCK;
12. STOP;
13. répétition/idempotence;
14. changement concurrent avant transport;
15. secret fournisseur absent.

Tous les refus liés au transport sont vérifiés avant `fetch`. PAUSED/BLOCK et la politique Démo sont évalués avant l'accès au transport. STOP et la campagne canonique sont relus par l'orchestrateur SP-OPS-03 avant diffusion.

## Validation locale

- Tests ciblés sécurité/transport/webhooks : **83/83 PASS**.
- TypeScript : **PASS**.
- Build backend : **PASS**.
- Contrat Compose, valeurs par défaut : **PASS** (`CONTROLLED_LIVE_COMPOSE=DEFAULTS_SAFE`).
- Contrat Compose, propagation synthétique : **PASS** (`CONTROLLED_LIVE_COMPOSE=CONFIGURED_PROPAGATED`).
- Suite backend : **2507 PASS, 5 SKIPPED**; deux suites initialement limitées par l'interdiction de sous-processus du bac à sable.
- Reprise hors bac à sable : la suite AWS `credential_process` et les tests Office passent, sauf un test OCR indépendant nécessitant `pdftoppm`, absent de l'hôte Windows.
- `git diff --check` : **PASS**.
- Recherche de secrets/coordonnées personnelles introduits : **aucun résultat**. Les seules empreintes de CI sont synthétiques.

## Dépendances

`npm audit --audit-level=high` relève 30 avis existants (4 faibles, 23 modérés, 3 élevés) dans l'outillage Nest/Jest/Prisma. Les corrections proposées imposent des mises à niveau majeures (`--force`). Aucun paquet n'est ajouté ou modifié par ce lot; la dette reste à traiter séparément et n'est pas masquée.

## Qualification fournisseur

Confirmé par le fournisseur, sans preuve de connectivité CORO :

- TFN approuvé;
- SMS transactionnels annoncés vers le Canada et les États-Unis;
- expéditeur requis `+18335886812`;
- capacité bidirectionnelle annoncée.

Restent `NOT_VERIFIED` dans ce lot : clé API réellement utilisable depuis CORO, expéditeur courriel actif, webhooks accessibles/authentifiés en conditions réelles, crédits et tarifs.

## Verdicts

- Préparation du code : **GO**, sous réserve de la CI terminale de la PR.
- Préparation du déploiement : **NO-GO** tant que la PR n'est ni revue ni autorisée à fusionner et que la configuration hors Git n'est pas validée.
- Configuration fournisseur : **NO-GO** pour un appel réel; attestations TFN acquises, connectivité et éléments restants `NOT_VERIFIED`.
- Premier essai réel : **NO-GO**. Il exige une autorisation distincte SP-OPS-04B après vérification de la configuration et du destinataire.

Ce lot n'autorise ni fusion, ni déploiement, ni activation LIVE, ni communication réelle.
