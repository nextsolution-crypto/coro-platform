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

Le lot correctif est suivi sous `docs/audits/organization-incident-authorizations/`. Les preuves historiques de la fiche restent inchangées jusqu'à livraison et recette de cette dépendance.

## Réconciliation après PR #175

La dépendance d'administration est désormais livrée et active au SHA `d9eb6d84668a5773257ec75b7a06c062b7786384` : migration `20261121010000_incident_authority_idempotency`, release `41638570059`, inspection `41640868682`. Le mécanisme conserve la double autorité et la révocation à la requête suivante; aucun droit n'a été attribué en production pendant la livraison.

La fiche autorisée en production demeure `NOT_VERIFIED` jusqu'à approbation d'une attribution nominative minimale. `INCIDENT_READ` est suffisant pour la recette de lecture; `INCIDENT_COMMAND` ne doit pas être accordé. Aucune entrée de chronologie, transition, résolution, impression ou export réel n'est requis pour cette preuve.

La tentative approuvée avec Patrick JEAN-ERNEST s'est arrêtée fail-closed avant tout accès Incident : le serveur a refusé l'affectation BUREAUX, car ce ClientUser n'est pas affecté à ce bâtiment. La permission individuelle ajoutée pour la tentative a été immédiatement retirée; aucune affectation active ne subsiste. Verdict production : `RECETTE_NON_REALISEE — BENEFICIAIRE_NON_ADMISSIBLE`.

## Campagne synthétique de production

L'exercice synthétique et la double autorité `INCIDENT_READ` strictement limitée à cet incident ont été préparés par le workflow gouverné `41666211609`, sans communication externe et sans capacité publique. La fiche n'a pas été ouverte avec l'identité QA : Mathieu ne dispose pas de ses identifiants d'authentification, et la session d'une autre identité n'a pas été utilisée comme substitut. Le parcours navigateur autorisé reste donc `NOT_VERIFIED`.

La remise en état `41668163043` est `PASS`, confirmée idempotente par `41668416320` : identité inactive, permission individuelle absente, affectation révoquée, sessions/liens/appareils neutralisés, fixture inactive et annulée, aucun accès temporaire résiduel. Aucune donnée Incident réelle n'a été consultée ou modifiée.

## Alignement final des capacités de la fiche Incident

Le correctif de fermeture fail-closed des actions de la fiche a été livré par la PR `#182`.

- Commit produit : `1b91e9af8b1c933babf21c9a8438232660ba2734`.
- SHA fusionné et actif : `e28eec4fb26288768e147ec08fada24b2d92140a`.
- CI de PR : `41688094822`, `41688094842` et `41688095103`, toutes `SUCCESS`.
- CI du SHA fusionné : `41689177700`, `SUCCESS`.
- Capacité pré-release : `41690327745`, `SUCCESS` avec 17 441 953 491 octets de marge au-dessus du besoin calculé.
- Inspection pré-release : `41690335440`, `PASS / GO`.
- Release gouvernée : `41690727735`, `SUCCESS`.
- Inspection post-release : `41694100917`, `PASS / GO`.
- Réconciliation : `41694254014`, `SUCCESS`.

La recette QA attachée au commit produit est `PASS` sur 8 scénarios : lecture seule desktop et mobile, supervision seule, commande seule, révocation serveur et navigateur à la requête suivante, absence de mutation après révocation et projection API des capacités. Le backend calcule les capacités effectives par intersection entre la permission individuelle active et l'affectation Incident active; l'interface ne présente plus d'action de commande ou d'écriture REX en l'absence de l'autorité correspondante.

L'inspection post-release confirme PostgreSQL 16.15, 168 migrations, tête `20261121010000_incident_authority_idempotency`, sauvegarde `REMOTE_VERIFIED`, restauration `RESTORE_VERIFIED`, quatre images de rollback disponibles, verrou libre et 33 741 900 KiB disponibles sur `/dev/vda1`.

Images actives :

- Backend : `ghcr.io/nextsolution-crypto/coro-backend@sha256:a7cb9181e9cf40afa54955764f3385c68c292282cb78ebb5f7137bc8899a8e95`.
- Frontend : `ghcr.io/nextsolution-crypto/coro-frontend@sha256:d2e06023ec2b47e9cb2c6c4d6081fc63bd84c452109ee21434e6e6bbd1665ada`.
- Client Portal : `ghcr.io/nextsolution-crypto/coro-client-portal@sha256:2425631fe854d9b0b72e5d6c52f378b69206adff0490c170361586e44a00ff63`.
- Website : `ghcr.io/nextsolution-crypto/coro-website@sha256:da81ae5e63e8ca3694e243a310d9a39719dc3bef857f4fec886b85c4982a770a`.

La vérification navigateur de production a confirmé la session Client, le tableau de bord, le bâtiment BUREAUX, Sentinelle et le refus explicite de l'historique Incident pour l'identité disponible; le refus persiste après F5 et n'expose aucune donnée Incident. Cette identité n'étant pas autorisée, l'ouverture d'une fiche autorisée reste `NOT_VERIFIED` en production et n'a pas été contournée par une attribution réelle. La preuve fonctionnelle des capacités demeure la recette QA intégrée. Le lecteur d'écran réel demeure `NOT_VERIFIED`.

## Clôture de la reprise synthétique après #182

Le correctif #182 reste livré et réconcilié au SHA actif `e28eec4fb26288768e147ec08fada24b2d92140a`. La reprise n'a déclenché ni build ni release applicative.

La campagne gouvernée a été préparée avec succès (`41698697992`) après un dry-run propre (`41698375099`), mais l'accès autorisé n'a pas pu être démontré. L'administration disponible ne permet pas à la session réelle ouverte d'attribuer une autorité Incident inter-organisation au ClientUser QA; le workflow de préparation n'accorde volontairement aucun droit. La liste et la fiche n'ont donc pas été ouvertes sous cette identité, et aucun `403` n'est présenté comme une validation fonctionnelle.

La remise en état obligatoire `41699393782` est `PASS` et le dry-run final `41699726935` confirme : identité inactive, aucune permission individuelle, aucune affectation Incident active, aucune session ou lien actif, aucune fixture active et aucune capacité publique. Verdict : `BROWSER_AUTHORIZED_NOT_VERIFIED — CLEANUP_PASS — NO_RESIDUAL_ACCESS`.

## Réconciliation finale du provisionnement

Le parcours d'administration n'est plus bloqué : le `SUPER_ADMIN` peut administrer un `ClientUser` d'une autre organisation uniquement par la vue plateforme avec organisation et Client explicitement ciblés; l'administrateur de tenant reste limité à sa propre organisation. Ce comportement a été vérifié avec backend/PostgreSQL réels et Chrome, sans créer de contournement universel.

La campagne finale a attribué `INCIDENT_READ` individuellement et sur le seul exercice synthétique `b429345c-40c7-4cad-b448-ba2b6cb08d53` par l'interface produit. La fiche autorisée n'a pas été ouverte, car l'identité technique `info@getcoro.io` ne correspond pas à un compte portail utilisable par Mathieu. La session Client disponible appartenait à une identité réelle distincte et a été abandonnée avant toute navigation vers un bâtiment ou un incident.

La finalisation `41712544470` est `PASS` : aucun droit individuel ou affectation active, identité inactive, sessions/liens/appareils neutralisés, exercice annulé, capacité publique révoquée et `residualAccess:false`. La fiche autorisée en production demeure `NOT_VERIFIED`; la preuve QA intégrée demeure `PASS`.
