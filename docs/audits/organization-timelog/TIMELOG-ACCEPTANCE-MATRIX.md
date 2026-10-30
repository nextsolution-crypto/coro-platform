# Matrice d'acceptation Timelog

| Domaine | Statut | Preuve |
|---|---|---|
| Route, modèles et endpoints | PASS | cartographie du SHA audité |
| Propriétaire et tenant dérivés du JWT | PASS statique | filtres `userId, organizationId` |
| Refus des rôles clients | PASS test existant | `work-management-security.spec.ts` |
| Saisie manuelle valide | NOT_VERIFIED | stack PostgreSQL/API non exécuté |
| Valeurs invalides | FAIL | validation serveur absente |
| Modification/suppression | PARTIAL | contrats présents; QA et erreurs non vérifiées |
| Concurrence | FAIL | aucune précondition/version |
| Dates/fuseau/DST | FAIL | `new Date(YYYY-MM-DD)` sans politique |
| Totaux connus | NOT_VERIFIED | calcul inspecté, jeu PostgreSQL non exécuté |
| Vue équipe multi-tenant | NOT_VERIFIED | portée statique correcte, E2E absent |
| Effet sur capacité | PASS statique | `capacity.service.ts` consomme `TimelogEntry` |
| Effet sur Rendement financier | NON_APPLICABLE | seul `TaskTimeEntry` est consommé |
| Chronomètre | NON_APPLICABLE | absent |
| Validation/verrouillage/export/pagination | NON_APPLICABLE | absents |
| Erreurs/reprise | FAIL | console uniquement |
| Chrome 390/768/1440/2560 × 3 thèmes | NOT_VERIFIED | aucune preuve navigateur produite |
| Clavier/focus/zoom 200 % | NOT_VERIFIED | recette réelle requise |
| Lecteur d'écran réel | NOT_VERIFIED | indisponible |
