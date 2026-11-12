# Identité et authentification appareil

L’enrôlement exige une invitation non expirée, une clé Ed25519 préattestée et une preuve de possession. La consommation est atomique et la réutilisation retourne 410.

Constat P0 corrigé : l’administration acceptait `PENDING_ENROLLMENT → ACTIVE`, ce qui contournait la preuve de possession. `administrativeTransitionAllowed` autorise désormais seulement les transitions gouvernées; un appareil suspendu peut être repris, un appareil terminal ne peut pas ressusciter et un appareil en attente ne peut pas être activé.

Preuve : `device-administration.service.spec.ts`, 7/7 tests PASS.
