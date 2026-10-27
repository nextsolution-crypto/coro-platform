# CORO WEB-AI-02 — Plan d'implémentation CORO Public Knowledge

Date : 2026-10-27

Statut : **ARCHIVE DE CONCEPTION — IMPLÉMENTATION LOCALE TERMINÉE; VOIR `CORO-WEB-AI-02-FINAL-ACCEPTANCE.md`**

> Ce document conserve le plan préalable. Le schéma minimal livré regroupe la
> version courante dans `PublicKnowledgeSource` et génère les citations depuis
> `PublicKnowledgeSource` + `PublicKnowledgeChunk`; les preuves effectives et
> réserves se trouvent dans les rapports WEB-AI-02 finaux.

## 1. Architecture retenue

Créer une autorité documentaire publique distincte de `ProjectFile` et de CORO Knowledge privé. Le pipeline public réutilisera les composants purs et génériques déjà éprouvés — normalisation, chunking, recherche hybride, admission, grounding, citations et interface fournisseur — sans réutiliser les tables, identifiants, routes ni règles d'autorisation des documents clients.

Flux proposé :

`registre public approuvé → capture versionnée → extraction locale → chunks publics → index public → recherche publique → admission/grounding → réponse et citations publiques`

Le contrôleur du chat public appellera uniquement un futur `PublicKnowledgeAnswerService`. Aucun service ne recevra un `organizationId`, `buildingId`, `projectFileId` ou contexte d'incident. Une dépendance au module Knowledge privé sera interdite par test d'architecture.

## 2. Modèle de données public

Tables additives proposées :

- `PublicKnowledgeSource` : URL canonique, type, langue, statut de publication, statut commercial approuvé, propriétaire éditorial, dates de validité.
- `PublicKnowledgeVersion` : empreinte SHA-256, contenu normalisé, horodatage de capture, statut courant/supplanté/retiré, provenance.
- `PublicKnowledgeChunk` : version, ordre, section, texte, termes lexicaux et vecteur si l'option sémantique est approuvée.
- `PublicKnowledgeCitation` : chunk, URL publique exacte, titre, ancre/section et version.
- `PublicKnowledgeSyncJob` : état, tentative, diagnostic borné, idempotence et fraîcheur.
- `PublicCapabilityCatalogueEntry` : identifiant stable, libellés FR/EN, statut commercial, preuve d'approbation, URL publique facultative, dates d'effet.

Ces tables ne comportent aucune relation vers Organization, Building, Project, ProjectFile, Incident ou Sentinelle. Les contraintes de base empêchent une citation sans source et version publiques actives.

## 3. Sources d'ingestion

Le registre explicite, révisé humainement, autorisera seulement :

- pages officielles publiées de `getcoro.io`;
- fiches de modules approuvées;
- articles de blogue publiés;
- FAQ publiques;
- informations commerciales approuvées;
- catalogue de fonctionnalités approuvé;
- registre des URL publiques canoniques.

Pas de crawl Internet ouvert, de découverte automatique de sous-domaines, d'import de `app.getcoro.io`, `client.getcoro.io`, API privées, stockage documentaire ou sitemap non approuvé.

## 4. Synchronisation

- Liste blanche de domaines, routes et langues.
- Récupération avec limites de taille, délais, type MIME et redirections contrôlées.
- Normalisation et empreinte avant création d'une nouvelle version.
- Publication de l'index seulement après validation complète; conservation de la version précédente en cas d'échec.
- Retrait immédiat du corpus courant lorsqu'une source est retirée, expirée ou non approuvée.
- Jobs idempotents, reprises bornées, journal d'audit sans contenu sensible.
- Fraîcheur affichée et alerte si une source dépasse son délai de révision.

## 5. Recherche

Réutiliser les algorithmes de `KnowledgeNormalizer`, `KnowledgeChunkerService`, recherche lexicale et calculs d'embeddings uniquement après extraction dans des composants sans dépendance `ProjectFile`.

Ordre initial :

1. filtre obligatoire `PUBLIC + ACTIVE + langue`;
2. recherche lexicale déterministe;
3. recherche sémantique facultative dans l'index public seulement;
4. fusion et classement bornés;
5. seuil minimal d'admission avant fournisseur;
6. abstention si les preuves sont insuffisantes ou contradictoires.

## 6. Citations et grounding

- Citation limitée aux identifiants retournés par la recherche publique autorisée.
- URL issue du registre serveur, jamais du modèle.
- Validation finale de l'existence, du statut et de la version de chaque citation.
- Réponse sans citation interdite pour une affirmation factuelle CORO.
- Contradictions et informations manquantes affichées explicitement.
- Injection de prompt dans une page traitée comme contenu non fiable, jamais comme instruction.

## 7. Isolation des données

Gates obligatoires :

