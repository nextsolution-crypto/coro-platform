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

Le NO-GO réel sera levable uniquement après preuve du TFN, de l'expéditeur, des webhooks, du tarif, de la configuration hors Git et après une autorisation finale distincte portant sur le message et le destinataire masqué.
