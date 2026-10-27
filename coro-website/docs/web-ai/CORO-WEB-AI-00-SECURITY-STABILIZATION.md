# CORO WEB-AI-00 — Stabilisation de sécurité

Date : 2026-10-27

Branche : `fix/web-ai-00-security-stabilization`

Base : `7fcfb0e5102d79fa8e3ed50dae132f0bbef88fa6`
Statut : **VALIDÉ LOCALEMENT AVEC RÉSERVES DOCUMENTÉES**

## Périmètre

Ce lot stabilise l'assistant public existant. Il ne raccorde pas CORO Knowledge, ne crée pas de RAG, n'active aucun fournisseur réel et ne modifie ni la production ni une base de données.

## Correctifs livrés

- Suppression de tout courriel automatique déclenché par un mot-clé. Un mot-clé commercial ne fait qu'afficher un formulaire facultatif.
- Consentement explicite obligatoire avant la transmission du courriel et d'un résumé borné à 1 500 caractères.
- Le succès visuel exige un HTTP réussi **et** une réponse Brevo valide contenant un identifiant de message.
- Échappement HTML caractère par caractère de toutes les valeurs injectées dans le courriel (texte, attributs, guillemets et Unicode couverts).
- Identifiant UUID d'idempotence, blocage UI des doubles clics et coalescence serveur des demandes concurrentes.
- DTO stricts : message de 2 000 caractères maximum, dix éléments d'historique maximum, rôles `user`/`assistant` uniquement, courriel valide, consentement vrai et UUID v4.
- Corps HTTP `/api/chat` limité à 32 Kio avant le parseur global.
- Quotas dédiés : chat 8/minute et 60/heure; contact 3/minute et 10/heure.
- Délais maximum : Anthropic 15 secondes; Brevo 10 secondes.
- Contrôle de `response.ok`, validation de la forme des réponses et modes dégradés explicites.
- Prompt statique corrigé : PMU/PSI/PCA confirmés; PGC/PRA/PUE décrits comme planifiés, jamais comme disponibles.
- Aucun secret, contenu visiteur ou réponse fournisseur n'est journalisé.

## Architecture et limites connues

Les quotas Nest et la coalescence d'idempotence sont actuellement en mémoire du processus. Ils protègent une instance et empêchent les doubles clics concurrents locaux, mais ne constituent pas une garantie distribuée multi-instance. Avant une mise à l'échelle horizontale, le stockage des compteurs et des clés d'idempotence doit être déplacé vers une autorité partagée (par exemple Redis), avec TTL et opérations atomiques.

Le contrat historique `transferToAgent` est conservé pour compatibilité, mais signifie désormais uniquement « afficher la proposition de contact ». `contactSuggested` est le champ canonique. Aucun transfert ni envoi ne se produit dans `handleMessage`.

## Tests et contrôles

| Contrôle | Résultat |
|---|---|
| Tests sécurité chat backend | PASS — 15/15 |
| Tests site complets | PASS — 713/713 |
| TypeScript backend | PASS après génération du client Prisma verrouillé |
| TypeScript site | PASS |
| ESLint ciblé backend/site | PASS |
| Build backend | PASS |
| Build Next.js | PASS; sitemap statique utilisé, API blog indisponible dans le réseau isolé |
| `git diff --check` | PASS |
| Non-régression Knowledge | PARTIAL — 72/73; seul le test OCR PNG est bloqué par l'absence locale de `pdftoppm` |
| Audit dépendances site (production) | PASS — 0 vulnérabilité rapportée |
| Audit dépendances backend (production) | RÉSERVE — 10 avis préexistants : 1 modéré, 8 élevés, 1 critique |

Les tests couvrent : injection HTML/script/attributs, Unicode, données longues, rôles interdits, consentement, limites, mot-clé sans notification, erreurs HTTP, réponse fournisseur invalide, configuration absente et double soumission concurrente. Tous les appels fournisseurs sont simulés.

La revue d'intégration de release a aussi aligné le widget sur le contrat serveur : dix messages d'historique au maximum, 2 000 caractères par message et normalisation des chaînes avant validation.

## Sécurité fournisseur

Aucun appel Anthropic, Brevo, Bedrock ou autre fournisseur réel n'a été exécuté. Les clés de l'environnement ne sont ni lues dans les preuves ni imprimées. Les tests utilisent uniquement les valeurs factices `test-only` et des fonctions HTTP injectées.

## Fichiers principaux

- `coro-backend/src/chat/chat.dto.ts`
- `coro-backend/src/chat/chat.controller.ts`
- `coro-backend/src/chat/chat.service.ts`
- `coro-backend/src/chat/chat.module.ts`
- `coro-backend/src/main.ts`
- `coro-website/app/components/ChatWidget.tsx`
- tests ciblés backend et site associés

## Verdict

WEB-AI-00 est stabilisé localement dans le périmètre autorisé. Le lot n'est ni fusionné ni déployé. L'unique réserve d'exécution est le test OCR historique nécessitant `pdftoppm`; elle est indépendante du chat public et aucun défaut de régression produit n'a été observé dans les 72 autres tests Knowledge.

L'audit npm backend signale notamment `body-parser@2.3.0`, `proxy-addr@2.0.7`, `multer@2.2.0`, `@xmldom/xmldom@0.8.13`, `qs@6.15.2` et une dépendance transitive `zod`. Aucun `trust proxy` explicite n'a été trouvé dans le code backend, ce qui limite le scénario d'usurpation d'adresse signalé pour `proxy-addr`, mais ne clôt pas la dette de dépendances. Leur mise à niveau doit faire l'objet d'un lot séparé avec régressions HTTP, upload, XML, PDF/OCR et proxy; aucun `npm audit fix` automatique n'a été appliqué dans WEB-AI-00.
