# Audit des 11 migrations

| Migration | Effet principal | Verrou/risque | Compatibilité |
|---|---|---|---|
| `20261129010000_coro_display_spatial_foundations` | Floors, zones, locations; permissions User/ClientUser | CREATE/ALTER + FK/index | Ancien code ignore les ajouts |
| `20261130010000_coro_display_plan_publication` | Publications et événements | Index uniques/partiel sur nouvelles tables; index sur ProjectFile | Additif, ancien code compatible |
| `20261201010000_display_pdf_render_jobs` | File de rendu PDF | Nouvelle table/index/FK | Additif |
| `20261202010000_display_client_portal` | Observations client + événements | Nouvelles tables et index | Additif |
| `20261203010000_display_client_portal_review_hardening` | Priorité + CHECK texte | Scan/validation de table Display neuve | Ancien code compatible |
| `20261204010000_display_observation_professional_workflow` | Workflow professionnel/messages | `DROP NOT NULL` acteur client, colonnes/FK/CHECK | Assouplissement compatible |
| `20261205010000_display_connected_player` | Device, invitation, nonce, assignation, sync, événements | Plusieurs tables/index | Additif |
| `20261205020000_display_device_scope_hardening` | Clés composites/FK de portée | Validation FK/index | Compatible avec fixtures conformes |
| `20261205030000_display_operational_heartbeat` | Heartbeat device | ALTER + index | Additif |
| `20261206010000_display_emergency_orchestration` | Events, commands, delivery, outbox, escalations | Plusieurs tables/index/FK Incident | Additif; fonction non activée |
| `20261207010000_display_permanent_url_web_player` | `publicDisplayId`, activation/session Web | UPDATE de toutes les locations Display + UNIQUE | Risque proportionnel aux locations Display existantes; production actuelle n'a pas ces tables |

Toutes s'exécutent dans une transaction Prisma. Estimation jetable : 2,37 s pour les 11 sur schéma baseline vide de données métier. Cette durée ne prédit pas une production volumineuse; vérifier les cardinalités et `lock_timeout` immédiatement avant release.

Rollback DB : pas de down migration automatique. Conserver le schéma additif et revenir aux anciennes images, après preuve de compatibilité; toute suppression exige une opération distincte.
