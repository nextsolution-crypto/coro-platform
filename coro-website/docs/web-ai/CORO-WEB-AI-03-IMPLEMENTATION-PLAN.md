# CORO WEB-AI-03 — Plan d’implémentation

## Statut

- **Phase :** préparation seulement
- **Implémentation :** non commencée
- **Activation publique :** non autorisée
- **Appels Bedrock réels :** non autorisés
- **Dépendance :** WEB-AI-02 déployé avec `WEB_AI_PUBLIC_KNOWLEDGE_ENABLED=false`

## Objectif

Connecter progressivement l’assistant public existant au corpus CORO Public Knowledge afin de produire des réponses bilingues, fondées sur des sources publiques gouvernées et accompagnées de citations vérifiables. L’assistant demeure consultatif, sans autorité opérationnelle et sans accès aux données privées ou multi-tenant.

## Architecture cible

1. Le widget public envoie une question et la langue demandée à une API publique versionnée.
2. Une couche d’orchestration applique les limites de taille, le contrôle d’abus, la validation linguistique et le coupe-circuit.
3. Le service de récupération WEB-AI-02 interroge uniquement la base publique avec l’identité SQL en lecture seule.
4. Le service de contexte sélectionne les passages autorisés, conserve leur provenance et impose un budget documentaire.
5. Un adaptateur de génération produit une réponse structurée à partir du seul contexte fourni. Les essais initiaux utilisent un fournisseur déterministe simulé.
6. Un validateur de fondement refuse les affirmations sans appui, vérifie les citations et transforme les cas insuffisants en réponse explicite d’incertitude.
7. L’API retourne réponse, langue, citations canoniques, état de confiance documentaire et mode de fonctionnement.

Le site public reste fonctionnel si l’API, la recherche ou le fournisseur est indisponible. Aucun contexte privé, `ProjectFile`, secret, réponse de Diagnostic Express ou renseignement client ne peut entrer dans ce chemin.

## Composants prévus

- `PublicAssistantController` : contrat HTTP public versionné et validation d’entrée.
- `PublicAssistantOrchestrator` : séquence récupération, génération, validation et mode dégradé.
- `PublicKnowledgeSearchService` : réutilisation stricte du moteur WEB-AI-02.
- `PublicContextBuilder` : sélection, déduplication, limites et conservation de la provenance.
- `PublicAnswerProvider` : interface de fournisseur; simulateur déterministe obligatoire en QA.
- `PublicGroundingValidator` : correspondance affirmations/sources, liens canoniques et refus d’invention.
- `PublicConversationStore` : mémoire éphémère bornée dans le navigateur ou par jeton opaque de courte durée; aucune persistance par défaut.
- `PublicAssistantPolicy` : langue, limites, fonctionnalités commercialisées et réponses interdites.
- `PublicAssistantCircuitBreaker` : arrêt immédiat, quotas, temporisation et repli statique.
- widget FR-CA/EN-CA : historique local limité, citations accessibles, suggestions et réinitialisation.

## Contrats et dépendances

- Migration WEB-AI-02 appliquée et tables publiques disponibles.
- Identité SQL dédiée `PUBLIC_KNOWLEDGE_DATABASE_URL`, lecture seule et sans accès aux tables privées.
- Feature flags distincts pour recherche publique et génération conversationnelle.
- Corpus gouverné, versionné, publiable/révocable et synchronisé.
- Adaptateur simulé avant toute décision d’activation Bedrock.
- Décision séparée requise pour fournisseur réel, budget, rétention, journalisation et consentement.
- Aucun SDK analytique ou stockage de conversation ajouté implicitement.

## Phases proposées

### WEB-AI-03A — Contrats et simulateur

- figer le contrat API et les codes d’erreur;
- intégrer le fournisseur déterministe simulé;
- construire le contexte à partir des résultats WEB-AI-02;
- ajouter citations, incertitude et refus fondés;
- conserver tous les flags désactivés par défaut.

### WEB-AI-03B — Interface bilingue

- connecter le widget au contrat simulé;
- ajouter FR-CA/EN-CA, citations accessibles et liens officiels;
- limiter et réinitialiser le contexte conversationnel;
- afficher clairement les modes indisponible, dégradé et sans réponse.

### WEB-AI-03C — Sécurité et qualité

- évaluer injection de prompt, exfiltration, contournement de corpus et abus;
- vérifier l’absence d’accès aux données privées;
- mesurer exactitude, fondement, qualité des citations et refus appropriés;
- tester quotas, concurrence, temporisation et coupe-circuit.

### WEB-AI-03D — Préparation fournisseur

- produire une étude Bedrock séparée sans invocation réelle;
- confirmer région, modèle, identité temporaire, coûts et traitement des données;
- obtenir une autorisation explicite avant tout trafic réel;
- exécuter ensuite une campagne contrôlée distincte si autorisée.

## Matrice de tests minimale

- questions couvertes et non couvertes, FR et EN;
- ambiguïtés, contradictions et informations manquantes;
- citations existantes, révoquées, obsolètes ou mal formées;
- changement de langue en cours de conversation;
- injection directe et indirecte dans une source;
- tentative d’accès à un tenant, un bâtiment, un `ProjectFile` ou un secret;
- requêtes longues, répétées, concurrentes et malformées;
- fournisseur, base, recherche ou réseau indisponible;
- coupe-circuit activé, flags désactivés et repli statique;
- navigation clavier, lecteur d’écran, mobile et thèmes;
- absence de cookies, d’analytics et de persistance non autorisés;
- non-régression du site public lorsque l’assistant est désactivé.

## Critères d’acceptation avant activation

- aucune donnée privée accessible par l’identité SQL publique;
- citations canoniques exactes pour chaque affirmation factuelle;
- refus explicite lorsque le corpus ne permet pas de répondre;
- aucune fonctionnalité future présentée comme disponible;
- résultats de sécurité et d’évaluation au seuil approuvé;
- quotas, coupe-circuit et mode dégradé démontrés;
- coût et exploitation approuvés;
- fournisseur réel autorisé séparément;
- rollback vérifié et site public indépendant de l’IA.

## Risques principaux

- injection de prompt dans les questions ou le corpus;
- réponse plausible mais insuffisamment fondée;
- citation correcte associée à une affirmation incorrecte;
- dérive bilingue ou statut commercial obsolète;
- consommation excessive et déni de service;
- mémorisation ou journalisation involontaire de données personnelles;
- confusion entre information publique et conseil opérationnel;
- dépendance au fournisseur affectant le site public.

Chaque risque doit disposer d’un contrôle vérifiable, d’un test de régression et d’un comportement fail-closed avant activation.

## Décision de préparation

L’architecture peut être développée après une autorisation WEB-AI-03 explicite. Le premier lot doit rester entièrement simulé et désactivé par défaut. L’activation du moteur public et tout appel Bedrock demeurent des décisions distinctes.
