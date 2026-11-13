# Rollback

1. Acquérir le verrou de déploiement et arrêter la progression.
2. Désactiver l'accès Display/DNS si activé; révoquer l'appareil et la fixture Démo seulement par leurs identifiants externes.
3. Réappliquer les quatre digests rollback protégés (backend, frontend, portail, website).
4. Vérifier santé, SHA, PostgreSQL et routes non-Display.
5. Conserver les 11 migrations additives; ne supprimer aucune table/colonne.
6. Si une incompatibilité de données apparaît, restaurer uniquement vers une nouvelle base isolée et soumettre un cutover distinct.

Seuils : erreur critique d'auth/multitenant, migrations incomplètes, service malsain, publication hors portée, révocation inefficace ou taux HTTP 5xx soutenu. La disponibilité des images est démontrée; un rollback de données en place n'est pas promis.
