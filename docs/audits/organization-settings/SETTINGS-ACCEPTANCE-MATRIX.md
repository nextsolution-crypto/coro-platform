# Matrice d’acceptation Paramètres

| Domaine | Statut | Preuve |
| --- | --- | --- |
| Catalogue `/settings` | PASS | Production lecture seule + QA |
| Responsive 12 configurations | PASS | 12/12, aucun débordement |
| Profil — allowlist | PASS | Mass assignment refusé |
| Mot de passe | PASS | secret actuel, politique, MFA, révocation des sessions/appareils |
| Organisation — coordonnées | PASS | autorité `Organization`, deux comptes cohérents, autre tenant isolé |
| Organisation — logos | PASS | autorité ADMIN/SUPER_ADMIN avant traitement |
| Membres — lecture ADMIN | PASS | tenant A uniquement |
| Membres — refus OPERATOR | PASS | annuaire 403; projection minimale sans utilisateurs |
| Création de SUPER_ADMIN par ADMIN | PASS | 403 |
| Invitations et renvoi | PASS | outbox chiffrée, idempotence, reprise simulée, concurrence 201/409 atomique |
| Désactivation et révocation | PASS | requête suivante 401, ancien jeton inutilisable |
| Réactivation | PASS | nouvelle authentification nécessaire |
| Isolation inter-tenant | PASS | refus sans effet secondaire |
| Module 1 | PASS | ADMIN/SUPER_ADMIN, refus OPERATOR |
| Types d’activités | PASS | scoping existant préservé, route Chrome validée |
| Catégories timelog | PASS | autorité serveur préservée; outil masqué à OPERATOR |
| Modèles de tâches | PASS | autorité serveur préservée; outil masqué à OPERATOR |
| Feedback | PASS DANS LE PÉRIMÈTRE | route et UI validées; aucun envoi externe exercé |
| Panne 503 et reprise membres | PASS | alerte accessible et Réessayer |
| Audit métier | PASS | transitions et invitations auditées dans les transactions métier |
| Lecteur d’écran réel | NOT_VERIFIED | runtime indisponible |
| Facturation, quotas, intégrations | NON_APPLICABLE | aucune fonction sur `/settings` |
| CI du SHA fusionné | PASS | `41347941081`, SHA `91c1313c393bd630489e66ee26aa5557ca53c2dd` |
| Release gouvernée | PASS | `41348342595`, terminal SUCCESS |
| Inspection technique production | PASS | `41349712708`, SHA actif vérifié par le workflow, artefact assaini avec digest vérifié |
| Capacité post-release | PASS | `41349728310`, terminal SUCCESS |
| Recette visuelle production | PASS | huit routes, desktop + 390×844, F5, contrôles visibles, aucune mutation |
| Rollback applicatif de sécurité | CONDITIONNEL | schéma additif; ancien backend interdit sans correction ou suspension gouvernée |

## Verdict

`VALIDÉ_QA — FUSIONNÉ — DÉPLOYÉ — RÉCONCILIÉ`

Limites : lecteur d’écran réel `NOT_VERIFIED`; livraison courriel réelle hors mandat; conflits historiques divergents à confirmer par un administrateur. La clé d’outbox gouvernée existante a été conservée et validée sans exposition de sa valeur.
