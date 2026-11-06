# SP-OPS-04B-GOV-FIX — Rapport technique

## Périmètre

Ce lot prépare un programme d'essai Sentinelle Population isolé. Il ne crée
aucune ressource en production, n'enregistre aucun destinataire et n'autorise
aucune diffusion réelle.

## Provisionnement gouverné

L'outil `admin:population-controlled-test-setup` est verrouillé sur :

- l'organisation CORO Démo canonique;
- l'environnement logique `CORO_DEMO_SP_OPS_04B`;
- un identifiant de bâtiment et un slug déterministes;
- un client explicitement répété dans l'allowlist d'exécution;
- un administrateur interne actif du tenant, conservé dans l'audit.

Le précontrôle et la transaction vérifient de nouveau l'organisation, le
client, l'administrateur et toutes les collisions. Un verrou consultatif
PostgreSQL et une transaction `Serializable` rendent les reprises et les
exécutions concurrentes idempotentes. Les objets existants ne sont jamais
mis à jour : un écart avec la définition gérée provoque un refus.

Le résultat attendu est un bâtiment fictif, un profil RUE fictif, un scénario
TEST, une zone fictive et un programme `CONFIGURING / SANDBOX / DUAL_CONTROL`.
L'inscription et les canaux SMS/courriel sont désactivés et aucun abonné n'est
créé.

## Contrôle budgétaire

Le garde du test contrôlé estime le coût à partir des messages figés dans les
livraisons :

- segmentation GSM-7 à 160 caractères, puis 153 par segment concaténé;
- caractères d'extension GSM-7 comptés pour deux septets;
- UCS-2 à 70 unités UTF-16, puis 67 par segment concaténé;
- un tarif canadien par segment SMS obligatoire;
- un tarif transactionnel par courriel obligatoire;
- un plafond configuré compris entre 1 et 100 cents CAD.

Les calculs utilisent des micros de dollar canadien pour éviter les arrondis
flottants. Tarif absent, invalide, estimation impossible ou dépassement du
plafond : refus avant transport. La même estimation est rejouée au dernier
garde de politique avant l'appel fournisseur.

Ce plafond est une autorité applicative pré-envoi, pas une garantie de la
facture finale du fournisseur (taxes, arrondis et variations contractuelles
peuvent demeurer externes à CORO).

## Approbation

Le modèle existant `DUAL_CONTROL` est conservé : le créateur ne peut pas
approuver son brouillon, l'approbateur est persisté dans `approvedBy*` et
`approvedAt`, et une mise à jour concurrente utilise une comparaison atomique.
Après passage à `READY`, le brouillon ne peut plus être modifié; une nouvelle
version doit reprendre le cycle. L'approbation ne crée aucune livraison et ne
déclenche aucun fournisseur.

## Résultats locaux

- TypeScript : PASS.
- Build NestJS : PASS.
- Tests ciblés Population/sécurité : 382 PASS.
- Tests PostgreSQL provisionnement/événements/livraison : 29 PASS.
- Chaîne de 173 migrations depuis zéro : PASS.
- Suite backend : 273 suites PASS, 2 suites bloquées localement par les
  dépendances de sous-processus; la suite Bedrock repasse hors sandbox, et un
  test OCR demeure dépendant de `pdftoppm` absent du poste. Ces suites sont
  étrangères au lot et doivent être tranchées par la CI Linux.
- Audit dépendances de production : 0 vulnérabilité.
- Docker Compose : les deux tarifs sont transmis au backend; aucune valeur ni
  aucun secret n'est inscrit dans le dépôt.

## Sécurité

PAUSED/BLOCK/STOP, l'allowlist organisation/programme/destinations, le TFN,
les secrets webhook, l'unicité du destinataire, la double autorité et
l'idempotence restent des conditions cumulatives. Ce lot ne modifie aucun
secret, aucune allowlist réelle et aucune valeur de production.
