# Audit ciblé — planification d’équipe

Date : 2026-10-30

Candidat audité : `f638d7be73a4e96c6cf2e6e8c578a1d92b411df3`

Branche isolée : `audit/organization-team-planning`

## Périmètre réel

L’écran `/planning` agrège les activités, réservations, affectations, horaires, indisponibilités et une projection de capacité. Il permet aux administrateurs de créer une activité, choisir un créneau et une équipe, replanifier, réaffecter ou annuler. Les opérateurs disposent d’une vue minimisée de leurs collègues. Les routes canoniques sont sous `/api/planning`; les données restent liées aux autorités `ProjectActivity`, `Booking`, `BookingAssignment`, `WorkSchedule`, `TimelogEntry` et `ProjectMandate`.

La capacité affichée est explicitement une **charge engagée informative sur 12 semaines**. Elle additionne charge confirmée, provisoire et reste non ventilé des mandats, en tenant compte des heures réellement saisies. Elle n’est ni une feuille de temps, ni une preuve de disponibilité instantanée, ni une projection adaptée à la période visible.

## Méthode

- Stack jetable : PostgreSQL 16, 162 migrations, backend/frontend/portail réels, MFA local, fournisseurs simulés et réseau sans egress fournisseur.
- Deux organisations synthétiques, administrateurs distincts, conseiller et identité révoquée.
- Tests unitaires : frontend 75/75; backend planner 59/59.
- Parcours API : contexte, lecture équipe, création, prévisualisation, planification, conflit, replanification, annulation et refus inter-tenant.
- Chrome : 390×844, 768×1024, 1440×900, 2560×1440; Classic, Glass Light et Glass Dark.
- Preuves : `D:\CORO-QA\audits\organization-team-planning\2026-10-30`.

## Résultat

L’isolation tenant, les refus directs, l’unicité de réservation, la persistance, F5, le clavier, le zoom 200 % et l’annulation cohérente sont démontrés. La fonction n’est toutefois pas acceptée sans réserve : PLAN-001 bloque le parcours UI « créer puis planifier » et PLAN-002 rend des contrôles partiellement inaccessibles à 390 px. PLAN-003 peut présenter une panne des actions mensuelles comme une liste vide.

Verdict : **AUDIT_COMPLETE — CORRECTION_REQUIRED**.

## Limites honnêtes

- Lecteur d’écran réel : `NOT_VERIFIED`.
- Export, synchronisation calendrier, Outlook et programme annuel : `NOT_APPLICABLE` à la V1 observée.
- Aucune livraison externe réelle n’a été déclenchée.
- Aucun code produit, migration ou environnement de production n’a été modifié lors de l’audit initial.

## Réconciliation du lot de correction — 2026-10-30

Le candidat `fix/organization-team-planning` corrige les quatre constats sans migration. Le contrat de création est désormais `{ activityId }`, et un `requestId` UUID conservé lors d'une reprise protège la création et la planification contre un double effet après perte de réponse. Les chargements du contexte et du mois distinguent 401, 403, 503 et erreur générique, vident les projections obsolètes et offrent une reprise explicite. Les grilles, cartes et contrôles respectent la largeur disponible.

La campagne réelle sur PostgreSQL 16 et 162 migrations a démontré : reprise idempotente avec une seule activité et un seul Booking, refus inter-tenant, pannes 503 contrôlées et reprises, F5, clavier, zoom 200 %, absence d'erreur console et matrice Chrome 12/12. Preuves : `D:\CORO-QA\runs\organization-team-planning\2026-10-30`.

Verdict corrigé : **ACCEPTED_IN_QA — PR_READY — NOT_DEPLOYED**. Le lecteur d'écran réel reste `NOT_VERIFIED`; aucune livraison externe n'est applicable.
