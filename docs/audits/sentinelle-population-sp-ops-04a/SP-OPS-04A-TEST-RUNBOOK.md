# SP-OPS-04A — Runbook proposé pour SP-OPS-04B

Ce runbook est préparatoire. **Il ne constitue pas une autorisation d'envoi.**

## Scénario

`Usine Démo Nord — Rejet simulé d'ammoniac`

Toutes les données, zones et personnes sont fictives. Les données Sobeys ne sont associées à aucun bâtiment réel.

## Message proposé

SMS :

> EXERCICE / TEST CORO — AUCUNE URGENCE RÉELLE. Vérification technique Sentinelle Population. Aucune mesure de protection à appliquer. Ne répondez pas sauf instruction du protocole de test.

Objet courriel :

> EXERCICE / TEST CORO — AUCUNE URGENCE RÉELLE

Corps :

> Ceci est une vérification technique contrôlée de Sentinelle Population. Il ne s'agit pas d'une urgence. Aucune évacuation, mise à l'abri ou autre mesure de protection ne doit être appliquée. Cette campagne est limitée à un destinataire autorisé.

## Conditions préalables obligatoires

1. correctif Compose livré pour transmettre les variables SP-OPS-03;
2. TFN et sender courriel confirmés par Brevo;
3. webhooks enregistrés et testés avec HTTP 200;
4. crédits et coût total démontrés, maximum 1,00 CAD;
5. destinataire et consentement stockés hors Git;
6. `PAUSED/BLOCK/STOP` testés avant la campagne;
7. double approbation par deux identités distinctes;
8. sauvegarde, capacité, rollback et verrou de déploiement sains;
9. autorisation humaine distincte contenant le message exact et la destination masquée.

## Exécution future

1. confirmer `TEST`, le tenant et le programme exacts;
2. créer l'incident fictif et importer les données scientifiques synthétiques;
3. calculer la zone et la population fictive;
4. geler l'unique destinataire;
5. afficher destinations masquées, messages et coût maximal;
6. recueillir deux approbations indépendantes;
7. relire PAUSED/BLOCK/STOP et les relations canoniques;
8. effectuer au maximum un appel courriel et un appel SMS;
9. ne jamais relancer automatiquement un résultat ambigu;
10. réconcilier acceptation, livraison et réception humaine;
11. remettre `STOP=true`, désactiver le mode contrôlé et vérifier l'absence de campagne réutilisable.

## Arrêt

- Avant fournisseur : `STOP=true` doit rendre toute livraison impossible.
- Après acceptation fournisseur : aucun rappel n'est possible; conserver la preuve et attendre la réconciliation.
- Résultat inconnu : aucune seconde tentative sans décision humaine explicite.

## Budget

Plafond applicatif : 100 cents CAD. Le coût fournisseur réel reste **NOT_VERIFIED** et doit être relevé dans Brevo avant l'autorisation.
