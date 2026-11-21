# Runbook d'exécution préparé

1. Geler le SHA `5ae7cd21`, vérifier CI et absence de release concurrente.
2. Acquérir le verrou; inspection, capacité et sauvegarde fraîche.
3. Restaurer la sauvegarde isolément et vérifier intégrité/176 migrations.
4. Construire/publier les quatre images par workflow; figer les digests registre.
5. Rejouer scan, manifeste et compatibilité; NO-GO si une preuve diverge.
6. Appliquer les 11 migrations dans la fenêtre gouvernée.
7. Déployer backend puis frontend, portail et site du même SHA.
8. Inspecter services, PostgreSQL=187, SHA/digests et routes non-Display.
9. Configurer DNS/TLS seulement avec cible fournisseur approuvée; smoke `/d`.
10. Résoudre le bâtiment canonique en lecture seule; exiger une correspondance.
11. Créer la fixture idempotente, publier V1, tester portail/Player.
12. Activer l'iPad `WEB_VIEW_ONLY`, synchroniser, publier V2, vérifier remplacement puis révocation.
13. Réconcilier et produire le rapport; retirer la fixture si le pilote échoue.

Ce runbook n'est pas une autorisation d'exécution.
