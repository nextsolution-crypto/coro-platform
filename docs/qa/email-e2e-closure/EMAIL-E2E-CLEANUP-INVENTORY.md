# CORO Email E2E — inventaire de conservation

Aucune suppression n'a été exécutée. Toute action ci-dessous est différée après déploiement validé et exige une autorisation.

| Ressource | Emplacement | Utilité actuelle | Action proposée |
|---|---|---|---|
| Branche Runtime | `integration/email-e2e-runtime` locale/distante | PR #82 active | conserver jusqu'à clôture et délai de rollback |
| Branche Security | `integration/email-e2e-security` locale/distante | PR #83 active | conserver jusqu'à clôture et délai de rollback |
| Branche UI | `integration/email-e2e-ui` locale/distante | PR #84 active | conserver jusqu'à clôture et délai de rollback |
| Branche QA tooling | `integration/email-e2e-qa-tooling` locale/distante | PR #85 et dossier de release actifs | conserver jusqu'à clôture et archivage |
| Worktree QA source | `F:\coro-platform\.worktrees\v1-real-email-acceptance` | runtime et historique QA | conserver; aucune modification ou suppression |
| Worktree d'intégration | `F:\coro-platform\.worktrees\email-e2e-integration` | préparation G7–G10 | conserver jusqu'à release et vérification des rapports |
| Preuve historique | `D:\coro-qa-runtime\email-evidence\email-qa-20261025-001\evidence.json` | preuve du run QA | conserver; SHA-256 vérifié |
| Builds portail isolés | `.next-g7`, `.next-g9-ui`, `.next-g10` sous le worktree d'intégration | validation locale, non suivis | proposer suppression ciblée après archivage des résultats |
| Artefacts backend | `coro-backend/dist` sous le worktree d'intégration | validation locale, non suivi | proposer suppression ciblée après release |
| PostgreSQL QA | `127.0.0.1:55471/coro_email_qa` et son volume associé | possibilité de reprise/audit QA | conserver jusqu'à décision du propriétaire QA |
| Journaux runtime QA | `D:\coro-qa-runtime` | diagnostic historique | conserver selon politique de rétention; vérifier avant suppression |
| Secrets QA locaux | magasin Windows et configuration protégée du runtime | reprise QA contrôlée | conserver ou révoquer uniquement sur décision sécurité |
| Dépôt principal | `F:\coro-platform` | autre chantier local avec modifications | préserver intégralement |
| Autres worktrees | inventaire `git worktree list` | chantiers parallèles | hors périmètre; ne jamais supprimer sur ancienneté apparente |

Avant tout nettoyage: confirmer le propriétaire, l'absence de changements non commités et de commits non publiés, les dépendances CI/runtime, la sauvegarde et le délai de retour arrière. Les preuves et rapports ne sont jamais des caches.
