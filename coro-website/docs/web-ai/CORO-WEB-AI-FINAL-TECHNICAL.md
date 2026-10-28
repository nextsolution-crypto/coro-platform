# CORO WEB-AI-FINAL — Rapport technique

Date : 2026-10-27. Branche : `feature/web-ai-03-live-readiness`.

## Architecture livrée

- `DocumentaryPublicAssistantProvider` construit une réponse déterministe à partir des seules sources admises par CORO Public Knowledge. Il n'appelle aucun fournisseur.
- `PublicAssistantProviderGateway` sépare les modes `documentary`, `simulated` et `bedrock`.
- `BedrockWebPublicProvider` prépare la politique isolée `WEB_PUBLIC`, Converse non streaming, Nova Lite canadien, sortie structurée, temps d'attente borné et aucune relance automatique.
- L'orchestrateur conserve la recherche, la validation des citations, le registre de navigation et les sessions éphémères existants.
- Le widget affiche maintenant les extraits, les sources et un mode de secours avec liens officiels.

## Configuration

Le mode par défaut est `WEB_AI_PROVIDER=documentary`. L'API demeure fermée tant que `WEB_AI_INTELLIGENT_ASSISTANT_ENABLED` n'est pas `true`. Bedrock exige en plus `WEB_AI_BEDROCK_INVOCATION_ENABLED=true`; cette deuxième serrure reste interdite en production dans ce mandat. Le modèle et la région acceptés sont exclusivement `ca.amazon.nova-lite-v1:0` et `ca-central-1`.

## Limites

Le mode documentaire requiert le corpus synchronisé et `PUBLIC_KNOWLEDGE_DATABASE_URL`. Aucun fallback vers l'identité Prisma principale n'est autorisé lorsque Public Knowledge est activé. L'activation de production reste conditionnée à une identité SQL publique vérifiée.
