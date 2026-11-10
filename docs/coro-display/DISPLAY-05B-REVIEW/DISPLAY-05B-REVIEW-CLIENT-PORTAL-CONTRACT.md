# Contrat portail client et préparation DISPLAY-05C

- `GET /client-portal/display` : plans paginés, autorité documentaire appliquée.
- `GET /client-portal/display/plans/:id/preview` : octets privés vérifiés.
- `GET /client-portal/display/buildings/:id/locations` : emplacements actifs autorisés.
- `POST /client-portal/display/observations` : contribution idempotente.
- `GET /client-portal/display/observations` : page limitée au seul auteur V1.

DISPLAY-05C doit réutiliser `DisplayCorrectionObservation` et ses événements, mettre à jour uniquement les champs de traitement autorisés avec verrou optimiste, et ajouter attribution/historique sans dupliquer l’autorité. Les pièces jointes demeurent désactivées; une future activation exige stockage privé, validation, analyse, rétention, permissions et audit.
