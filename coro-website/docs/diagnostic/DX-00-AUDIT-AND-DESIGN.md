# CORO Diagnostic Express V1.0 — DX-00 Audit et conception

Date : 27 octobre 2026
Dépôt : `F:\coro-platform`
Worktree isolé : `F:\coro-platform\.worktrees\coro-diagnostic-express-v1`
Branche : `feature/coro-diagnostic-express-v1`
Baseline auditée : `80f5c4f00ddeab6c24022cdf56490293caa8456f` (`origin/main`)
Application cible : `coro-website`
Statut : **DX-00 TERMINÉ — VALIDATION EXPLICITE REQUISE AVANT DX-01**

## 1. Résumé exécutif

CORO Diagnostic Express peut être livré comme une fonctionnalité autonome du site public sans modification du backend, sans base de données et sans fournisseur d’IA. L’architecture actuelle possède déjà les fondations nécessaires : App Router Next.js, registre de routes, i18n FR/EN par paramètre de requête, métadonnées et sitemap centralisés, shell V2, composants éditoriaux, navigation responsive, CTA et formulaire commercial.

La V1 recommandée est un îlot client limité au questionnaire et à son état local, entouré d’une page serveur responsable des métadonnées, du contenu indexable, du shell et des données structurées. Le moteur de notation et le moteur de recommandations doivent être des fonctions TypeScript pures, versionnées et testées indépendamment de React.

Le diagnostic ne doit stocker ni transmettre les réponses. Il ne doit dépendre ni de CORO AI, ni d’une API opérationnelle. Le résultat doit rester disponible sans courriel. Les fonctions PDF, partage enrichi, transmission du résultat et analytics sont des lots secondaires et ne doivent pas retarder le socle.

Trois écarts d’architecture doivent être respectés pendant l’implémentation :

1. Le site ne possède pas de thème sombre global : il possède des surfaces sombres contrôlées. Une prétendue matrice « thème sombre » serait donc trompeuse.
2. Le site ne possède pas d’analytics actif identifié. Aucun SDK ni événement ne doit être ajouté avant une décision de consentement et de fournisseur.
3. Plusieurs noms de modules proposés dans le mandat ne disposent pas d’une page publique disponible (`CORO Ops`, `CORO Exercices`, `CORO Audit`, `CORO Network`). Les recommandations doivent utiliser les destinations réellement publiées et qualifier honnêtement les capacités futures.

## 2. État initial du dépôt

### 2.1 Checkout principal préservé

Le checkout principal était sur `main` au commit `22ef2c2b74c56023d25d74e39b6fc495cb02ed384` et contenait de nombreuses modifications suivies et non suivies sans rapport avec le Diagnostic Express, notamment des travaux P-5, du portail client, du backend et des actifs Knowledge/AI.

Ces éléments n’ont été ni déplacés, ni réinitialisés, ni indexés, ni modifiés.

### 2.2 Isolation retenue

Après mise à jour des références distantes, `origin/main` pointe sur :

`80f5c4f00ddeab6c24022cdf56490293caa8456f`

Un worktree dédié a été créé depuis cette référence sur la branche :

`feature/coro-diagnostic-express-v1`

Le worktree était propre avant la création du présent document. Cette méthode évite tout mélange avec les travaux locaux protégés.

### 2.3 Risques de conflit

- `coro-website/app/home/*`, la navigation, le pied de page et le registre de routes sont des zones actives récemment modifiées.
- Le Diagnostic Express devra modifier ces fichiers de manière additive et minimale.
- Les anciennes sources de page d’accueil volumineuses existent encore, mais la page active utilise `app/home/Home.tsx` et `app/home/components/Sections.tsx`. Le développement ne doit pas réintroduire de logique dans `HomePageClient.tsx`.
- Les dépendances installées dans le checkout principal correspondent à Next.js 16.3.6, alors que le manifeste actuel exige Next.js 16.4.3. Avant DX-01, exécuter `npm ci` dans le worktree et consulter la documentation Next.js fournie par cette version exacte.

## 3. Architecture du site public

### 3.1 Socle technique

