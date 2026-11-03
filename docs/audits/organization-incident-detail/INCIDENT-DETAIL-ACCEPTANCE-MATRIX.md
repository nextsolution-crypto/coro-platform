# Matrice d’acceptation — fiche Incident

## Candidat et environnement

- SHA produit : `cb41581b5d11273d8fa388bd10f0d5e1551e2687`
- PostgreSQL 16, 167 migrations, tête `20261120010000_permanent_qr_codes`
- Réseau deny-by-default; fournisseurs simulés uniquement
- Preuves : `D:\CORO-QA\tracking\organization-incident-detail`

## API et PostgreSQL

Les 13 contrôles sont `PASS` : lecture autorisée; refus bâtiment, tenant et anonyme; projection minimale; auteur serveur; refus d’une sous-ressource étrangère sans écriture; containment idempotent; motif de résolution obligatoire; résolution, audit et rejeu; rollback intégral sur panne SQL; date REX serveur; ordre stable des égalités.

## Chrome authentifié

Les 12 combinaisons sont `PASS` : 390×844, 768×1024, 1440×900 et 2560×1440, chacune en Classic, Glass Light et Glass Dark.

| Contrôle | Résultat |
|---|---|
| Nature exercice, statut, responsable, fraîcheur | PASS |
| Snapshots mal formés, contenu valide conservé | PASS |
| Motif requis et transitions depuis l’interface | PASS |
| Double clic containment/résolution, un effet | PASS |
| Refus acteur hors périmètre | PASS |
| 503 visible, accessible et récupérable | PASS |
| F5, clavier/focus et zoom 200 % | PASS |
| Cibles tactiles et débordement horizontal | PASS |
| XSS DOM et impression | PASS — aucune exécution |
| Erreur console critique | PASS — aucune |
| Lecteur d’écran réel | NOT_VERIFIED |

## Non applicable ou distinct

- Réouverture, pièces jointes Incident et création/suppression de tâche depuis cette fiche : non présentes dans ce lot.
- Production authentifiée : `NOT_VERIFIED`; aucune mutation réelle n’est autorisée.
