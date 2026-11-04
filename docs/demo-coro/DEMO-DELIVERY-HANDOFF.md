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

Les transports principaux sont protégés et la migration, l'idempotence, la concurrence, l'échec atomique et le reset sont démontrés sur PostgreSQL 16. Les fixtures Activités/Planning et TimeLog/Rendement sont maintenant incluses. Il reste à qualifier les documents/Knowledge et les modules opérationnels, puis à exécuter les parcours API et navigateur avant toute PR de livraison.

## Blocages/limites

- MFA Démo utilisable sans envoi réel non finalisé.
- Documents, stockage privé, Knowledge et indicateurs non provisionnés.
- PR #186 REX reste indépendante et ne doit pas être contournée.
- Chrome 12/12 non exécuté.

Verdict provisoire : `DEMO_PARTIAL`.
