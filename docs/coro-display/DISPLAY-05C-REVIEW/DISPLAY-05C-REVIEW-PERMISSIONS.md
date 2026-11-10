# Permissions

Les huit capacités restent distinctes : `READ`, `QUALIFY`, `ASSIGN`, `DECIDE`, `RESPOND`, `RESOLVE`, `CLOSE`, `AUDIT_READ`. Chaque opération vérifie l’organisation active, la permission explicite et un périmètre de bâtiments non vide. Aucun héritage de rôle implicite n’a été ajouté.

Correction : le périmètre est maintenant recalculé avant tout rejeu idempotent. Une clé connue ne permet donc plus de relire une observation après révocation d’accès. Les champs réservés au serveur sont refusés par un `ValidationPipe` strict (`whitelist` et `forbidNonWhitelisted`).

Preuves : tests unitaires de révocation et de mass assignment; test PostgreSQL d’utilisateur lecture seule et de retrait du bâtiment.