| Élément | Constat |
|---|---|
| Framework | Next.js 16.4.3, App Router |
| Interface | React 19.2.8, TypeScript strict |
| Styles | CSS Modules, tokens CSS CORO, quelques fondations Tailwind |
| Icônes | `lucide-react` |
| Police | Inter Variable locale via `next/font/local` |
| Rendu | Pages serveur par défaut, îlots clients ciblés |
| URL anglaise | Même route avec `?lang=en` |
| Tests | `node:test` avec chargement TypeScript natif expérimental |
| Déploiement | Image Docker du site dans le pipeline gouverné global |

### 3.2 Routage et publication

`lib/site/routes.ts` est l’autorité des routes publiques statiques. Il distingue :

- statut de publication ;
- implémentation réelle ;
- disponibilité FR/EN ;
- indexabilité ;
- présence dans le sitemap ;
- famille de navigation.

Une nouvelle route ne doit pas être ajoutée directement au sitemap. `/diagnostic` devra être enregistrée dans ce registre avec :

- identifiant stable `diagnostic` ;
- famille `resources` ;
- `PUBLISH-NOW` seulement au moment où les critères de publication sont satisfaits ;
- FR et EN réels ;
- indexation et sitemap activés à la publication.

Durant les lots DX-01 à DX-03, une option prudente consiste à utiliser `BUILD-NOW-HIDDEN`, `indexable: false` et `sitemap: false`, puis à basculer vers `PUBLISH-NOW` lors de DX-04 après QA.

### 3.3 Internationalisation

Le site n’utilise pas de segment `/en`. Les helpers suivants sont canoniques :

- `localeFromSearchParams` ;
- `normalizeLocale` ;
- `localizedHref` ;
- `resolveAvailableLocale` ;
- `switchLocaleHref`.

La route cible sera donc :

- FR : `/diagnostic` ;
- EN : `/diagnostic?lang=en`.

Les identifiants métier doivent rester indépendants de la langue. Les contenus FR/EN doivent résider dans une configuration structurée, non être dispersés dans les composants.

Limite connue : le document racine conserve `<html lang="fr">`; `V2Shell` applique le bon `lang` sur son conteneur. Le Diagnostic Express doit suivre le contrat V2 existant sans tenter de refondre globalement la stratégie de langue dans ce lot.

### 3.4 Shell, navigation et pied de page

`V2Shell` fournit :

- lien d’évitement ;
- en-tête et navigation desktop/mobile ;
- un seul landmark `main` ;
- langue locale du contenu ;
- pied de page V2.

La navigation visible est générée par `visibleNavigation()` à partir du registre. L’emplacement recommandé pour le Diagnostic Express est le groupe **Ressources**, après Guides ou avant Blogue selon la revue éditoriale finale.

Le pied de page V2 utilise un registre distinct dans `components/conversion/footer-content.ts`. Le lien `/diagnostic` devra y être ajouté explicitement dans le groupe Entreprise ou dans un nouveau positionnement Ressources cohérent. La solution minimale est de l’ajouter au groupe Entreprise sous l’étiquette « Diagnostic Express » sans créer une cinquième colonne.

### 3.5 Page d’accueil

La page active est composée dans `app/home/Home.tsx`. Elle contient onze blocs principaux et est déjà dense. L’intégration recommandée est une bande compacte dans `Sections.tsx`, entre `Resources` et `DemoSection`, ou intégrée au bloc Ressources si la revue visuelle montre qu’un bloc autonome crée un CTA concurrent.

Le CTA doit pointer vers `/diagnostic` ou `/diagnostic?lang=en` via `localizedHref`. Il ne doit pas remplacer le CTA de démonstration existant.

### 3.6 Design system

Les pages récentes utilisent le scope `data-coro-system="v1"` fourni par `V2Shell`.

Fondations réutilisables :

- `EditorialHero` pour l’introduction ;
- `PageSection` pour le rythme vertical ;
- `EditorialBlock` pour les titres et textes ;
- `Button` pour les CTA de liens ;
- `Container` pour les largeurs ;
- `CTASection` pour la conclusion ;
- `StatusBadge` ou styles sémantiques existants lorsque pertinent.

Les contrôles interactifs du questionnaire nécessitent des boutons natifs et des radios accessibles ; le composant `Button` actuel est un lien et ne doit pas être détourné en bouton de formulaire.

Tokens pertinents :

- navy structurel, bleu informationnel, rouge signal ;
- surfaces 0, 1 et 2 ;
- états success/warning/critical/info ;
- focus visible ;
- échelle d’espacement ;
- rayons par rôle ;
- `prefers-reduced-motion` déjà globalement pris en charge.

