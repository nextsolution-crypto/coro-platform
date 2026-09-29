CORO

DESIGN SYSTEM V1.0 — REGISTRE DE GEL

Website V2 · État figé à la fin de LAB-09

FIGER CE QUI A ÉTÉ PROUVÉ. MIGRER SANS DEVINER.

Version 1.0 | 24 septembre 2026 | Statut : gel documentaire (LAB-09), prend effet à la validation humaine

# 1. Rôle de ce document

Ce registre est la porte d'entrée unique pour migrer une page en production sans deviner. Il consolide ce que LAB-01 à LAB-08 ont construit, testé et approuvé, et il renvoie aux documents détaillés.

RÈGLE — ce registre ne crée aucun langage visuel. Il décrit l'état du Design Lab tel qu'il est implémenté dans `coro-website` au commit LAB-08 (`d212543a`, branche `feature/website-v2`).

Preuves techniques au moment du gel : 143 tests automatisés passent, `typecheck`, `eslint` et `build` sont propres, 0 DS-BLOCKER et 0 DS-MAJOR non résolu (voir §10).

# 2. Vocabulaire des statuts (les seuls autorisés)

| Statut | Signification |
|---|---|
| LOCKED | Ne change pas pendant une migration ordinaire de page sans approbation explicite. |
| APPROVED | Défaut sûr pour la migration en production. |
| REVIEW | Direction ou composant valide, dont l'usage exige un contexte ou une validation supplémentaire. |
| REJECTED | Ne pas utiliser comme pattern de production. |
| MIGRATION-ONLY | Problème ou action qui appartient à la migration, pas à la conception du Design System. |
| LEGACY-DEBT | Problème existant en production, à retirer pendant la migration, pas à préserver. |

Les anciens statuts DRAFT et PENDING AUDIT ne s'appliquent plus aux éléments listés ici.

RÈGLE — le statut LOCKED est appliqué par instruction de gel LAB-09. Il prend effet lorsque ce gel est validé et commité par Mathieu. Avant cela, il reste une proposition de gel.

# 3. Décisions LOCKED

## 3.1 Couleur, forme, profondeur

