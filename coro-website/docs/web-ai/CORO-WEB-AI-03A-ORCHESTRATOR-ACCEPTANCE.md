# CORO WEB-AI-03A — Orchestrateur conversationnel

## Verdict

`PASS_LOCAL_SIMULATED_PROVIDER`

Branche `feature/web-ai-03-intelligent-assistant`, base `4caf244ef660fccb785888124bef32090fb87cf9`. Aucun fournisseur réel, fusion, déploiement ou activation publique.

## Architecture livrée

- `POST /api/chat/v1/public-assistant`, DTO strict, limitation Nest et activation explicite par `WEB_AI_INTELLIGENT_ASSISTANT_ENABLED=true`.
- Orchestrateur serveur unique : normalisation, recherche WEB-AI-02, budget de quatre sources, fournisseur simulé, validation de fondement, citations et liens officiels.
- Sessions anonymes éphémères : identifiant opaque, 30 minutes, 8 tours, 16 000 caractères et 200 sessions maximum; aucune persistance navigateur ou base.
- Seul `PublicKnowledgeSearchService` fournit le contexte. Le navigateur ne peut choisir ni corpus, tenant, fournisseur ou source.
- Tout fournisseur autre que `simulated` échoue avant la recherche avec `WEB_AI_REAL_PROVIDER_NOT_AUTHORIZED`.

## Comportements

Les réponses couvertes retournent des citations canoniques. Les sources insuffisantes, contradictoires, mal formées ou inventées produisent une abstention. Les pannes de recherche ou du fournisseur produisent un mode dégradé explicite; le site demeure disponible.

## Vérifications

- 6 suites backend ciblées : 38/38 tests réussis.
- Fournisseur simulé : normal, réponse mal formée, citation inventée, délai, indisponibilité, injection et hors sujet.
- Build backend : réussi.
- Contrat DTO : message 2 000 caractères, langue FR-CA/EN-CA, UUID de session et chemin public seulement.

## Limites

La qualité sémantique d'un modèle réel n'est pas démontrée. L'identité SQL dédiée en lecture seule demeure une exigence d'activation; l'exercice local a utilisé une base PostgreSQL 16 synthétique et isolée. Aucun contenu privé n'a été chargé.
