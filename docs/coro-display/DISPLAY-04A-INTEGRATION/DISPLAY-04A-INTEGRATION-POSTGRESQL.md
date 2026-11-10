# DISPLAY-04A-INTEGRATION — PostgreSQL

PostgreSQL 16 Alpine jetable, base locale dédiée.

- 179 migrations depuis zéro : PASS.
- Upgrade exact de la tête pré-04A vers `20261201010000_display_pdf_render_jobs` : PASS.
- Réservation `FOR UPDATE SKIP LOCKED`, concurrence et idempotence : PASS, 3/3.
- Heartbeat, bail expiré, reprise et épuisement d’essais : PASS.
- Révocation pendant conversion et autorité revalidée en transaction : PASS.
- Publication concurrente contradictoire : refus par `lockVersion` et mise à jour conditionnelle.

Aucune base partagée n’a été contactée. Le conteneur jetable est supprimé après la campagne.