### 3.7 Thèmes

Le site public ne comporte pas de commutateur de thème clair/sombre. Il utilise des surfaces claires et des sections navy. Par conséquent :

- la V1 doit être validée sur les surfaces qu’elle utilise réellement ;
- une « version sombre » complète est `NOT_APPLICABLE` tant qu’un thème global n’existe pas ;
- le résultat ne doit pas inventer une préférence de thème persistante.

### 3.8 Animations et responsive

Les animations existantes sont discrètes et neutralisées par `prefers-reduced-motion`. Le diagnostic doit limiter les transitions à l’opacité et au déplacement court, sans retarder le focus ni masquer les contrôles.

Le système actuel est mobile-first et emploie principalement les seuils 48 rem et 68 rem. La matrice demandée 320, 375, 390, 768, 1024, 1440 et 1920 px est compatible avec ces conventions.

## 4. SEO et données structurées

### 4.1 Fondations existantes

`buildPageMetadata()` gère :

- canonical ;
- hreflang FR-CA/EN-CA ;
- x-default ;
- Open Graph ;
- Twitter Card ;
- index/follow ;
- image sociale.

`app/sitemap.ts` construit les pages statiques depuis `staticSitemapRoutes`; les articles de blogue sont ajoutés séparément avec un comportement fail-soft.

### 4.2 Contrat proposé

La page serveur `/diagnostic` devra appeler `buildPageMetadata` avec les textes approuvés du mandat. Elle pourra publier un JSON-LD `WebPage` ou `Quiz` uniquement si le balisage reflète exactement le contenu accessible. Aucun résultat individuel ne sera routé ni indexé.

L’état du questionnaire ne doit jamais être encodé dans l’URL. La langue est le seul paramètre requis par le modèle actuel.

## 5. Formulaires, conversion et données

### 5.1 Parcours commercial existant

Le formulaire de démonstration réel est `app/DemoForm.tsx`. Il :

- envoie vers Formspree ;
- collecte prénom, nom, courriel, organisation et champs facultatifs ;
- transmet les deux cookies de recommandation existants ;
- fournit des états succès/erreur ;
- renvoie vers la politique de confidentialité.

Le composant `LeadForm` du Design Lab est une démonstration sans envoi et ne doit pas remplacer `DemoForm` en production.

### 5.2 Décision pour la V1

Le résultat complet restera accessible sans formulaire. Le CTA final dirigera vers `/contact` ou `/#demo`. Aucune réponse détaillée, aucun score et aucune priorité ne seront placés dans la query string.

La transmission volontaire d’un contexte résumé au formulaire appartient à DX-06. Elle exigera une revue de finalité, de consentement et du contrat Formspree.

### 5.3 Persistance

La V1 utilisera l’état React en mémoire. Aucun stockage serveur et aucune table ne sont requis.

La conservation dans `localStorage` n’est pas recommandée par défaut : elle prolongerait la durée de vie de réponses potentiellement sensibles au-delà du parcours. Si une reprise après fermeture devient nécessaire, elle devra être explicitement décidée et documentée.

## 6. Analytics

Aucun SDK analytics public actif n’a été identifié dans `coro-website`. Aucun mécanisme de consentement analytique n’a été identifié dans le périmètre du site.

Conséquence : les événements proposés par le mandat sont documentés mais **non autorisés pour DX-01 à DX-04**. Leur ajout nécessite une décision distincte sur :

- fournisseur ;
- consentement ;
- minimisation ;
- rétention ;
- champs permis ;
- politique de confidentialité.

En aucun cas les réponses détaillées ne doivent être envoyées à un tiers analytique.

## 7. Disponibilité réelle des modules

Le diagnostic doit utiliser un référentiel explicite, distinct du texte marketing. État constaté au moment de DX-00 :

