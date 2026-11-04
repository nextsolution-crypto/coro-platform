# Passation de livraison CORO Démo

## État actuel réconcilié au 4 novembre 2026

- Candidat applicatif actif : `b2d06dafd83d7d15a7f2c5c15a520755c9ad90e0`.
- Outillage gouverné de collecte d'évidence fusionné jusqu'à `6e1da1e2f08761e211bb8eff4c169d810f90a1d2` sans seconde release applicative.
- Cible verrouillée : `916f54ec-af22-45e0-99db-a369d9630002`.
- Données Prémont préservées.
- Migration additive validée depuis zéro et depuis la tête précédente sur PostgreSQL 16 QA.
- Garde des communications en développement local.
- Manifeste et outillage de première tranche créés; idempotence, concurrence, autre tenant et reset ciblé validés localement.
- Release applicative : workflow `41833078550`, inspection `41835514721`, migration `20261122010000_demo_environment_governance` appliquée.
- Provisionnement : dry-run `41841686707`, préparation `41842041001`, vérification `41842381006`.
- Inventaire en lecture seule après préparation : `41842914129`; 3 clients, 6 bâtiments, 12 projets, 9 incidents et 3 actions dans le tenant, incluant les données préexistantes conservées.
- Les 40 nouvelles fixtures sont actives; communications `SIMULATE`, fournisseurs externes désactivés.
- Documents privés et Knowledge : release `41857007049`, inspection `41859825671`, provisionnement réconcilié puis vérification indépendante `41863006419`. Deux ProjectFile privés sont enregistrés; v1 est remplacée, v2 est la version courante approuvée et indexée. Téléchargement privé, octets/SHA-256, citation/version/provenance, fraîcheur et refus inter-tenant sont démontrés.

## Prochaine action concrète

Recueillir en une seule fois trois adresses distinctes réellement livrables, puis créer et activer par les parcours produit normaux les comptes Conseiller interne, Responsable client et Gestionnaire de bâtiment. Mathieu doit choisir les mots de passe et compléter le MFA. La recette vérifiera ensuite les périmètres et refus hors périmètre. Les invitations à ces trois adresses constituent la seule exception de communication réelle autorisée; toute autre communication Démo demeure simulée.

## Blocages/limites

- Comptes permanents multirôles non activés; MFA local QA non transféré en production.
- Ouverture navigateur des documents et citations sous les futurs comptes permanents encore en attente de leur activation; la preuve serveur livrée est complète mais ne remplace pas cette recette multirôle.
- PR #186 REX reste indépendante et ne doit pas être contournée.
- Chrome 12/12 exécuté dans le QA Identity Lab; recette multirôle de l'environnement livré en attente des comptes permanents.

Verdict provisoire : `DEMO_PROVISIONED_ACCOUNT_ACCEPTANCE_PENDING`.