- module Nest distinct et dépôt de données distinct;
- compte/base ou schéma avec privilèges limités aux tables publiques;
- aucune injection de `PrismaService` privé dans la couche de réponse publique si un client dédié peut être utilisé;
- aucune route de secours vers `/knowledge`, ProjectFile ou stockage privé;
- aucune identité Platform Authority comme mécanisme de lecture publique;
- tests négatifs garantissant zéro requête aux tables privées;
- deny-by-default réseau pour l'ingestion, avec liste blanche `getcoro.io` seulement;
- télémétrie sans question brute, réponse, adresse courriel ou contenu de source.

## 8. Catalogue commercial

Le statut est une donnée éditoriale approuvée, jamais déduite du code :

- `AVAILABLE` — Disponible;
- `PILOT` — En pilote;
- `IN_DEVELOPMENT` — En développement;
- `PLANNED` — Prévu;
- `RETIRED` — Retiré.

Une réponse commerciale doit citer l'entrée active du catalogue. `RETIRED` est exclu des recommandations courantes; les trois statuts non disponibles doivent être qualifiés sans promesse opérationnelle. Toute modification exige acteur interne autorisé, justification, concurrence optimiste et audit.

## 9. Contrats API

Proposition :

- `POST /api/public-ai/messages` : question bornée, historique borné et identifiant de requête; réponse typée avec statut, texte facultatif, incertitude et citations publiques.
- `POST /api/public-ai/contact` : conserver le contrat WEB-AI-00 séparé, avec consentement, résumé borné et idempotence.
- `GET /api/public-ai/sources/:citationId` : redirection uniquement vers l'URL publique canonique active ou réponse 404 sans fuite.

Statuts applicatifs : `ANSWERED`, `INSUFFICIENT_EVIDENCE`, `CONFLICTING_EVIDENCE`, `PROVIDER_UNAVAILABLE`, `RATE_LIMITED`. Aucun résultat individuel dans l'URL.

## 10. Tests

- ingestion bilingue, version, retrait, expiration, fraîcheur et reprise;
- refus de domaines, redirections, MIME et tailles non autorisés;
- recherche lexicale/sémantique déterministe et déduplication;
- citations exactes, retirées, inventées, croisées entre langues et contradictoires;
- injection de prompt dans source et question;
- tests canaris prouvant l'absence d'accès ProjectFile, clients, incidents et Sentinelle;
- catalogue pour les cinq statuts et absence de déduction depuis le code;
- quotas, limites, délais, idempotence, dégradation et multi-instance;
- tests FR/EN, accessibilité et responsive du widget;
- évaluation de grounding sur corpus synthétique versionné;
- aucun appel Bedrock réel dans la QA de ce chantier.

## 11. Risques

- contamination entre corpus public et privé;
- dérive du contenu public ou du statut commercial;
- prompt injection provenant d'une page officielle compromise;
- citations vers une version retirée ou une URL redirigée;
- index obsolète après publication du site;
- coûts et latence d'une recherche sémantique ou d'un fournisseur réel;
- quotas/idempotence en mémoire incompatibles avec plusieurs instances;
- collecte excessive dans les journaux;
- bilinguisme incomplet ou réponse fondée sur la mauvaise langue.

## 12. Ordre de développement

1. Registre des sources et catalogue commercial, avec autorité éditoriale.
2. Schéma public isolé et tests canaris de non-accès privé.
3. Ingestion locale, versionnement et synchronisation fail-closed.
4. Index lexical public et citations canoniques.
5. Recherche hybride publique et évaluation déterministe.
6. Service de grounding simulé et contrat API public.
7. Intégration du widget, modes dégradés et accessibilité.
8. QA de sécurité, corpus synthétique, charge et multi-instance.
9. Décision distincte d'activation du fournisseur gouverné.

## 13. Critères d'acceptation

- 100 % des réponses factuelles comportent au moins une citation publique active et vérifiable.
- Zéro accès observé aux tables ou objets privés dans les tests canaris et E2E.
- Sources retirées ou supplantées absentes de la recherche courante.
- Statuts commerciaux conformes au catalogue approuvé.
- Abstention correcte lorsque la couverture ou la pertinence est insuffisante.
- FR/EN, quotas, tailles, délais, idempotence et dégradation validés.
- Aucun secret ni contenu visiteur sensible dans les journaux.
- Aucun trafic Bedrock réel sans autorisation distincte.
- Revue sécurité et E2E terminées avant toute fusion ou publication.

## Décision de préparation

Architecture proposée : séparation physique et logique du corpus public.

Corpus public : défini, sous registre explicite.

Composants réutilisables : normalisation, chunking, recherche, grounding, citations, provenance et interface fournisseur après découplage de ProjectFile.

Prêt pour développement : **OUI, sous réserve d'une autorisation WEB-AI-02 explicite et de la validation du catalogue commercial initial.**