| Référence | Statut pour le diagnostic | Destination publique | Règle éditoriale |
|---|---|---|---|
| CORO Documents — PMU, PSI, PCA | Disponible | `/gestion-documentaire` | Peut être présenté comme disponible |
| PGC, PRA, PUE | Prévu / Phase 2 | Guides seulement | Ne pas présenter comme produit disponible |
| CORO Knowledge | Disponible sous admissibilité des sources | `/coro-knowledge` | Mentionner statut, indexation, formats et droits |
| CORO AI | Disponible sous conditions | `/coro-ai` | Assistance sourcée; aucune autorité autonome |
| CORO Sentinelle | Disponible | `/sentinelle` | Ne garantit pas une présence exhaustive |
| CORO Incident | Disponible | `/coro-incident` | Utiliser pour coordination, journal et REX |
| Exercices, REX, actions correctives | Capacité disponible, page dédiée non publiée | `/resilience-operationnelle` | Ne pas lier vers `/coro-exercices` |
| CORO Ops | Page et positionnement futurs | aucune | Ne pas présenter comme module public disponible |
| CORO Network | Page publique future | `/portail-client` ou `/resilience-operationnelle` selon le propos | Ne pas lier vers `/coro-network` |
| CORO Audit | Pas de page publique dédiée | aucune | Utiliser « audits et constats » comme pratique, pas comme module vendu |
| Indice CORO | Distinct du diagnostic | `/resilience-operationnelle` | Ne jamais assimiler le score DX à l’Indice CORO |
| Bâtiments / Client | Disponible | `/portail-client` | Utiliser pour la gouvernance multi-bâtiments |

Ce tableau devra devenir une configuration versionnée utilisée par les recommandations et testée contre le registre des routes.

## 8. Architecture proposée

### 8.1 Fichiers à créer

```text
coro-website/
  app/diagnostic/
    page.tsx
    DiagnosticExperience.tsx
    diagnostic.module.css
  lib/diagnostic/
    types.ts
    config.ts
    engine.ts
    recommendations.ts
  tests/
    diagnostic-engine.test.ts
    diagnostic-recommendations.test.ts
    diagnostic-page.test.ts
```

La configuration bilingue peut rester dans `config.ts` tant que sa taille demeure lisible. Une séparation `content.ts` sera justifiée si les quarante variantes de recommandations rendent le fichier difficile à réviser.

### 8.2 Fichiers à modifier

```text
coro-website/lib/site/routes.ts
coro-website/lib/site/navigation.ts
coro-website/lib/site/v2-migration.ts
coro-website/components/conversion/footer-content.ts
coro-website/app/home/content.ts
coro-website/app/home/components/Sections.tsx
coro-website/app/home/components/sections.module.css
coro-website/tests/foundation.test.ts
coro-website/tests/sitemap.test.ts
coro-website/tests/fixtures/sitemap-static-baseline.json
```

Les modifications de la page d’accueil seront limitées à une invitation compacte. Aucun composant partagé ne sera remplacé.

### 8.3 Frontière serveur/client

`page.tsx`, composant serveur :

- résolution de langue ;
- métadonnées ;
- JSON-LD ;
- composition V2Shell ;
- texte introductif indexable.

`DiagnosticExperience.tsx`, îlot client :

- état du parcours ;
- réponses ;
- navigation ;
- focus ;
- résultat ;
- recommencer ;
- partage simple de la page si livré.

`lib/diagnostic/*`, pur TypeScript :

- types ;
- configuration ;
- validation ;
- score ;
- forces et priorités ;
- recommandations ;
- plan d’amélioration.

### 8.4 Dépendances

Aucune nouvelle dépendance n’est requise pour le socle P0. Les graphiques éventuels seront construits en HTML/CSS accessible. L’export PDF est différé tant qu’une stratégie robuste compatible avec le site n’est pas approuvée.

## 9. Modèle de domaine

### 9.1 Identifiants stables

```text
Questionnaire : CORO-DX-1.0
Scoring : SCORING-1.0
Dimensions : D1 à D8
Options : A, B, C, D, E
```

Les dates et versions sont affichées dans le résultat mais ne servent pas à créer une URL publique.

### 9.2 Réponse

| Option | Interprétation | Points | Dénominateur | Recommandation |
|---|---|---:|---|---|
| A | pratique favorable déclarée | 3 | incluse | maintien/perfectionnement |
| B | pratique partielle déclarée | 2 | incluse | structuration |
| C | pratique insuffisante déclarée | 0 | incluse | correction prioritaire |
| D | information inconnue | aucun | exclue | vérification, jamais constat négatif |
| E | non applicable déclaré | aucun | exclue | justification/prudence, jamais échec |

## 10. Méthodologie de notation proposée

### 10.1 Calcul

```text
dimensions évaluables = réponses A, B ou C
points obtenus = somme des points des dimensions évaluables
maximum évaluable = nombre de dimensions évaluables × 3
score = arrondi entier de (points obtenus / maximum évaluable × 100)
couverture = nombre de dimensions évaluables / 8 × 100
```

