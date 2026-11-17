# INC-RP-02B — Quarts et relève opérationnelle

## Autorité et séparation

Le quart opérationnel ne remplace ni `UserWorkSchedule` (planification RH), ni la main courante, ni Incident/Sentinelle. Il capture la responsabilité effectivement assumée à un poste de sécurité dans un bâtiment. L’accès exige simultanément une permission de plateforme dédiée et une affectation active au bâtiment.

| Profil | Permissions minimales |
|---|---|
| Lecture | `OPERATIONAL_SHIFT_READ` |
| Responsable de quart | `READ`, `OPEN`, `EDIT_OWN`, `HANDOVER_PREPARE` |
| Agent entrant | `READ`, `HANDOVER_ACKNOWLEDGE` |
| Superviseur | `READ`, `SUPERVISE`, `EXCEPTION_CLOSE` |
| Administrateur du dispositif | `OPERATIONAL_SHIFT_ADMIN` (sans délégation implicite) |

Les permissions Incident, Sentinelle, Report et main courante ne confèrent aucun droit implicite sur les quarts.

## Machine d’état

`PLANNED → OPEN → HANDOVER_PENDING → CLOSED`

`PLANNED|OPEN → CANCELLED` exige une autorité de supervision et un motif. Une fermeture sans relève acquittée exige `OPERATIONAL_SHIFT_EXCEPTION_CLOSE` et un motif. La réouverture n’est pas proposée en V1 : une correction se fait par un nouvel événement audité, jamais par réécriture de l’historique.

## Relève probante

La soumission fige un snapshot JSON et son SHA-256 : événements récents, anomalies non résolues, rapports en attente, consignes, suivis, priorités, observations et références de pièces jointes. Le snapshot est immuable en PostgreSQL. L’entrant authentifié peut acquitter, réserver, refuser avec motif ou demander une clarification. Ouvrir l’écran ne vaut jamais acquittement.

Les décisions sont append-only, idempotentes et attribuées à l’acteur réel. La relève non confirmée reste `HANDOVER_PENDING` et apparaît dans la file de supervision. Les entrées de main courante conservent toujours leur auteur d’origine même lorsqu’elles sont rattachées à un quart.

## Concurrence, temps et continuité

- transaction `SERIALIZABLE`, verrou consultatif par organisation/bâtiment/poste;
- `lockVersion` sur quart et relève;
- clé d’idempotence par organisation;
- dates persistées en UTC et fuseau vérifié du bâtiment figé sur le quart;
- quarts de nuit et changements DST supportés par des instants absolus;
- aucun acquittement automatique après coupure réseau ou résultat ambigu;
- fermeture supervisée explicite lorsque la relève immédiate est impossible.

## Activation et rollback

`OPERATIONAL_SHIFTS_ENABLED` doit valoir exactement `true`; absent ou toute autre valeur signifie désactivé. La migration est additive. Le rollback applicatif consiste à remettre le flag à `false` et à restaurer l’image précédente; les preuves déjà écrites sont conservées. Aucun `down` destructif n’est prévu.

## Critères QA

- bâtiment/organisation et affectation active obligatoires;
- chevauchements incompatibles refusés sous concurrence;
- séparation sortant/entrant;
- refus et clarification avec motif;
- snapshot et historique immuables;
- double clic sans doublon;
- pagination bornée;
- responsive ordinateur/tablette/téléphone;
- non-régression Operational Log, Incident Report et Sentinelle.
