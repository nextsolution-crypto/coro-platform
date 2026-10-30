# Matrice d'acceptation Timelog

| Domaine | Statut | Preuve |
|---|---|---|
| Route, modèles, endpoints | PASS | code/build candidat |
| Propriétaire et tenant JWT | PASS | champs forgés sans usurpation |
| Refus rôles clients | PASS | régression sécurité |
| Saisie valide | PASS | PostgreSQL/API |
| Valeurs invalides | PASS | zéro, négatif, date, catégorie, période |
| Update/delete | PASS | autorisé + propriété |
| Concurrence | PASS | `409`, aucun effet secondaire |
| Réponse perdue/idempotence | PASS | même ID, une ligne |
| Dates/DST | PASS | date civile UTC |
| Totaux | PASS | avant/création/update/delete |
| Vue équipe tenant | PASS | admin A limité à A |
| Capacité | PASS | total cohérent |
| Rendement financier | NON_APPLICABLE | `TaskTimeEntry` inchangée |
| Migration 161→162 | PASS | ligne historique préservée |
| Erreurs/reprise UI | PASS | message, saisie, retry, F5 |
| Chrome 4 viewports × 3 thèmes | PASS 12/12 | captures/géométrie |
| Clavier/focus/zoom 200 % | PASS | Chrome réel |
| Lecteur d'écran réel | NOT_VERIFIED | runtime absent |
| Timer/export/pagination/approbation | NON_APPLICABLE | hors mandat |

Verdict : **ACCEPTATION_INTÉGRÉE_PASS**.
