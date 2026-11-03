# Clôture de livraison — Incident lot 2

## Identités de livraison

- Candidat produit testé : `9ed296186733934395e757ca90133f4606b28c4e`.
- HEAD final de PR : `84d64463486958a4dd5eded992a8ef47d147e40e`.
- PR : `#172`.
- SHA fusionné et actif : `7184456f42d43429d38ccbdaa87f141df774a2c9`.

## Contrôles et release

| Étape | Run | Résultat |
|---|---:|---|
| CI du SHA fusionné | `41569957791` | SUCCESS |
| Capacité pré-release | `41570498562` | SUCCESS — HEALTHY |
| Inspection pré-release | `41570500820` | PASS / GO |
| Release gouvernée | `41570892531` | SUCCESS |
| Inspection post-release | `41572536046` | PASS / GO |
| Réconciliation | `41572538222` | SUCCESS |

La capacité post-release est de 39 121 408 KiB disponibles sur `/dev/vda1` (52 % utilisé). Le verrou de déploiement est libre.

## État actif

- Backend : `ghcr.io/nextsolution-crypto/coro-backend@sha256:07aec5b8b978c9dc54453f6de08cc9409a321949fb531bb6801a87bcaa6a5cde`.
- Frontend : `ghcr.io/nextsolution-crypto/coro-frontend@sha256:7eef05083d3a26139fe320e989e7dde5502c87fb4a89f2ef830641360abfdf2f`.
- Client Portal : `ghcr.io/nextsolution-crypto/coro-client-portal@sha256:5993a8dec637742890eaead48ea2db00fc72276ec66928a8a544acab7704a638`.
- Website : `ghcr.io/nextsolution-crypto/coro-website@sha256:ef0b8ff1e5b116ee4e3c25ee1015794c7a3b4b53db25712eac3b371e39021b61`.
- PostgreSQL : 16.15, 167 migrations, tête `20261120010000_permanent_qr_codes`, aucune nouvelle migration dans ce lot.
- Backup : `REMOTE_VERIFIED`; restauration : `RESTORE_VERIFIED`.

## Rollback

Les quatre images précédentes sont disponibles, mais leur disponibilité ne vaut pas autorisation. La politique gouvernée ne contient aucune combinaison approuvée et refuse le backend antérieur qui réintroduirait les défauts de sécurité. Le repli autorisé est un roll-forward corrigé ou une restauration explicitement gouvernée; aucun rollback de production n'a été exécuté.

## Vérification navigateur de production

Une session Client légitime a permis d'ouvrir le tableau de bord, un bâtiment de démonstration et Sentinelle en lecture seule. L'accès à l'historique Incident a retourné un refus explicite pour cette identité. Aucun incident autorisé n'a donc été ouvert; le contrôle fonctionnel de la fiche et la vérification réseau de l'absence de champs sensibles restent `NOT_VERIFIED` en production. Les preuves QA intégrées demeurent `PASS`.

La qualification du refus confirme deux contrôles serveur cumulatifs : l'identité doit posséder `INCIDENT_READ` dans `ClientUser.incidentPermissions`, puis une `IncidentAuthorityAssignment` active doit lui accorder cette permission dans le périmètre du bâtiment ou de l'incident. L'API gouvernée sait administrer ces deux éléments, mais l'interface Organisation ne permet pas de les configurer : le panneau « Permissions opérationnelles » ne présente que REX et actions correctives, et aucun écran ne crée l'affectation d'autorité Incident. Le blocage observé n'est donc pas levable par un administrateur depuis l'interface actuelle et ne doit pas être contourné par une modification directe de production.

## Réserves

- Lecteur d'écran réel : `NOT_VERIFIED`.
- Impression HTML : distincte d'un PDF officiel et de PDF/UA.
- Jetons historiquement exposés : aucune révocation rétroactive n'est revendiquée.
- Fiche autorisée en production : `BLOCKED_BY_PROVISIONING_UI`. Un lot ciblé doit exposer l'attribution gouvernée de `INCIDENT_READ`, `INCIDENT_SUPERVISE` et `INCIDENT_COMMAND` ainsi que les affectations d'autorité par bâtiment ou incident, avec audit, révocation et refus inter-tenant. Après livraison, une identité synthétique ou explicitement autorisée pourra servir à la vérification en lecture seule.
