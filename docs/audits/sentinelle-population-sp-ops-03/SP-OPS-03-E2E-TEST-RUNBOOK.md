# SP-OPS-03 — Runbook du premier essai réel

## Préconditions

1. Déployer séparément SP-OPS-02 puis le correctif SP-OPS-03 après leurs autorisations et gates.
2. Confirmer l'organisation, le programme et le propriétaire sans inscrire ses coordonnées en Git.
3. Calculer localement les SHA-256 normalisés du courriel et du mobile, puis les injecter par le gestionnaire de secrets.
4. Confirmer l'expéditeur courriel, le TFN, les webhooks et le prix Brevo.
5. Régler le plafond à 100 cents CAD et `STOP=true` pendant la préparation.
6. Vérifier PAUSED/BLOCK, sauvegarde, restauration et rollback.

## Scénario fictif

Établissement : **Usine Démo Nord**, entièrement fictif. Substance : ammoniac. Le dossier scientifique, les zones et la population sont synthétiques; aucune donnée Sobeys n'est rattachée à un bâtiment réel.

Message proposé :

> EXERCICE / TEST CORO — Rejet fictif d'ammoniac à l'Usine Démo Nord. Ceci est un test, aucune urgence réelle. Pour cet exercice, mettez-vous à l'abri, fermez portes et fenêtres et attendez la fin du test.

Objet courriel proposé : `EXERCICE / TEST — Sentinelle Population CORO`.

## Exécution autorisable ultérieurement

1. Préparer le brouillon TEST et vérifier les données scientifiques/zone.
2. Créateur A passe READY.
3. Approbateur B distinct approuve.
4. Figer le roster et constater exactement 1 personne, 1 SMS, 1 courriel.
5. Vérifier le message et les deux destinations masquées dans le preflight.
6. Exécuter d'abord SANDBOX et conserver le journal.
7. Obtenir l'autorisation finale d'envoi.
8. Lever `STOP`, déclencher une seule fois et ne jamais relancer un résultat ambigu.
9. Réconcilier acceptation fournisseur, webhook, livraison et réception humaine séparément.
10. Remettre immédiatement `STOP=true`, puis PAUSED/BLOCK selon la décision de clôture.

## Interruption/reprise

En cas d'erreur avant appel fournisseur : conserver STOP et corriger sans nouvel envoi. Après début d'appel : ne pas réessayer; attendre la réconciliation. Le journal des livraisons, la clé d'idempotence, les événements webhook et les traces d'approbation constituent l'autorité.
