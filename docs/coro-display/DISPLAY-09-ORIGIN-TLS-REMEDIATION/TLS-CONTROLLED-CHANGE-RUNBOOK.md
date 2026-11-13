# Runbook de changement contrôlé

1. Confirmer l'autorisation phase B et la fenêtre.
2. Capturer état, empreintes, listeners et santé.
3. Vérifier sauvegarde et rollback.
4. Valider hors ligne certificat, clé correspondante, chaîne et SAN.
5. Installer le vhost séparé; valider la syntaxe.
6. Recharger uniquement le terminateur.
7. Tester les cinq SNI, les services et le Player.
8. Vérifier logs et sessions.
9. Au premier P0 FAIL, appliquer le rollback préparé.

Aucune étape de ce runbook n'a été exécutée en production.