- Rouge CORO `#C0392B` (`--coro-v1-red-600`) : action et signal. Jamais une couleur de remplissage de surface, jamais décorative.
- Bleu structurel (`--coro-v1-blue-700`) : information, architecture, structure technique et données.
- Marine profond (`--coro-v1-navy-950` / `-900`) : autorité et profondeur opérationnelle.
- Média photographique : rayon 10 px (`--coro-v1-radius-image`), uniquement sur les coins visibles et contenus (jamais là où l'image déborde de la page).
- Panneau structurel : 4 px (`--coro-v1-radius-panel`), défaut des surfaces de contenu.
- Contrôle : 8 px (`--coro-v1-radius-control`).
- Cadre technique : 2 à 4 px (`--coro-v1-radius-frame` / panel). Un média technique n'utilise jamais 10 px.
- Grands rayons 12, 16, 24 px : exceptionnels et justifiés.
- Pill : uniquement pour un statut ou une étiquette sémantique.
- Hiérarchie de profondeur : SURFACE → BORDURE → MÉDIA → SUPERPOSITION → LUMIÈRE → OMBRE. Aucune ombre lourde par défaut. Les niveaux d'ombre 3 et 4 sont exceptionnels.
- États sémantiques : succès, avertissement, critique, information. Un état n'est jamais communiqué par la couleur seule : glyphe et libellé textuel obligatoires.

## 3.2 Signature CORO

- Références numérotées, filets techniques fins, indexation technique, micro-libellés, cartouches sobres, cadres précis.
- Relation objet physique ↔ information structurée, médias du monde réel, typographie architecturale et éditoriale.
- Le papier et la grille d'architecte sont contextuels, pas universels.

## 3.3 Principes de composition

- Plus le média source est dense, moins il y a de superpositions CORO. (La densité des superpositions est inverse à la densité du média source.)
- L'intensité opérationnelle détermine la présence de l'interface.
- La situation d'abord. L'interface ensuite.
- Ne montrer que ce qui change la décision.
- La conversion est la prochaine étape, pas une interruption.
- La confiance se prouve.
- Le continuum n'est pas une liste de fonctionnalités.
- L'action produit des preuves. Les preuves produisent de l'apprentissage.

## 3.4 Patterns et contenus verrouillés

- Séquence canonique du continuum, dans cet ordre et avec ces mots :
  01 CONNAÎTRE / KNOW · 02 ANTICIPER / ANTICIPATE · 03 DÉTECTER / DETECT · 04 DÉCIDER / DECIDE · 05 AGIR / ACT · 06 PROTÉGER / PROTECT · 07 PROUVER / PROVE · 08 APPRENDRE / LEARN · 09 AMÉLIORER / IMPROVE.
  Sous-titres FR/EN : voir `app/design-lab/flow-data.ts`. Quatre mouvements : 01–02, 03–04, 05–06, 07–09.
- Sur petit écran : marqueurs numérotés limités sur le média, liste sémantique complète dessous (pattern « marqueurs mobiles → liste »).
- Contrat de parrainage (voir `05-migration/CONTENT-MIGRATION-MATRIX.md` §4 et §13) : cookies `coro_referral_code` et `coro_referral_first_touch`, capturés par la page d'accueil et lus par `DemoForm`. À PRÉSERVER pendant la migration.
- Fournisseur et destination du formulaire de démonstration : à préserver tant qu'un remplacement n'est pas approuvé séparément. La source d'autorité est `app/DemoForm.tsx` ; ce document ne recopie pas la valeur du point d'accès.
- Destinations de connexion : CORO Platform `https://app.getcoro.io/login`, CORO Client `https://client.getcoro.io/login`. Aucun autre portail.

## 3.5 Exception approuvée — EditorialHero (superpositions du Hero d'accueil)

Décision humaine MIG-08A-QA-GOV. Portée strictement limitée aux superpositions CONNAÎTRE/PERSONNES/AGIR de `components/page/EditorialHero.tsx` / `editorial-hero.module.css`. N'autorise rien d'équivalent ailleurs dans V2 sans nouvelle revue explicite.

- **Point de rupture `62rem`** : les superpositions restent masquées entre `48rem` et `62rem` pour éviter la collision avec la colonne éditoriale (`48rem` : trop tôt : `68rem` : trop tard sur les largeurs laptop courantes ~992–1088 px). Rupture spécifique au composant, pas un troisième point de rupture général.
- **`backdrop-filter: blur(10px)`** : traitement « verre dépoli » approuvé pour ces trois cartes uniquement.
- **`border-radius: var(--coro-v1-radius-sm, 8px)`** : les trois cartes de superposition sont des objets éditoriaux de type carte, intentionnellement posés sur la photographie ; ce petit rayon V1 fait partie de leur traitement visuel humainement approuvé.

Portée limitée à ces superpositions ; toute réutilisation ailleurs (autre Hero, autre carte) exige une nouvelle revue explicite.

Tests concernés : `tests/hardening.test.ts`, `tests/partners-migration.test.ts`, `tests/visual-01.test.ts` — chacun garde la règle globale et ajoute une exception nominative et étroite pour ces déclarations précises, à l'intérieur de `.overlay` uniquement.

# 4. Registre des composants (synthèse)

Le détail (rôle, usage, à éviter, responsive, accessibilité, dépendances) est dans `02-design/CORO-COMPONENT-LIBRARY.md`, qui fait autorité par composant.

| Famille | APPROVED | REVIEW | REJECTED |
|---|---|---|---|
| Shell | SiteHeader, DesktopNavigation, MobileNavigation, LanguageSwitcher, SiteFooterV2 | — | — |
| UI de base | Button, Container | Section, ProductCard, StatusBadge (primitives antérieures au Lab) | — |
| Héros | HeroSignature (A2), HeroOperational, HeroTechnical | HeroArchitectural (A1, comparaison historique) | — |
| Rythme de page | PageSection, SectionStatement, EditorialBlock, SplitContent, MediaFrame, FeatureIndex (rows, steps), MetricComposition, Accordion, TechLabel / TechIndex / Cartouche | SectionProof | FeatureIndex layout « sequence » |
| Spatial | SpatialFigure, BuildingFrame, BlueprintFrame, MapFrame, FloorMarker, ZoneMarker, CalloutLine, densité full/ref | PointMarker | — |
| Opérationnel | StatusChip, MetricTile, Timeline, PeopleStatus, ActionItem, OperationalScene, OperationalRail, OperationalPanel (contextes riches en information) | DocumentStatus | LiveIndicator (primitive autonome) |
| Flux | Continuum, DataToActionFlow | ProcessFlow, ScenarioFlow (intégration en usage réel) | FlowConnector générique |
| Conversion | CTASection, DemoCTA, TrustStrip | LeadForm (design approuvé, intégration production à valider) | — |

# 5. Éléments REVIEW

| Élément | Pourquoi REVIEW | Sortie de REVIEW |
|---|---|---|
| HeroArchitectural (A1) | Gardé au Lab comme comparaison historique ; A2 (HeroSignature) est la direction préférée. | Reste au Lab tant que la documentation le marque « référence seule ». |
| Header intégré (HeroSignature mode `integrated`) | Direction approuvée quand la lisibilité du média est maîtrisée ; pas un défaut global. | Validation page par page. |
| SectionProof | Composition de preuve non validée sur un cas réel. | Un cas réel avec preuves vérifiées. |
| PointMarker | Insuffisamment prouvé (collision avec le texte incrusté de la carte, résolue par usage `ref`). | Un second cas réel. |
| DocumentStatus | Utile seulement là où il clarifie le sens opérationnel. | Usage réel sur A ou D. |
| ProcessFlow, ScenarioFlow | Design approuvé ; usage réel (Sentinelle, incident, exercices) non mappé. | Un premier cas de production. |
| LeadForm | Design approuvé ; intégration avec le formulaire de production, la référence et le fournisseur à valider. | Migration du formulaire. |
| Section, ProductCard, StatusBadge (ui) | Primitives antérieures au Lab ; risque de mur de cartes. | Remplacées par PageSection, FeatureIndex, StatusChip ou validées cas par cas. |
| Composants du catalogue V0.1 non construits | Voir Component Library §Non construits. | Création seulement si une page migrée l'exige, avec escalade. |

# 6. Éléments REJECTED

FeatureIndex « sequence » (rangée horizontale d'étapes) · LiveIndicator autonome · FlowConnector générique · continuum en neuf icônes égales · murs de cartes · autres motifs listés dans la section autoritative « Motifs interdits » de `02-design/CORO-VISUAL-LANGUAGE.md` §16.

# 7. Éléments MIGRATION-ONLY

Ces sujets appartiennent à la migration. Ils ne justifient pas de rouvrir le Design System.

- Architecture globale `<html lang>` (fixe à `fr` aujourd'hui) et rendu serveur de la langue.
- Canonical, hreflang, sitemap, migration JSON-LD (voir `05-migration/SEO-MIGRATION-PLAN.md`).
- Layout racine : retrait du pied de page legacy ; installation du lien d'évitement (SkipLink) et cible `main` focalisable (`tabIndex={-1}`).
- Mécanisme d'adoption des jetons V1 (voir §11).
- Primitive de dialogue / modale (si la vidéo d'accueil ou un autre dialogue est conservé) : `<dialog>` natif, piège de focus, Échap, retour du focus.
- Gestion du focus de la vidéo d'accueil ; sémantique du CookieBanner ; accessibilité du ChatWidget.
- Préservation de la capture du parrainage et de l'intégration du formulaire de démonstration.
- Contrat dynamique du blog (API, slugs, images, traductions).
- Gouvernance juridique et de contenu (voir §9).
- Exposition de production de `/design-lab` (voir §12).

# 8. Dette héritée (LEGACY-DEBT)

- `HomePageClient` monolithique (plusieurs milliers de lignes, styles en ligne).
- Styles en ligne massifs et CSS global legacy en concurrence avec le système V2.
- Architecture de pied de page dupliquée : `app/components/Footer.tsx` (legacy) rendu par le layout racine et masqué par CSS sur les pages V2, plus `components/site/SiteFooter.tsx`.
- `/programme-recommandation` : la liste d'étapes déborde de 5 px à 320 px (CSS de la page institutionnelle).
- Comportement de focus des modales legacy : dialogue vidéo d'accueil (`aria-modal` sans gestion du focus), CookieBanner (`role="dialog"` non modal sans gestion du focus), ChatWidget.
- Fragmentation des points de rupture legacy.
- Usage d'`<img>` brut dans le legacy là où `next/image` conviendrait.

Voir aussi `05-migration/CURRENT-SITE-INVENTORY.md`.

# 9. Éléments ouverts de gouvernance de contenu (REVIEW)

Ces éléments sont visibles et non résolus. Ce gel ne décide aucune vérité juridique ou commerciale.

| Élément | Statut | Note |
|---|---|---|
| Énoncé « Traçabilité » (validation et historique des documents) | REVIEW avant publication | Marqué « À valider » dans `TrustStrip` au Lab ; non vérifié dans les pages du site. |
| Identité légale / formulation du copyright | REVIEW avant migration en production | Le Lab affiche `© 2026 CORO` et le NEQ existant. `/terms` désigne un exploitant individuel. Aucune substitution n'est décidée ici. |
| Typographie de l'adresse | REVIEW avant migration en production | « 2879 Boul. Pierre-Bernard » (pieds de page, pages légales) contre « 2879, boul. Pierre-Bernard » (page contact). |
| Hébergement au Canada | REVIEW avant republication | Énoncé par `/security` (Toronto, Ontario) ; à revalider à chaque republication. |
| Prix publics, montant du parrainage, nombre de procédures | REVIEW avant republication | Déjà signalés dans la matrice de migration. |
| Références CNESST / CNPI / ISO, disponibilité Phase 2, fournisseur / SLA / sécurité | REVIEW avant republication | Idem. |
| Engagement « nous vous contacterons dans les 24 heures » (message de succès de `DemoForm`) | REVIEW avant migration du formulaire | Non vérifié. |

# 10. Gel du durcissement LAB-08

Résultat : 0 DS-BLOCKER non résolu, 0 DS-MAJOR non résolu.

Classes de défauts corrigées : contraste (jeton de texte secondaire et jeton de succès sur surface douce), retour à la ligne de l'en-tête FR entre 68 et 75 rem, libellés opérationnels longs (StatusChip et lignes associées), débordement des flux (mot très long), sous-libellé du repère d'étage de 8 px, focalisation du résumé d'erreurs de `LeadForm`.

Ce qui n'a PAS été fait et reste QA MANUELLE AVANT PRODUCTION :

- zoom navigateur réel à 200 % (équivalent 640 px mesuré seulement) ;
- zoom navigateur réel à 400 % (équivalent 320 px mesuré seulement) ;
- parcours réel au clavier avec la touche Tab (l'outil ne pilotait pas la touche Tab ; comportements vérifiés par événements synthétiques et lecture du DOM) ;
- audit réel au lecteur d'écran ;
- émulation de `prefers-reduced-motion` dans un navigateur (vérification statique du code seulement).

Détail : `04-quality/RESPONSIVE-ACCESSIBILITY.md` §30.

# 11. Mécanisme d'adoption des jetons V1

Les jetons `--coro-v1-*` sont additifs dans `app/design-tokens.css`. Les jetons legacy `--coro-*` sont inchangés. Les jetons V1 ne s'appliquent qu'à l'intérieur d'un élément portant `data-coro-system="v1"` ; `[data-surface="dark"]` y bascule l'anneau de focus vers `--coro-v1-focus-on-dark`.

État constaté au gel : seules les routes du Design Lab utilisent `data-coro-system="v1"`. Les pages institutionnelles déjà migrées (`/about`, `/contact`, `/partners`, `/programme-recommandation`) et les pages produit utilisent le shell V2 avec les jetons legacy (rouge et rayons legacy).

DÉCISION MIGRATION-ONLY à prendre avec le premier lot de production : où poser `data-coro-system="v1"` (enveloppe de page ou layout racine), en mesurant l'effet sur les pages consommatrices existantes. Une page migrée n'est pas conforme au Design System tant que ce scope n'est pas actif.

# 12. Recommandation d'exposition de `/design-lab`

Faits : `noindex, nofollow`, absent du sitemap, absent de la navigation, mais servi en HTTP 200 dans un build de production ; `robots.txt` autorise tout ; le déploiement production est déclenché par un push sur `main`.

Exigence PRÉ-FUSION : avant toute fusion vers `main`, la route doit être verrouillée par environnement (réponse 404 en production) ou autrement indisponible en production. Non implémenté par LAB-09 (aucune autorisation de gouvernance explicite). Décision de suppression ou de conservation interne : avant le Go-Live (Design Lab Specification §27).

# 13. Contradictions relevées entre documents et implémentation

Relevées, non corrigées silencieusement :

1. Le Design System V0.1 proposait des rayons 8/12/16/24 px ; l'implémentation gelée est 2/4/8/10 px, avec 12/16/24 exceptionnels. Le Design System V1.0 corrige le texte.
2. L'en-tête de `app/design-tokens.css` décrit encore les jetons V1 comme « DRAFT (LAB-01) » et « Nothing here is LOCKED ». Le commentaire est périmé ; il n'a pas été modifié (LAB-09 ne touche pas à l'implémentation).
3. `--coro-v1-text-600` a changé de `#617283` à `#5d6e7f` et `--coro-v1-success` de `#12804a` à `#107c47` (LAB-08). Toute copie de la valeur dans un document ou une maquette doit suivre.
4. Le Component Library V0.1 listait des composants jamais construits (HeroProduct, HeroEditorial, HeroMinimal, ProofCard, LogoCloud, Testimonial, ArchitectureDiagram, BeforeAfter, EventCard, InlineCTA, ContactCTA, Tabs, Tooltip, Modal, Breadcrumb, ResponderView, AnnouncementBar). Ils sont désormais explicitement « non construits ».
5. Le Design Lab Specification prévoyait onze zones (00 à 10) ; le Lab implémenté a huit zones numérotées par lot (00 Foundations à 07 Conversion). Le responsive et l'accessibilité (zones 09 et 10) ont été traités par l'audit LAB-08, pas par des zones du Lab.
6. Le Current Site Inventory (HEAD `fff4af81`) signale « desktop nav sans aria-expanded » et un travail produit non commité. Ces deux points sont périmés : `DesktopNavigation` expose `aria-expanded` / `aria-controls`, et l'historique Git contient désormais les lots LAB-01 à LAB-08.

# 14. Où trouver chaque système

| Système | Code | Tests |
|---|---|---|
| Jetons | `app/design-tokens.css` | `tests/foundation.test.ts`, `tests/hardening.test.ts` |
| Shell et UI | `components/site/*`, `components/ui/*` | `tests/foundation.test.ts` |
| Héros | `components/hero/*` | `tests/hero-system.test.ts`, `tests/hero-signature.test.ts` |
| Rythme de page | `components/page/*` | `tests/page-rhythm.test.ts` |
| Spatial | `components/spatial/*` | `tests/spatial.test.ts` |
| Opérationnel | `components/operational/*` | `tests/operational.test.ts` |
| Flux | `components/flow/*` | `tests/flow.test.ts` |
| Conversion | `components/conversion/*` | `tests/conversion.test.ts` |
| Durcissement | — | `tests/hardening.test.ts` |
| Laboratoire | `app/design-lab/*` | `tests/design-lab.test.ts` |
