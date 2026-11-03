# Audit ciblé — fiche Incident et cycle de vie

## Réconciliation finale

- Branche corrective : `fix/organization-incident-detail`
- Baseline : `origin/main` au SHA `08e64862b42c5d4f45a86c2a35e17cc077fc1be5`
- Candidat produit testé : `9ed296186733934395e757ca90133f4606b28c4e`
- PostgreSQL 16 : 167 migrations, tête `20261120010000_permanent_qr_codes`
- Réseau : deny-by-default; stockage et fournisseurs simulés
- Preuves : `D:\CORO-QA\tracking\organization-incident-detail`

## Parcours démontré

Un acteur Portail autorisé ouvre la fiche, distingue l’exercice, consulte une projection minimale, contient puis résout l’incident avec motif. Les doubles appels ne produisent qu’un journal et un audit. Un rejeu identique de la résolution est idempotent. Les acteurs hors bâtiment, hors tenant et anonymes sont refusés sans effet. Une panne SQL injectée annule entièrement la transaction.

La fiche résiste aux snapshots mal formés, aux charges XSS persistées et à une panne 503 suivie d’une reprise. L’impression restitue le contenu littéral échappé sans l’exécuter et ne se présente plus comme un PDF officiel.

## Preuves exécutées

- API/PostgreSQL réels : 13/13 PASS.
- Tests backend ciblés : 5 suites, 37 tests PASS.
- Chrome authentifié : 12/12 PASS sur quatre viewports et trois thèmes.
- F5, clavier/focus, zoom 200 %, cibles tactiles, absence de débordement, 503/reprise, XSS et absence d’erreur console critique : PASS.
- Build backend et Client Portal : PASS.
- Lecteur d’écran réel : `NOT_VERIFIED`.
- Production authentifiée : `NOT_VERIFIED`.

## Verdict

`ACCEPTATION_INTÉGRÉE_PASS — PR_READY` pour le candidat testé. La liste Incident livrée antérieurement n’est pas rouverte. La fusion et la production restent exclues de ce mandat.
