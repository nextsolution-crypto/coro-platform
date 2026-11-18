# CORO-RP-CLIENT-01C — contrat de sécurité

- Autorité: `request.coroAuthority`, construite uniquement par
  `ClientJwtGuard` après validation du type de jeton, de la version de session,
  de l'identité, du client et de l'organisation actifs.
- Portée: permission explicite et affectation bâtiment active et temporellement
  valide, relues côté serveur à chaque opération.
- Provenance: écritures `CLIENT_USER` dans le registre canonique et les preuves
  métier; aucun `User` technique de substitution.
- Confidentialité: les refus hors tenant/bâtiment utilisent une réponse
  non-divulgatrice `NotFound`.
- Fichiers: stockage privé, validation binaire, antivirus fail-closed,
  téléchargement autorisé et `no-store` restent fournis par les services Report.
- Concurrence: idempotence, transactions sérialisables, lock versions,
  séparation auteur/approbateur et exécutant/vérificateur restent dans les
  services partagés.
- Activation: les cinq flags demeurent désactivés par défaut. CLIENT-01D devra
  ajouter les entitlements par client avant toute activation commerciale.

Rollback applicatif: restaurer l'image précédente. Ce lot ne contient aucune
migration ni transformation de données.