Si `maximum évaluable` vaut zéro, le score est `null`, jamais `NaN` ni zéro inventé.

### 10.2 Couverture et fiabilité

- 100 % : résultat complet ;
- 75 à 99 % : résultat attribuable avec réserve sur les dimensions non évaluées ;
- moins de 75 % : résultat provisoire, sans niveau affirmatif.

Le seuil de 75 % impose au moins six dimensions évaluables sur huit. Les nombres de réponses inconnues et non applicables sont affichés séparément.

Le terme « fiabilité » désigne uniquement la couverture déclarative. Il ne doit pas être présenté comme une mesure statistique de validité.

### 10.3 Niveaux

| Score | Niveau |
|---:|---|
| 0–34 | Préparation à renforcer |
| 35–59 | Préparation partielle |
| 60–79 | Préparation structurée |
| 80–100 | Préparation avancée |

Ces seuils sont configurables, versionnés et explicitement non réglementaires.

### 10.4 Priorités

Les réponses sont classées par nature avant tout départage :

1. C — capacité déclarée insuffisante ;
2. D — information à vérifier ;
3. B — capacité partielle ;
4. A — maintien ;
5. E — exclue des priorités correctives.

À statut égal, un ordre de départage stable et documenté sera utilisé. Proposition initiale : D5 Protection des personnes, D4 Coordination, D2 Conformité documentaire, D3 Préparation humaine, D7 Traçabilité, D6 Exercices, D8 Amélioration, D1 Connaissance.

Cet ordre ne modifie pas le score et ne prétend pas constituer une hiérarchie scientifique. Il sert uniquement à rendre les trois priorités reproductibles. Il doit être validé éditorialement avant DX-02.

### 10.5 Forces

Seules les réponses A peuvent devenir des forces. À égalité, l’ordre D1 à D8 est utilisé afin d’éviter une importance inventée. Un maximum de trois forces est affiché.

### 10.6 Cas de référence à verrouiller par tests

- huit A : 24/24, 100 %, couverture 100 %, niveau avancé ;
- huit B : 16/24, 67 %, couverture 100 %, niveau structuré ;
- huit C : 0/24, 0 %, couverture 100 %, niveau à renforcer ;
- 19/24 : 79 %, niveau structuré ;
- cinq dimensions évaluables : résultat provisoire ;
- huit D ou huit E : aucun score attribuable ;
- identifiant/version invalide : erreur de validation contrôlée.

## 11. Moteur de recommandations

Chaque dimension comportera cinq variantes éditoriales : maintien, structuration, correction, vérification et traitement non applicable. Cela produit quarante entrées de base.

Chaque entrée contiendra :

- constat strictement dérivé de la réponse ;
- enjeu opérationnel prudent ;
- recommandation indépendante de CORO ;
- action concrète ;
- modules pertinents ;
- disponibilité réelle ;
- destination publique vérifiée ;
- priorité de présentation.

Le moteur ne produira pas de texte génératif. Il sélectionnera les contenus versionnés de la matrice.

Règle éditoriale obligatoire : une bonne pratique vient avant la présentation de CORO. Une réponse favorable peut uniquement recommander le maintien ou le perfectionnement; elle ne doit pas être transformée artificiellement en lacune commerciale.

## 12. Parcours UX proposé

### 12.1 États

1. Introduction.
2. Questions 1 à 8.
3. Résultat complet ou provisoire.
4. Recommencer avec confirmation explicite.

### 12.2 Comportement

- Une question par écran.
- `fieldset` et `legend` pour chaque groupe.
- Radios natives ou contrôles équivalents conservant la sémantique radio.
- Suivant désactivé sans réponse.
- Précédent conserve la sélection.
- Focus programmatique sur le titre de la nouvelle question.
- Progression textuelle et visuelle annoncée via `aria-live` sobre.
- Aucun effacement automatique.
- Aucun défilement horizontal.
- Résultat lisible sans graphique ni couleur.
- Graphique éventuel accompagné d’un tableau ou résumé textuel.

### 12.3 Changement de langue

Le changement de langue doit préserver l’état tant que le composant client reste monté. Or le changement actuel est une navigation vers une nouvelle URL, ce qui remonte la page. Deux options seront évaluées pendant DX-01 :

