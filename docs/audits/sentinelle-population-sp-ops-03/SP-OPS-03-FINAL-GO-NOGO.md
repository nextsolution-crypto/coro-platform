# SP-OPS-03 — Verdict final GO/NO-GO

## Livrables

Les six livrables sont produits. Le mode contrôlé est implémenté sur la branche isolée `feature/sentinelle-population-sp-ops-03`. Aucun secret ou destinataire réel n'est enregistré. Aucun envoi, fusion ou déploiement n'a été effectué.

## Dossier d'acceptation

1. Tests : 350 contrôles consolidés PASS; TypeScript, builds et audits des dépendances de production PASS.
2. Fournisseur configuré par le produit : Brevo, courriel transactionnel et SMS transactionnel.
3. Allowlist : organisation + programme + deux SHA-256, revalidés avant appel.
4. TFN : **NOT_VERIFIED**, donc SMS bloqué.
5. Destinataire : **non configuré dans Git**; seul son masque sera exposé par le preflight.
6. Message : celui du runbook, explicitement EXERCICE / TEST.
7. Budget maximal proposé : 1,00 CAD; prix contractuel à confirmer.
8. Autorisations : double contrôle requis; autorisation réelle d'envoi non accordée.
9. Arrêt : variable STOP, suspension programme, puis PAUSED/BLOCK.
10. Retour : STOP=true et PAUSED/BLOCK sans suppression des journaux.

## Verdicts distincts

- PR #208 : **GO POUR FUSION**, en attente d'autorisation explicite.
- Déploiement #208 : **GO CONDITIONNEL** aux gates du SHA fusionné.
- Implémentation SP-OPS-03 : **READY_FOR_REVIEW**.
- Premier envoi réel : **NO-GO**.

## Verdict SP-OPS-03B avant PR

- baseline SP-OPS-02 déployée : `c255fd6650ae38465f2f28c1e240035287a9e3c9`;
- candidat SP-OPS-03 réconcilié : prêt pour publication et CI;
- fusion et déploiement SP-OPS-03 : **NON AUTORISÉS** dans ce lot;
- communication réelle, activation LIVE, secrets et allowlist de production : **INCHANGÉS / NON EXÉCUTÉS**;
- verdict de préparation : **GO POUR PR ET REVUE**;
- verdict d'essai réel : **NO-GO** jusqu'à levée des conditions Brevo et autorisation distincte.

## Publication pour revue

- PR : #209;
- base : `c255fd6650ae38465f2f28c1e240035287a9e3c9`;
- contrôles CI du premier HEAD publié : PASS;
- état autorisé : PR ouverte pour revue, sans fusion et sans déploiement.

Le NO-GO réel sera levable uniquement après preuve du TFN, de l'expéditeur, des webhooks, du tarif, de la configuration hors Git et après une autorisation finale distincte portant sur le message et le destinataire masqué.

## Verdict de sécurité SP-OPS-03C

- réserve de l'opération usurpable : **CORRIGÉE ET TESTÉE LOCALEMENT**;
- preuve canonique programme/campagne/livraison au transport : **IMPLÉMENTÉE**;
- priorité PAUSED/BLOCK/STOP : **PRÉSERVÉE**;
- isolation des autres tenants et programmes : **PRÉSERVÉE**;
- appel fournisseur, SMS, courriel, LIVE, secret, fusion ou déploiement : **NON EXÉCUTÉS**;
- verdict pour revue de la PR #209 : **GO CONDITIONNEL À LA CI TERMINALE DU NOUVEAU HEAD**;
- verdict pour l'essai réel : **NO-GO INCHANGÉ**.
