# Multitenant

L’autorité utilisateur exige organisation identique et affectation bâtiment. Zones, emplacements, appareils, publications, incident, commande, livraison, outbox et escalade sont tous bornés par organisation/bâtiment.

Les triggers PostgreSQL refusent les incohérences de portée dénormalisée. Les tests cryptographiques refusent organisation, bâtiment et appareil étrangers. La matrice à trois organisations est couverte par tests négatifs unitaires et contraintes; un E2E HTTP complet à trois tenants reste à ajouter à la CI.