1. sérialiser temporairement l’état dans `sessionStorage` avec suppression à la fin ;
2. accepter une confirmation avant changement de langue.

L’état ne doit pas être placé dans l’URL. L’option 1 est recommandée si elle reste strictement limitée à l’onglet et clairement nettoyée.

## 13. Confidentialité et sécurité

### 13.1 Données collectées par le socle

Le socle ne collecte aucune donnée personnelle et ne transmet aucune réponse. Les huit réponses demeurent dans le navigateur pendant la session.

### 13.2 Surface d’attaque

Le calcul local réduit la surface serveur. Les validations restent nécessaires pour :

- identifiants de questions ;
- valeurs A à E ;
- version du questionnaire ;
- exhaustivité ;
- configuration interne.

Le moteur doit refuser les valeurs inconnues et ne jamais interpréter librement une chaîne fournie par le navigateur.

### 13.3 Partage et conversion

- Le partage pointe seulement vers `/diagnostic`.
- Aucun résultat ni réponse dans l’URL.
- Aucun envoi automatique à Formspree.
- Aucun appel à CORO AI.
- Aucun secret client.
- Toute future API d’export/contact nécessitera validation serveur et limitation de fréquence.

## 14. Accessibilité et QA responsive

### 14.1 Critères P0

- parcours complet au clavier ;
- focus visible ;
- ordre logique ;
- groupe de réponses annoncé ;
- état sélectionné annoncé ;
- progression accessible ;
- retour arrière sans perte ;
- résultat compréhensible sans couleur ;
- réduction des animations ;
- zoom 200 % ;
- absence de débordement global et composant.

### 14.2 Viewports

`320`, `375`, `390`, `768`, `1024`, `1440`, `1920` px.

Les preuves devront inclure les bounding boxes du conteneur, de la carte, des options, de la navigation et des CTA. Un simple contrôle de `document.scrollWidth` ne suffira pas.

### 14.3 Captures futures

Les douze captures fonctionnelles demandées seront produites pendant DX-07 à partir de l’application exécutée, jamais à partir de maquettes.

## 15. Stratégie de tests

### 15.1 Unitaires

`diagnostic-engine.test.ts` couvrira les vingt cas imposés, les frontières de niveau, les dénominateurs nuls, les versions invalides et le déterminisme.

`diagnostic-recommendations.test.ts` couvrira les quarante combinaisons dimension/réponse, la disponibilité des modules et les règles d’absence d’invention.

### 15.2 Contrats de page

`diagnostic-page.test.ts` vérifiera :

- route enregistrée ;
- FR/EN complets ;
- métadonnées et hreflang ;
- sitemap selon le statut de publication ;
- navigation et pied de page ;
- huit questions uniques ;
- avertissements obligatoires ;
- destinations publiques existantes ;
- absence d’API, d’IA et de persistance serveur dans le socle.

### 15.3 Régressions

Avant publication :

