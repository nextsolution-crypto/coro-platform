# SP-OPS-02 — Préparation du futur essai réel

## Verdict actuel

**NO-GO — READY_WITH_CONDITIONS.** Aucun fournisseur n’a été invoqué et aucune donnée personnelle n’est inscrite dans Git.

## Protocole préparé

Avant une campagne distincte, toutes les conditions suivantes devront être réunies :

1. autorisation écrite précisant un seul essai, le budget et les critères d’arrêt;
2. propriétaire CORO identifié et authentifié hors dépôt;
3. une adresse vérifiée et un numéro mobile canadien vérifié, stockés dans le mécanisme de secrets;
4. allowlist serveur liée au tenant, au programme, à l’identité et à des empreintes normalisées des deux destinations;
5. type obligatoire `TEST`, préfixe bilingue `EXERCICE / TEST` et aperçu humain final;
6. double approbation explicite et distincte du préparateur;
7. préflight garantissant exactement un destinataire et au plus un SMS et un courriel;
8. clé d’idempotence persistante, reprise sans second envoi et reconciliation fournisseur;
9. TFN Brevo vérifié comme approuvé avant le SMS;
10. bouton d’arrêt, état PAUSED/BLOCK prioritaire et runbook de remise en état;
11. audit des statuts acceptation, livraison, échec et absence de réception, sans secrets;
12. retrait immédiat de l’allowlist après la campagne.

## Condition bloquante

Le lot prépare le protocole mais n’implémente ni n’active une allowlist contenant une destination réelle. Le test réel reste interdit jusqu’à un changement séparé, testé en QA, revu et explicitement autorisé.
