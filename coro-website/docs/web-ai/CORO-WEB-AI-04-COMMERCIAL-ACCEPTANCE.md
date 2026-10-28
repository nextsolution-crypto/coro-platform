# CORO WEB-AI-04 — Acceptation commerciale locale

## Verdict

`PASS_LOCAL_SIMULATED_PROVIDER`

Base vérifiée : `056ae9cbdd201409aefc57d2c8836f822a273077`. Branche : `feature/web-ai-04-05-commercial-observability`.

## Fonctionnement livré

- Classification déterministe et versionnée des intentions publiques, sans IA générative.
- Qualification progressive et facultative en FR-CA et EN-CA : type de demande, identité de contact, organisation, secteur, parc immobilier, utilisateurs, besoin, modules et échéancier.
- Consentement de traitement explicite, versionné et imposé par le serveur; consentement marketing séparé et facultatif.
- Requête commerciale idempotente par UUID, empreinte canonique du contenu et verrou transactionnel PostgreSQL.
- Création dans l’autorité canonique `CommercialProspect` uniquement après acceptation de l’adaptateur simulé.
- Échec fournisseur simulé : statut `FAILED`, aucun prospect, aucun faux succès; une reprise identique reste idempotente.
- Aucun historique de conversation, score caché ou profil sensible n’est transmis à l’adaptateur commercial.
- L’adaptateur autorisé dans ce lot est exclusivement `SIMULATED`; toute autre valeur échoue fermée.

## Booking

Une frontière typée prépare les niveaux `INFORMATION_ONLY` et `AVAILABILITY_PROPOSAL`. Elle retourne toujours `BOOKING_NOT_ACTIVATED`, `externalCallMade: false` et `bookingCreated: false`. Aucun système de réservation, calendrier ou rendez-vous réel n’est activé.

## Preuves

- Tests backend ciblés WEB-AI : 17/17.
- Suite backend : 2 265 réussis, 2 ignorés; un échec environnemental OCR préexistant (`pdftoppm` absent), sans lien avec ce lot.
- Tests site : 720/720.
- Builds hermétiques Turbopack : backend, site public et frontend administrateur réussis.
- Chrome réel sur build local de production : déclenchement commercial FR/EN, formulaire facultatif, consentements distincts, 1440 px, 390 px et 320 px, aucune erreur console.
- Aucun appel Bedrock, Anthropic, Brevo ou Booking réel.

## Limites

- La livraison Brevo réelle est volontairement `NOT_VERIFIED` et non activée.
- La réservation réelle est volontairement `NOT_IMPLEMENTED`.
- La campagne navigateur exhaustive multi-moteurs n’est pas incluse; la preuve locale porte sur Chrome.
