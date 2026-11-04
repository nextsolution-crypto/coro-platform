# Passation de livraison CORO Démo

## État actuel réconcilié au 4 novembre 2026

- Candidat applicatif actif : `6c5ad09ddd818512dcccfc18f8ec63cf1651ec19`.
- Outillage gouverné de fixtures fusionné jusqu'à `88c4250653473878a1b68565c38d4354f1b63b68` sans seconde release applicative.
- Cible verrouillée : `916f54ec-af22-45e0-99db-a369d9630002`.
- Données Prémont préservées.
- Migration additive validée depuis zéro et depuis la tête précédente sur PostgreSQL 16 QA.
- Garde des communications en développement local.
- Manifeste et outillage de première tranche créés; idempotence, concurrence, autre tenant et reset ciblé validés localement.
- Release applicative : workflow `41833078550`, inspection `41835514721`, migration `20261122010000_demo_environment_governance` appliquée.
- Provisionnement : dry-run `41841686707`, préparation `41842041001`, vérification `41842381006`.
- Inventaire en lecture seule après préparation : `41842914129`; 3 clients, 6 bâtiments, 12 projets, 9 incidents et 3 actions dans le tenant, incluant les données préexistantes conservées.
- Les 40 nouvelles fixtures sont actives; communications `SIMULATE`, fournisseurs externes désactivés.

## Prochaine action concrète

Recueillir en une seule fois trois adresses distinctes réellement livrables, puis créer et activer par les parcours produit normaux les comptes Conseiller interne, Responsable client et Gestionnaire de bâtiment. Mathieu doit choisir les mots de passe et compléter le MFA. La recette vérifiera ensuite les périmètres et refus hors périmètre. En parallèle, le provisionnement livré des documents privés et de leurs sources Knowledge reste à réaliser par les autorités documentaires normales; aucune ligne ProjectFile approuvée ne doit être fabriquée par SQL.

## Blocages/limites

- Comptes permanents multirôles non activés; MFA local QA non transféré en production.
- Documents et Knowledge non provisionnés dans le tenant livré (`files: 0`), malgré leur acceptation QA intégrée.
- PR #186 REX reste indépendante et ne doit pas être contournée.
- Chrome 12/12 exécuté dans le QA Identity Lab; recette multirôle de l'environnement livré en attente des comptes permanents.

Verdict provisoire : `DEMO_PROVISIONED_ACCOUNT_ACCEPTANCE_PENDING`.
