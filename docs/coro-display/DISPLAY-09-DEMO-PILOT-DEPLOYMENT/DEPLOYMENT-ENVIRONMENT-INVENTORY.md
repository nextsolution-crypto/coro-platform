# Inventaire de l'environnement

Inspection gouvernee : workflow `43326092966`, PASS, 2026-11-12.

| Composant | Etat observe |
|---|---|
| Backend | actif, digest `sha256:8f8d0878...`, 0 redemarrage |
| Frontend professionnel | actif, digest `sha256:f63a0504...`, 0 redemarrage |
| Portail client | actif, digest `sha256:af85be16...`, 0 redemarrage |
| Site Web | actif, digest `sha256:f7cca6a6...`, 0 redemarrage |
| PostgreSQL | 16.15, sain, digest `sha256:f4610795...`, 0 redemarrage |
| SHA actif | `e83d83a1afcb80d9bc95037dadc27700d3f68d89` |
| Migrations | 176; tete `20261128010000_sentinelle_presence_integrity_finalize` |
| Stockage documentaire | stockage prive gere par le backend; contenu client non inspecte |
| Reverse proxy | acces Cloudflare confirme pour `client.getcoro.io`; configuration interne non modifiee |
| Monitoring | inspection forcee, journaux de release, health checks et preuves de reconciliation disponibles |
| Sauvegarde | distante `REMOTE_VERIFIED`; diagnostic `43326095939` PASS |

L'inspection ne revele aucun secret. Elle ne demontre pas la sante applicative par un champ Docker `health` pour les quatre applications (valeur `null`), mais les conteneurs sont actifs sans redemarrage et le workflow de release actif avait termine avec succes.
