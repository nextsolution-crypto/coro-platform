# Lot de correction consolidé Timelog

## Ordre recommandé

1. **Intégrité serveur** : DTO, bornes, date civile, catégorie tenant, notes, retours 404/409; tests PostgreSQL à deux organisations.
2. **Concurrence et idempotence** : version optimiste, création idempotente, suppression/mise à jour concurrentes, réponse perdue.
3. **UX d'erreur et reprise** : messages accessibles, formulaire préservé, retry contrôlé, annulation de requêtes obsolètes.
4. **Clarté** : expliquer heures générales non facturables versus heures de tâche/projet; afficher période et unité; liens projet/activité.
5. **Acceptation** : jeu synthétique multi-périodes, totaux exacts/DST, permissions multi-tenant, capacité, puis matrice Chrome 12/12 et zoom 200 %.

## Décisions nécessaires

- bornes/incrément/précision de durée;
- politique des dates futures et correction historique;
- chevauchements autorisés ou signalés;
- sémantique commerciale du libellé « facturable »;
- conservation/audit des suppressions (suppression physique actuelle).

Ce lot ne crée ni chronomètre, ni export, ni validation de feuille de temps : ces fonctions sont absentes et hors audit.
