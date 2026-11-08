# Premier essai QA épinglé — ordre gouverné

Cette extension conserve `POPULATION_SMS_PRODUCTION_VALIDATED=false`. Elle ne qualifie pas la diffusion générale. Elle utilise exclusivement le transport, la politique Démo et le parcours d’approbation Population existants.

1. Faire réviser la base et approuver la zone fictive par B. Conserver le programme QA en SANDBOX. Vérifier un seul inscrit logique, ses deux canaux, son consentement et sa localisation dans la zone.
2. Par release gouvernée, configurer le programme, l’organisation, l’alerte exacte, les empreintes autorisées et une expiration absolue au plus une heure dans le futur. Conserver `ENABLED=false`, `STOP=true` et le flag SMS global false. Ne jamais consigner les destinations ou secrets dans Git.
3. Exécuter ARM dans l’opération administrative existante, sous environnement protégé et validation humaine. ARM vérifie les revues canoniques, les acteurs A/B et le destinataire sous verrous ; il ferme les inscriptions et prépare uniquement ce programme en LIVE. Aucun fournisseur n’est appelé.
4. A actualise le brouillon et le passe READY après ARM ; B approuve l’alerte. Geler ensuite les destinataires dans le portail, toujours sous STOP. Toute modification invalidant les snapshots exige de reprendre leurs validations.
5. Lire dans le préflight les deux destinations masquées, les segments et le coût calculé côté serveur. Sous STOP, le verdict reste NO-GO. Ne pas interpréter la préparation comme une autorisation de transport.
6. Obtenir l’autorisation humaine finale distincte pour cette alerte, ce destinataire et ce coût. Une release gouvernée peut alors activer ENABLED et lever STOP, dans la fenêtre déjà autorisée. L’expiration ne se prolonge pas automatiquement. Une fenêtre expirée exige une nouvelle décision explicite ; aucune tentative consommée n’est remise à zéro.
7. Déclencher une seule fois par le portail. Chaque canal dispose d’une seule tentative fournisseur. Un résultat ambigu reste à réconcilier par événements/journaux et réception humaine ; aucune relance automatique ou manuelle de cette livraison.
8. Fermer immédiatement par SUSPEND existant ou DISARM administratif. DISARM fonctionne aussi après expiration et sous PAUSED/BLOCK, remet SANDBOX/SUSPENDED et ferme les canaux sans effacer snapshots ou livraisons. Une requête fournisseur déjà partie ne peut être rappelée.
9. Restaurer ensuite `ENABLED=false` et `STOP=true` par release gouvernée. Modifier seulement le fichier d’environnement ne ferme pas un processus déjà lancé. Le pin consommé et la tentative unique restent conservés.

## Validation

Les tests PostgreSQL dédiés n’appellent aucun fournisseur : `fetch` est remplacé par un mock. Ils exigent une base de test distincte via `TEST_DATABASE_URL` et vérifient concurrence, verrous, approbation, gel, STOP, expiration, PAUSED/BLOCK, fermeture et absence de seconde tentative ambiguë. Ne jamais les exécuter sur une base de production.
