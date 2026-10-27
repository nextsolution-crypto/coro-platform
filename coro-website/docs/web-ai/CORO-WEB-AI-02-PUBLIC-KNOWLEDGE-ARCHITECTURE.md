# CORO WEB-AI-02 — Architecture Public Knowledge

## Autorité publique

Quatre tables additives constituent l'autorité publique :

- `PublicKnowledgeSource` : source, langue, statut, autorité, version, empreinte et contenu;
- `PublicKnowledgeChunk` : fragments, empreintes et vecteurs déterministes;
- `PublicKnowledgeCapability` : statut commercial gouverné;
- `PublicKnowledgeSyncEvent` : corrélation, résultat et diagnostic borné.

Elles ne possèdent aucune relation vers `Organization`, `Building`, `Project`, `ProjectFile`, `ClientUser`, Incident ou Sentinelle. Le contrat `POST /public-knowledge/v1/search` accepte seulement `question`, `language` et `limit`. Les sélecteurs privés sont refusés par validation stricte.

## Recherche et citations

- filtre serveur obligatoire : `PUBLISHED`, `APPROVED`, non révoqué et non expiré;
- langue stricte FR-CA ou EN-CA;
- score lexical, sémantique déterministe et rang d'autorité;
- classement et départage déterministes;
- exclusion des chunks contenant une injection détectée;
- citation construite depuis l'enregistrement serveur : source, version, URL canonique et chunk;
- statuts explicites : supported, partial, insufficient, conflicting ou blocked.

Les URLs doivent utiliser HTTPS, l'hôte exact `getcoro.io`, une route publique et uniquement le paramètre `lang=en` lorsqu'il existe. Aucun crawl Internet ni téléchargement d'URL fournie par un visiteur n'est implémenté.

## Corpus initial

Le catalogue possède 38 entrées bilingues gouvernées couvrant la plateforme, les plans, Knowledge, CORO AI, Sentinelle, Incident, Population, portail client, multisite, exercices/REX, prix, sécurité et blogue. Les capacités utilisent les statuts `AVAILABLE`, `PILOT`, `IN_DEVELOPMENT`, `PLANNED`, `RETIRED` ou `UNKNOWN`.

## Activation

- API : `WEB_AI_PUBLIC_KNOWLEDGE_ENABLED=true`; faux par défaut.
- synchronisation : `npm run knowledge:public:sync` avec confirmation explicite `PUBLIC_KNOWLEDGE_SYNC_CONFIRMATION=SYNC_PUBLIC_KNOWLEDGE`.
- aucune synchronisation automatique au démarrage.
