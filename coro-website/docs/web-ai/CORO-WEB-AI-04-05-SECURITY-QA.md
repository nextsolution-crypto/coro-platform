# CORO WEB-AI-04/05 — Sécurité et QA

## Frontières démontrées

| Contrôle | Résultat |
|---|---|
| Fournisseur commercial non simulé | Refus fermé |
| Consentement de traitement absent | Refus avant écriture |
| Version/action de consentement falsifiée | Refus par validation DTO |
| Réutilisation identique d’une clé | Rejeu sans doublon |
| Même clé avec contenu différent | Refus `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` |
| Échec fournisseur simulé | Aucun prospect, aucun succès |
| Données personnelles vers l’adaptateur | Aucune; seulement ID, type et langue |
| Télémétrie brute/PII | Absente du schéma et des écritures |
| Panne télémétrie | Dégradation non bloquante |
| Tableau de bord | Super Admin seulement |
| Booking réel | Désactivé par construction |
| Bedrock/Anthropic/Brevo réels | Aucun appel |

## PostgreSQL 16 jetable

- Instance isolée : `coro-web-ai-04-05-pg16`, port local 55405, données synthétiques seulement.
- Migration complète depuis zéro : PASS, 157 migrations.
- Migration finale : `20261111010000_web_ai_commercial_observability` appliquée.
- Intégrité : PK, FK `prospectId`, UUID d’idempotence unique, clé d’événement unique, unicité catégorie/lacune et index temporels vérifiés.

## Validation technique

- Backend ciblé : 5 suites, 17 tests, PASS.
- Backend complet : 239 suites réussies, 1 ignorée; 2 265 tests réussis, 2 ignorés. Seul échec : test OCR réel exigeant `pdftoppm`, outil absent de la machine.
- Site complet : 720 tests, PASS.
- Frontend navigation : 29 tests, PASS; contrat WEB-AI : PASS.
- TypeScript et builds de production des trois applications : PASS avec dépendances hermétiques locales.
- `npm audit --omit=dev` : backend 0, site 0. Frontend : une vulnérabilité haute `zod <4.6.6`, déjà présente dans la base et non introduite par ce lot; suivi séparé requis.

## Recette navigateur

Chrome réel, build local de production, API simulée locale et réseau fournisseur inexistant :

- FR-CA et EN-CA : PASS.
- Déclenchement d’une intention démonstration/devis : PASS.
- Formulaire, annulation, consentement traitement et marketing séparé : PASS.
- 1440, 390 et 320 px : PASS sans débordement horizontal observé.
- Console : aucune erreur.
- Aucun envoi de formulaire réel pendant la recette.

## Réserves

- Lecteur d’écran humain et matrice multi-navigateurs : `NOT_VERIFIED`.
- Tableau Super Admin authentifié en navigateur : `NOT_VERIFIED`.
- La vulnérabilité Zod historique doit être mise à niveau dans un lot dépendances contrôlé.
- Le test OCR complet requiert Poppler/`pdftoppm` dans l’image QA; le code WEB-AI ciblé n’en dépend pas.
