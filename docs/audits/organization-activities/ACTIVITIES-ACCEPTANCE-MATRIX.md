# Matrice d'acceptation — Planning Activités

| Domaine | Scénario | Statut | Preuve |
|---|---|---|---|
| Organisation | Agrégat au-delà de 200 projets | PASS | 201/201 activités, une requête serveur. |
| Autorisation | OPERATOR hors affectation : update/delete/duplicate/ICS/portfolio | PASS | 403/404 et zéro effet secondaire. |
| Autorisation | ADMIN légitime | PASS | Accès aux projets autorisés de l'organisation. |
| États projet | Archivé et inactif | PASS | Mutations refusées. |
| Concurrence | Écriture sur version obsolète | PASS | Première écriture 200, seconde 409. |
| Client | Activité conseiller visible au bon client | PASS | Deux sessions authentifiées. |
| Client | Réservation puis visibilité conseiller | PASS | Création 201 et lecture projet 200. |
| Client | Tentative répétée | PASS | 409, ni doublon ni notification supplémentaire. |
| Client | Annulation propriétaire | PASS | Transition 200 en QA. |
| Isolation | Autre organisation | PASS | Liste sans donnée étrangère et réservation 403. |
| Erreurs | Panne agrégat 503 | PASS | Erreur explicite, aucune donnée résiduelle, bouton Réessayer. |
| ICS | Calendrier réel | PASS | MIME, VCALENDAR/VEVENT, UID, dates UTC et CRLF. |
| ICS | Hors portée et 503 | PASS | Aucun contenu/fichier; erreur visible. |
| Notification | Fournisseur simulé | PASS | Une acceptation locale; zéro envoi sur doublon refusé. |
| Responsive | 390×844, 768×1024, 1440×900, 2560×1440 × 3 thèmes | PASS 12/12 | Aucun débordement ni contrôle partiellement coupé. |
| Session | F5 application et portail | PASS | Jetons et activité présents après rechargement. |
| Accessibilité | Clavier/focus et zoom 200 % | PASS | Focus visible; aucun débordement à 200 %. |
| Accessibilité | Lecteur d'écran réel | NOT_VERIFIED | Lecteur indisponible. |

Preuves : `D:\CORO-QA\runs\organization-activities\2026-10-29`.

## Livraison

| Gate | Statut | Preuve |
|---|---|---|
| Fusion | PASS | PR #126, merge `76e7a3c60b38d005e81be72c631f2b91a33668bf`. |
| CI main | PASS | Workflow `40977118674`. |
| Release | PASS | Workflow gouverné `40977838218`. |
| Migration | PASS | Aucune nouvelle migration; tête production 161 inchangée. |
| Inspection | PASS/GO | Workflow `40979105630`, SHA actif et quatre digests applicatifs vérifiés. |
| Capacité | PASS, marge faible | Workflow `40979108332`; 20 073 549 824 octets libres, marge 367 880 603 octets. |
| Récupération | PASS | Sauvegarde distante et restauration vérifiées; quatre rollbacks présents. |