```text
npm ci
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Le workflow PR `website-docker-check.yml` reconstruira aussi l’image Docker. La publication restera soumise au pipeline gouverné et à une autorisation explicite ultérieure.

## 16. PDF, partage, conversion et analytics

### 16.1 Export PDF

Statut DX-00 : **DIFFÉRÉ P1**.

Le site public ne possède pas actuellement une autorité PDF réutilisable appropriée à ce questionnaire. Une impression CSS peut fournir une version imprimable, mais ne doit pas être présentée comme un export PDF professionnel robuste sans validation. Le PDF ne bloque pas le socle.

### 16.2 Partage

Un partage simple de l’URL publique peut être livré après le socle via `navigator.share` avec repli « Copier le lien ». Aucun résultat individuel n’est partagé.

### 16.3 Conversion enrichie

Statut DX-00 : **DIFFÉRÉ P1**. Réutiliser `DemoForm`/Formspree après revue de consentement. Ne jamais envoyer les réponses détaillées automatiquement.

### 16.4 Analytics

Statut DX-00 : **BLOQUÉ PAR DÉCISION DE GOUVERNANCE**. Documenter les événements, ne pas instrumenter tant que fournisseur et consentement ne sont pas approuvés.

## 17. Plan d’exécution par lots

### DX-01 — Questionnaire

- page et shell ;
- contenu FR/EN ;
- introduction ;
- huit questions ;
- état local ;
- navigation et focus ;
- responsive ;
- premiers tests de composants.

Critère de sortie : parcours complet sans résultat métier inventé ni perte de réponse.

### DX-02 — Score et recommandations

- types/configuration ;
- validation ;
- score/couverture/niveau ;
- forces/priorités ;
- quarante recommandations ;
- tests unitaires exhaustifs.

Critère de sortie : résultats déterministes, cas limites et contenus validés.

### DX-03 — Restitution

- portrait ;
- synthèse ;
- forces ;
- priorités ;
- plan 0–30/30–60/60–90 ;
- modules et statuts ;
- recommencer.

Critère de sortie : scénarios A à H cohérents et accessibles.

### DX-04 — Intégration publique

- route publiée ;
- navigation ;
- pied de page ;
- invitation compacte sur l’accueil ;
- SEO/sitemap ;
- CTA vers pages réelles.

Critère de sortie : intégration visible sans surcharge et sans régression.

### DX-05 — PDF et partage

Lot P1 distinct, uniquement après validation du socle.

### DX-06 — Conversion facultative

Lot P1 distinct, soumis à la revue de confidentialité et du formulaire existant.

### DX-07 — QA finale

- tests complets ;
- navigateurs/viewports ;
- accessibilité manuelle ;
- captures ;
- SEO ;
- performance ;
- sécurité ;
- rapport et readiness.

## 18. Risques et dépendances

| Risque | Impact | Mesure |
|---|---|---|
| Surpromesse de modules futurs | Commercial et réputation | Registre de disponibilité testé |
| Confusion avec l’Indice CORO | Méthodologique | Nom, versions et avertissements distincts |
| Résultat affirmatif avec faible couverture | Faux sentiment de sécurité | Seuil 75 % et résultat provisoire |
| Réponse inconnue traitée comme échec | Interprétation fausse | Statut séparé et recommandation de vérification |
| N/A utilisé pour gonfler le score | Score trompeur | Couverture affichée, prudence éditoriale |
| Perte d’état au changement de langue | UX | session de l’onglet ou confirmation explicite |
| CTA trop commercial | Perte de confiance | Valeur autonome, CTA seulement après le résultat |
| Formspree reçoit des données sensibles | Confidentialité | Aucun envoi dans le socle; revue DX-06 |
| Analytics sans consentement | Vie privée | Aucun instrumentation avant décision |
| PDF incohérent avec l’écran | Intégrité | Objet résultat unique; lot P1 séparé |
| Homepage surchargée | Conversion/navigation | Bande compacte ou intégration Ressources |
| Dépendances inutiles | Performance/sécurité | Socle sans nouvelle dépendance |
| Faux PASS accessibilité | Publication | Automatisation + parcours manuel clavier/lecteur |

## 19. Critères d’acceptation de DX-00

| Critère | Statut |
|---|---|
| Baseline et travaux locaux identifiés | PASS |
| Site public localisé | PASS |
| Routes/navigation/i18n audités | PASS |
| Design system et responsive audités | PASS |
| Formulaire et conversion audités | PASS |
| SEO et sitemap audités | PASS |
| Analytics audités | PASS — aucun système actif identifié |
| Tests et CI/CD audités | PASS |
| Disponibilité des modules qualifiée | PASS |
| Architecture cible définie | PASS |
| Notation et recommandations formalisées | PASS |
| Risques et lots définis | PASS |
| Code produit modifié | NON |
| Fusion ou déploiement effectué | NON |

## 20. Décisions requises avant DX-01

Une validation explicite est requise sur les éléments suivants :

1. Approbation du passage à DX-01 sur la branche `feature/coro-diagnostic-express-v1`.
2. Approbation du seuil minimal de couverture à 75 %.
3. Approbation de l’ordre de départage des priorités, ou instruction d’utiliser simplement D1 à D8.
4. Approbation du statut public des références suivantes dans les résultats : exercices/REX/actions correctives disponibles via Résilience, CORO Ops futur, CORO Audit non présenté comme module.
5. Confirmation que PDF, conversion enrichie et analytics restent hors du socle P0 jusqu’à la validation de DX-01 à DX-04.

## 21. Prochaine action

**ATTENDRE LA VALIDATION EXPLICITE DE DX-00.**

Après validation seulement : installer les dépendances exactes du worktree, lire la documentation Next.js 16.4.3 correspondante, puis commencer DX-01 sans fusion ni déploiement.
