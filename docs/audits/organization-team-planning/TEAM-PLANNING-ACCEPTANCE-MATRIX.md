# Matrice d’acceptation — planification d’équipe

| Domaine | Statut | Preuve |
|---|---|---|
| Authentification et MFA | PASS | Deux organisations authentifiées; identité inactive refusée 401 |
| Isolation organisation | PASS | Contexte, équipe, planification et replanification inter-tenant refusés/minimisés |
| Confidentialité collègue | PASS | Politique générique `BUSY` vérifiée par tests unitaires et lecture opérateur |
| Création activité | PARTIAL | API 201, mais contrat UI divergent (PLAN-001) |
| Affectation/Booking | PASS | Booking et affectation canoniques persistés |
| Concurrence/idempotence | PASS | Deuxième réservation ouverte refusée 409; aucun effet secondaire |
| Replanification | PASS | Créneau et statut persistés; accès étranger refusé |
| Annulation | PASS | Booking `ANNULEE`, affectation `REMOVED` |
| Activités/Booking/Timelog | PASS_WITH_LIMIT | Sources distinctes; capacité informative 12 semaines |
| Erreurs et reprise | PARTIAL | Erreur principale explicite; panne mensuelle silencieuse (PLAN-003) |
| Chrome 390×844 | FAIL 0/3 | Six contrôles hors viewport dans chaque thème |
| Chrome 768×1024 | PASS 3/3 | Aucun overflow ni contrôle hors viewport |
| Chrome 1440×900 | PASS 3/3 | Aucun overflow ni contrôle hors viewport |
| Chrome 2560×1440 | PASS 3/3 | Aucun overflow ni contrôle hors viewport |
| F5/session | PASS | Session et activité conservées |
| Clavier/focus | PASS | Cible de focus visible |
| Zoom 200 % | PASS | Aucun contrôle hors viewport dans le scénario mesuré |
| Console critique | PASS | Aucune erreur critique |
| Lecteur d’écran réel | NOT_VERIFIED | Runtime indisponible |
| Export/synchronisation/Outlook | NOT_APPLICABLE | Non implémentés dans la V1 observée |

Verdict initial : **FAIL — correction requise avant acceptation fonctionnelle complète**.

## Matrice finale du candidat corrigé — 2026-10-30

| Domaine | Statut final | Preuve |
|---|---|---|
| Contrat création | PASS | `201 { activityId }`; aucune propriété ambiguë `id` |
| Reprise après réponse perdue | PASS | Même `requestId`, même activité/Booking, compte physique égal à 1 |
| Contexte en panne/reprise | PASS | 503 visible et reprise sans donnée résiduelle |
| Mois en panne/reprise | PASS | 503 visible, aucun faux vide, reprise sans rechargement global |
| Isolation tenant et identité inactive | PASS | 404 inter-tenant; identité inactive 401 |
| 390×844 — 3 thèmes | PASS 3/3 | Zéro overflow, zéro contrôle hors viewport |
| 768×1024 — 3 thèmes | PASS 3/3 | Zéro overflow, zéro contrôle hors viewport |
| 1440×900 — 3 thèmes | PASS 3/3 | Zéro overflow, zéro contrôle hors viewport |
| 2560×1440 — 3 thèmes | PASS 3/3 | Zéro overflow, zéro contrôle hors viewport |
| F5, clavier, zoom 200 %, console | PASS | Session persistante, focus visible, zéro contrôle hors viewport et zéro erreur critique |
| Lecteur d'écran réel | NOT_VERIFIED | Runtime non disponible |

Verdict final : **PASS — ACCEPTED_IN_QA — PR_READY — NOT_DEPLOYED**.
