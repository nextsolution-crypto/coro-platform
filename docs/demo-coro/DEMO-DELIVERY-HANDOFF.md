# Passation de livraison CORO Démo

## État actuel

- Branche : `feature/demo-coro-complete`.
- Cible verrouillée : `916f54ec-af22-45e0-99db-a369d9630002`.
- Données Prémont préservées.
- Migration additive validée depuis zéro et depuis la tête précédente sur PostgreSQL 16 QA.
- Garde des communications en développement local.
- Manifeste et outillage de première tranche créés; idempotence, concurrence, autre tenant et reset ciblé validés localement.
- Aucun provisionnement, aucune migration et aucune release de production.

## Prochaine action concrète

Terminer l'inventaire de tous les transports et workers, tester la migration et l'outil sur PostgreSQL réel, enrichir les fixtures par services métier, puis exécuter les parcours navigateur. Une PR ne sera ouverte que sur un candidat local qualifié.

## Blocages/limites

- MFA Démo utilisable sans envoi réel non finalisé.
- Documents, stockage privé, Knowledge et indicateurs non provisionnés.
- PR #186 REX reste indépendante et ne doit pas être contournée.
- Chrome 12/12 non exécuté.

Verdict provisoire : `DEMO_PARTIAL`.
