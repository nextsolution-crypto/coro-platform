# CORO Web AI — architecture fournisseur réel

Date d'évaluation : 2026-10-27

Base inspectée : `b96002fc20dd6c3d1c92011b72c23795dd6e945c`

Statut : préparation seulement, aucun appel de modèle

## État démontré

Le site public, CORO Public Knowledge et le mode simulé restent indépendants d'AWS. En production, les points d'entrée Public Knowledge et assistant intelligent sont désactivés et répondent en mode indisponible contrôlé. L'image backend actuelle repose sur `node:22-bookworm-slim` : elle est Debian/glibc, et non Alpine.

Le chemin Bedrock existant est un adaptateur de CORO Knowledge privé. Il utilise `BedrockRuntimeClient`, `ConverseCommand`, un profil AWS résolu par `credential_process`, un résultat outillé strict et une liste blanche de citations. Il ne doit pas être branché tel quel sur le site public : ses sources sont des `ProjectFile` privés, alors que le site doit consommer exclusivement les DTO de CORO Public Knowledge.

L'orchestrateur public est volontairement limité au fournisseur `simulated`. `PublicAssistantConfig.assertSafeProvider()` refuse toute autre valeur. Une activation par variables seulement échouerait donc correctement.

## Architecture cible minimale

```text
Navigateur public
  -> API publique / chat (limites, validation, sessions éphémères)
  -> recherche CORO Public Knowledge (identité SQL lecture seule)
  -> admission documentaire publique
  -> interface PublicAssistantProvider
       -> simulated (valeur par défaut et repli)
       -> bedrock-web-public (désactivé par défaut)
            -> contexte public borné
            -> Converse / ca.amazon.nova-lite-v1:0
            -> schéma outillé strict
  -> validation après fournisseur
  -> citations recoupées avec les seules sources admises
  -> réponse ou abstention
```

## Règles non négociables

- Politique explicite `WEB_PUBLIC`; aucune réutilisation implicite de `BUILDING_PRIVATE`.
- Aucun `ProjectFile`, identifiant client, organisation, bâtiment ou donnée privée dans le contexte public.
- Recherche et citations autorisées avant l'appel puis revalidées après la réponse.
- Limites d'entrée, de contexte, de sortie, de temps et de coût avant toute invocation.
- Les instructions présentes dans les sources sont des données non fiables.
- Le modèle n'a aucune autorité de commande, mutation ou action d'urgence.
- Le site et la recherche restent disponibles quand le fournisseur est coupé.

## Interrupteurs

L'activation doit exiger simultanément :

1. `WEB_AI_INTELLIGENT_ASSISTANT_ENABLED=true`;
2. `WEB_AI_PROVIDER=bedrock`;
3. un nouveau verrou d'invocation publique explicite;
4. une politique runtime privée, root-owned et validée;
5. l'identité SQL publique lecture seule;
6. l'image backend immuable et les montages AWS en lecture seule.

Un seul interrupteur manquant doit produire un refus ou le mode simulé, jamais une activation partielle.

## Désactivation

Mettre le verrou d'invocation à `false`, conserver le corpus et l'identité SQL, puis réconcilier uniquement le backend avec l'image immuable. L'API doit revenir au fournisseur simulé ou au mode dégradé. Cette procédure ne requiert ni suppression du corpus ni modification des identités AWS.

## Condition d'implémentation

Créer un adaptateur public dédié partageant seulement les primitives sûres de l'adaptateur Bedrock existant (résolution de credentials, temporisation, métriques expurgées et parseur de schéma). Ne pas partager le type de source privé ni l'autorité de récupération.
