# Matrice d'acceptation Démo

| Contrôle | Statut | Preuve ou condition |
|---|---|---|
| Cible canonique et projets Prémont | PASS | Workflow lecture seule `41757756703` |
| Préservation des autres worktrees | PASS | Worktree `feature/demo-coro-complete` isolé |
| Manifeste stable | PASS livré | Tests Node ciblage/collision; workflows gouvernés #190, #191 et #192 fusionnés |
| Migration depuis zéro | PASS local | PostgreSQL 16, 169 migrations appliquées |
| Upgrade depuis la tête précédente | PASS local | Migration Démo réappliquée sur données synthétiques préexistantes conservées |
| Provisionnement idempotent PostgreSQL | PASS local | 40 registres après 1, 2 et 2 exécutions concurrentes |
| Reprise après échec | PASS local | Collision projet injectée après écritures intermédiaires; transaction annulée, puis reprise réussie |
| Refus autre tenant | PASS intégré local | Identité déplacée temporairement vers tenant QA distinct, aucune écriture Démo admise |
| Communications courriel/SMS | PARTIAL | Transports principaux raccordés; inventaire restant |
| Push/webhook/intégration physique | NOT_VERIFIED | Raccordement à terminer |
| Documents privés ouvrables | PASS intégré local | Stockage S3 QA isolé, SHA-256 identique, aucun storageKey ni URL HTTP exposé |
| Knowledge et citations | PASS intégré local | Source APPROVED indexée localement, citation/version exacte, retrait après révocation |
| Indicateurs cohérents | PASS intégré local | 11,5 h; ventes CAD 39 800,00; coût 828,00; marge 38 972,00; 3 mandats complets |
| Multirôle et MFA | PASS local QA / NOT_VERIFIED livré | Trois identités QA, connexion mot de passe + MFA locale normale; trois adresses livrables permanentes et leur activation humaine restent requises |
| Reset ciblé | PASS local | 40 fixtures retirées, neutralisées ou désactivées; 2 projets Prémont synthétiques préexistants conservés; environnement PAUSED/BLOCK |
| Activités/Planning | PASS données local | 3 activités et 4 tâches, rattachements projet et assignation vérifiés |
| TimeLog/Rendement | PASS données local | 3 mandats et 4 saisies de temps; aucune validation financière officielle fabriquée |
| Sortie de reset par `prepare` | PASS local | Reprovisionne 10 projets puis ACTIVE/SIMULATE, fournisseurs externes toujours désactivés |
| Protection après nouveau reset | PASS local | PAUSED/BLOCK et fournisseurs externes désactivés |
| Sentinelle/Incident/REX | PASS données local | 2 employés, 4 présences, 1 exercice sans jeton public, 2 actions liées |
| Chrome 12/12 | PASS local QA | App + portail, 390/768/1440/2560, Classic/Glass Light/Glass Dark; captures inspectées, F5, clavier, zoom 200 %, aucune erreur console critique |
| Provisionnement gouverné CORO Démo | PASS production synthétique | Dry-run `41841686707`, préparation `41842041001`, vérification `41842381006`; 40 fixtures enregistrées, `ready:true`, cible canonique verrouillée |
| Communications après provisionnement | PASS configuration | `ACTIVE/SIMULATE`, fournisseurs externes désactivés; aucune communication réelle déclenchée |
| Absence d'impact hors tenant | PASS ciblage et inventaire | Inventaire post-provisionnement `41842914129`; seules les fixtures du namespace et du tenant canonique ont été enregistrées |
| Release de l'autorité documentaire Démo | PASS production | PR #196, SHA actif `b2d06dafd83d7d15a7f2c5c15a520755c9ad90e0`, release `41857007049`, inspection `41859825671`, 169 migrations inchangées, sauvegarde/restauration vérifiées et quatre images de rollback |
| Documents privés livrés | PASS serveur production synthétique | Deux ProjectFile privés enregistrés; téléchargement de v2 et comparaison octets/SHA-256 réussis; v1 `SUPERSEDED`, v2 `APPROVED`, version courante 2 |
| Knowledge livré | PASS serveur production synthétique | Vérification `41863006419`: `ready:true`, `registered:2`, `integrity:true`, `citation:true`, `freshness:true`, `crossTenantDenied:true` |
| Ouverture UI multirôle documents/citations | NOT_VERIFIED livré | À exécuter après activation normale des trois comptes permanents; aucune identité ou MFA de production n'a été contourné |

Verdict courant : `DEMO_PROVISIONED_ACCOUNT_ACCEPTANCE_PENDING`. L'environnement livré contient les fixtures synthétiques vérifiées ainsi que deux documents privés versionnés et leurs sources Knowledge vérifiées côté serveur. La preuve multirôle locale ne vaut pas activation des comptes permanents. `DEMO_READY` reste interdit avant trois connexions normales, MFA réellement utilisables et ouverture UI autorisée des documents/citations dans l'environnement livré.
