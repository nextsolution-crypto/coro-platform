# Matrice d’acceptation — Rendement

| Domaine | Scénario | Statut | Preuve |
|---|---|---|---|
| Candidat | Code audité identique au produit déployé | PASS | diff produit `c41e05b…98eedf…` vide; release applicative `c41e05b…` réussie, release docs `98eedf…` sans images/déploiement |
| Calcul | 8 h de `TaskTimeEntry`, 99 h de `TimelogEntry` | PASS | API réelle : Rendement retourne 8 h; Timelog n’est pas additionné |
| Calcul | 8 h × 80 CAD, vendu 1 000 CAD, marge 360 CAD / 36 % | PASS | `knownLaborCost=640.00`, `contributionMargin=360.00`, `36.00 %` |
| Complétude | taux manquant/partiel, vente manquante, heure absente | PARTIAL | tests unitaires; toutes les variantes n’ont pas été rejouées en E2E |
| Temps | Toronto, borne finale inclusive, période inversée | PASS | 16 tests backend ciblés et refus API de la période inversée |
| Autorisation | anonyme, OPERATOR, ADMIN client, délégation, inter-tenant | PASS | 401/403 attendus; délégation financière explicite PASS |
| Isolation | organisation B ne reçoit aucune donnée A | PASS | acteur organisation B : aucun conseiller A; délégation vers B refusée |
| Interface | 390/768/1440/2560 × Classic/Glass Light/Glass Dark | PASS | Chrome réel 12/12; captures sous le dossier de preuves |
| Interface | F5, clavier, zoom 200 %, absence de débordement | PASS | session conservée après F5, focus clavier, zoom 200 %, 0 débordement |
| Erreurs | vide, 403, 503, reprise, réponses désordonnées | PARTIAL | vide, 403 et 503/reprise PASS; réponses désordonnées NOT_VERIFIED |
| Identité inactive | session refusée, historique conservé, réactivation sans restauration de session | PASS | 401 après désactivation et après réactivation; 8 h / 640 CAD historiques conservés |
| Régression | backend Rendement | PASS | 2 suites, 16 tests |
| Régression | frontend Rendement | PASS | 2 tests contrat + 7 tests monétaires; TypeScript PASS |
| Lecteur d’écran réel | restitution vocale | NOT_VERIFIED | aucun lecteur fiable disponible dans le harnais |
| Production | lecture seule authentifiée | NOT_VERIFIED | non substituée à la recette synthétique |

Un scénario non exécuté ne devient pas PASS par inférence.
