# Sécurité des observations

## Contrat

Organisation, client, auteur, statut, versions, empreinte et référence d’audit sont définis côté serveur. La ValidationPipe refuse les champs non déclarés. La description est limitée à 10–4000 caractères après trim, sans balises ni contrôles; les coordonnées sont couplées et bornées à `[0,1]`.

## Immutabilité

La migration de revue interdit UPDATE sur l’identité documentaire et DELETE sur l’observation. Les événements sont append-only. Seuls statut, réponse client, dates de résolution/fermeture, verrou et date de mise à jour restent disponibles pour DISPLAY-05C.

## Concurrence

La clé `(submittedByClientUserId, submissionRequestId)` et la récupération après `P2002` rendent deux soumissions simultanées idempotentes. Test PostgreSQL : 1 observation et 1 événement.
