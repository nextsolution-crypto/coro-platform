# Multitenant

## Preuves

L'E2E a créé trois organisations synthétiques et vérifié que le device, l'affectation, la publication, le rendu, la confirmation et le heartbeat restent liés aux IDs organisation/bâtiment/emplacement. Les contraintes composites et tests PostgreSQL refusent les croisements.

## Résultat

Enrôlement, manifestes, rendus, confirmations et supervision: PASS dans le périmètre testé. Journal local et événements réconciliés héritent du device authentifié, sans organisation fournie par le client.

## Réserve

Une compromission de clé reste une compromission du device et nécessite révocation serveur; le registre local anti-rollback reste insuffisant.
