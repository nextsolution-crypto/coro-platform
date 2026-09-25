CORO

COMPONENT LIBRARY V1.0

Website V2 · Catalogue autoritatif des composants

VARIER LES COMPOSITIONS. STABILISER LE VOCABULAIRE.

Ce catalogue remplace la V0.1 pré-audit. Chaque entrée décrit un composant réellement construit dans `coro-website/components/*` et éprouvé dans le Design Lab. Il sert pendant la migration : un agent doit y trouver quoi utiliser, comment et à quoi faire attention, sans deviner.

Version 1.0 | 24 septembre 2026 | Statut : V1.0 gelé (prend effet à la validation humaine du gel LAB-09)

# 1. Règles d'usage

- Utiliser les composants approuvés d'abord. Une lacune est escaladée, pas comblée par un nouveau langage.
- Une page raconte une histoire ; les composants servent cette histoire. Elle n'est pas une suite de composants choisis au hasard.
- Préférer une variante documentée à une copie locale. Pas de `FeatureCard2`, `FeatureCardNew`, etc.
- Les props expriment une intention sémantique (`tone="dark"`), pas une valeur CSS arbitraire.
- Statuts autorisés : LOCKED, APPROVED, REVIEW, REJECTED, MIGRATION-ONLY, LEGACY-DEBT. Le registre est `00-governance/DESIGN-SYSTEM-V1-FREEZE.md`.
- Le catalogue de motifs interdits est `02-design/CORO-VISUAL-LANGUAGE.md` §16.
- Les composants portent des données de démonstration dans le Lab : en migration, toute donnée est réelle ou explicitement marquée démonstration.

# 2. Taxonomie

| Famille | Dossier | Rôle |
|---|---|---|
| A. Shell | `components/site` | Navigation, langue, pied de page. |
| B. UI de base | `components/ui` | Boutons, conteneur. |
| C. Héros | `components/hero` | Entrée narrative des pages. |
| D. Rythme de page | `components/page` | Sections, contenu, média, index, preuve. |
| E. Spatial | `components/spatial` | Bâtiment, plan, carte, superpositions. |
| F. Opérationnel | `components/operational` | États, métriques, chronologie, personnes, actions. |
| G. Flux | `components/flow` | Continuum, données → action, processus, scénario. |
| H. Conversion | `components/conversion` | CTA, confiance, formulaire, pied de page V2. |

Tous les composants sont des composants serveur, sauf `SiteHeader`, `DesktopNavigation`, `MobileNavigation` et `LeadForm` (interaction requise).

# 3. A — Shell (`components/site`)

| Composant | Statut | Rôle et usage par défaut | À éviter | Responsive | Accessibilité | Dépendances |
|---|---|---|---|---|---|---|
| SiteHeader | APPROVED | En-tête partagé, `tone` clair ou sombre. Une seule instance par page. | Dupliquer l'en-tête ; en-tête legacy de la page d'accueil (LEGACY-DEBT). | Bascule à 68 rem : navigation desktop ou bouton de menu, jamais les deux ni aucun. Espacements resserrés entre 68 et 75 rem, libellés jamais sur deux lignes. | Logo avec `aria-label`, bouton de menu avec `aria-expanded`, Échap ferme et rend le focus au bouton. | DesktopNavigation, MobileNavigation, LanguageSwitcher, `lib/site/navigation` |
| DesktopNavigation | APPROVED | Navigation par disclosure : boutons `aria-expanded` / `aria-controls`, ouverture au clic, Entrée ou Espace ; l'aperçu au survol est un confort. | Lier des routes futures non implémentées. | Visible dès 68 rem. | Échap ferme et rend le focus au déclencheur ; le focus qui quitte un groupe le ferme ; les menus fermés ne sont pas focalisables. | `lib/site/navigation`, `lib/site/routes` |
| MobileNavigation | APPROVED | Panneau monté à l'ouverture ; le focus va au premier groupe ; groupes en accordéon. | Dépendre du survol. | Sous 68 rem. | Échap ferme ; groupes `aria-expanded` ; cibles ≥ 44 px. | SiteHeader |
| LanguageSwitcher | APPROVED | Lien FR / EN qui conserve la page ; `hrefLang`, `lang`, `aria-label`. | Bascule par bouton JavaScript sans URL. | Toujours visible sur desktop, dans le panneau sur mobile. | Nom accessible dans la langue cible. | `lib/site/locale` |
| SiteFooterV2 | APPROVED | Futur pied de page unique : marque et énoncé → navigation (Plateforme, Résilience et opérations, Entreprise) → accès (CORO Platform, CORO Client) → coordonnées puis légal et changement de langue. | Ajouter accroche, badge, logo, certification, réseau social, infolettre. Lier une route non implémentée ; le remplacer avant retrait des pieds de page de production (MIGRATION-ONLY). | Pile verticale sous 68 rem ; le NEQ ne se coupe pas ; courriel et téléphone en cibles de 44 px. | `<footer>`, `<nav>` étiquetée, `<address>`, contexte « site externe » pour lecteurs d'écran. | `footer-content.ts`, Container |
| SiteFooter (production) | MIGRATION-ONLY | Pied de page actuel des pages V2, minimal. À fusionner dans SiteFooterV2. | — | — | — | — |
| Footer legacy (`app/components/Footer.tsx`) | LEGACY-DEBT | Rendu par le layout racine, masqué par CSS sur les pages V2. À retirer à la migration. | — | — | — | — |

# 4. B — UI de base (`components/ui`)

| Composant | Statut | Rôle et usage par défaut | À éviter | Responsive | Accessibilité | Dépendances |
|---|---|---|---|---|---|---|
| Button | APPROVED | Action. `variant` primary (rouge CORO) / secondary / ghost ; `surface="dark"` sur marine ; `external` ; `disabled`. | Plusieurs boutons principaux dans un contexte ; rouge comme remplissage de surface. | Cible ≥ 44 px, retour à la ligne des libellés longs. | Un bouton désactivé reste annoncé comme lien indisponible. | primitives.module.css |
| Container | APPROVED | Largeur de contenu (75 rem) et gouttières. | Largeurs locales arbitraires. | Gouttières adaptées. | — | — |
| Section, ProductCard, StatusBadge | REVIEW | Primitives antérieures au Lab. Préférer PageSection, FeatureIndex, StatusChip. | Mur de cartes. | — | — | — |

# 5. C — Héros (`components/hero`)

Un héros ne suit pas un squelette unique : badge + H1 + paragraphe + deux boutons + capture est interdit comme recette. H1 obligatoire, compréhensible sans le visuel. Zéro à deux CTA selon le besoin.

| Composant | Statut | Rôle et usage par défaut | À éviter | Responsive | Accessibilité | Dépendances |
|---|---|---|---|---|---|---|
| HeroSignature (A2) | APPROVED | Héros architectural préféré : bâtiment réel, énoncé, annotations techniques reliées. `headerMode` `separate` (défaut) ou `integrated`. | `integrated` comme défaut global ; annotations trop nombreuses ; texte essentiel dans l'image. | Annotations en lignes sur grand écran ; épingles numérotées et liste sur petit écran ; recadrage dédié. | Annotations `aria-hidden` doublées d'une liste ; `alt` décrit le média seulement. | HeroMedia, TechnicalAnnotations, Button |
| HeroOperational | APPROVED | Héros marine : énoncé + plaque opérationnelle de démonstration (valeurs marquées démo). | Valeurs non marquées démo ; plaque qui couvre le sujet. | Plaque en haut à droite sur grand écran, recomposée sur mobile. | Plaque avec `aria-label`. | HeroMedia, Button |
| HeroTechnical | APPROVED | Héros papier / plan / indexation : références numérotées, cartouche, encart. Familles documentaires et techniques. | Utiliser comme héros de toutes les pages. | Références en liste, cartouche sur une colonne. | Références en liste ordonnée. | HeroMedia, TechnicalAnnotations |
| HeroArchitectural (A1) | REVIEW | Comparaison historique au Lab, pas la direction préférée. | Choisir A1 pour une page de production sans décision. | — | — | HeroCallouts, HeroMedia |
| HeroCallouts, HeroMedia, TechnicalAnnotations | APPROVED | Sous-composants de support des héros. | Usage direct en page hors héros. | — | — | — |

# 6. D — Rythme de page (`components/page`)

| Composant | Statut | Rôle et usage par défaut | À éviter | Responsive | Accessibilité | Dépendances |
|---|---|---|---|---|---|---|
| PageSection | APPROVED | Surface de section. `tone` white / soft / paper / navy ; `density` compact / standard / immersive. | `paper` comme surface universelle ; répéter la même structure deux sections de suite. | Gouttières et espacements adaptés. | `labelledBy` relie la section à son titre. | Container |
| SectionStatement | APPROVED | Grande idée : index, étiquette, filet, énoncé (`<em>` pour l'accent), soutien. Une idée par énoncé. | Empiler plusieurs énoncés. | Colonne unique sur mobile. | Titre `h2`. | PageSection, Technical |
| EditorialBlock | APPROVED | Titre, texte, liste et lien. | — | — | Titre relié au bloc. | — |
| SplitContent | APPROVED | Texte + média. `ratio` 4-8 / 5-7 / 7-5 / 8-4 ; `bleed` ; `align`. | Débordement de média avec coins de 10 px là où l'image déborde. | Séquentiel sous 68 rem. | Ordre DOM = ordre visuel. | EditorialBlock, MediaFrame |
| MediaFrame | APPROVED | Image ou capture. `kind` photo (10 px) ou technical (cadre net, cartouche). `position`, `aspect`, `caption`, `index`. | 10 px sur un média technique ; texte essentiel dans l'image. | `sizes` et `object-position` dédiés ; espace réservé (pas de décalage de mise en page). | `alt` requis (vide seulement si décoratif). | next/image |
| FeatureIndex (rows, steps) | APPROVED | Capacités en index ordonné : numéros, filets, hiérarchie. `rows` = registre ; `steps` = rail vertical. | Grille de cartes. | Colonnes qui diminuent. | `<ol>`, numéros en texte. | — |
| FeatureIndex (sequence) | REJECTED | Rangée horizontale d'étapes. Utiliser `steps` ou un flux. | — | — | — | — |
| MetricComposition | APPROVED | Un chiffre dominant avec dimensions ; toute valeur inventée est marquée démo. | Rangée de quatre KPI. | Empilement. | Valeurs en texte. | — |
| Accordion | APPROVED | FAQ et contenu secondaire, natif `<details>` / `<summary>`. | Contenu essentiel caché. | Questions longues qui passent à la ligne. | Clavier natif ; anneau de focus sur le résumé ; contenu accessible sans animation. | — |
| SectionProof | REVIEW | Composition de preuve (registre, faits, paires). | Preuve non vérifiée ; témoignage, logo ou certification inventés. | — | — | ProofFacts, ProofPairs, ProofRecord |
| TechLabel, TechIndex, Cartouche | APPROVED | Vocabulaire technique : micro-libellé, indice numéroté, cartouche à trois cellules. | Cartouche décoratif. | — | Texte réel. | — |

# 7. E — Spatial (`components/spatial`)

Règle : la densité des superpositions est inverse à la densité du média source. Les repères sont `aria-hidden` ; une liste ordonnée réelle porte tout le contenu. Les coordonnées sont en pourcent du média source.

| Composant | Statut | Rôle et usage par défaut | À éviter | Responsive | Accessibilité | Dépendances |
|---|---|---|---|---|---|---|
| SpatialFigure | APPROVED | Figure commune : média (tranche), repères, cartouche, légende, liste. | Superposer sans liste sémantique. | `slice` desktop et `mobileSlice` ; sous 68 rem : pastilles numérotées limitées. | Liste `<ol>` obligatoire ; `alt` décrit le média seulement. | next/image, Cartouche |
| BuildingFrame | APPROVED | Photo ou coupe de bâtiment, 10 px, note en filet. | Cadre de plan ; ombre. | — | — | SpatialFigure |
| BlueprintFrame | APPROVED | Plan technique : cadre net de 2 px, bordure bleue, cartouche. Média dense : au plus deux repères complets. | 10 px ; surcharge de repères. | — | — | SpatialFigure |
| MapFrame | APPROVED | Territoire : cadre de 4 px, légende HTML, mention démonstration / référence. | Carte présentée comme réelle ; interface de navigation grand public ; étiquette qui masque le texte incrusté. | — | Légende en HTML réel. | SpatialFigure |
| FloorMarker | APPROVED | Niveau : trait jusqu'au bord du bâtiment et étiquette compacte (code, sous-libellé de 10 px). | Épingle de carte. | Pastille numérotée sur petit écran. | Type écrit dans la liste (« Niveau »). | SpatialMarks |
| ZoneMarker | APPROVED | Zone : contour pointillé, hachures et code (la zone se distingue par forme et code, pas la couleur). | Couleur seule. | Pastille numérotée. | — | SpatialMarks |
| CalloutLine | APPROVED | Ligne d'appel et étiquette. Densité `full` (exceptionnelle) ou `ref` (numérotée, norme sur média dense). | Étiquette qui masque une information source. | `ref` = pastille seule. | — | SpatialMarks |
| PointMarker | REVIEW | Anneau (site) ou carré à crochets (lieu sensible) avec étiquette. | Collision avec du texte incrusté (utiliser `ref`). | — | — | SpatialMarks |

# 8. F — Opérationnel (`components/operational`)

Règle : l'intensité opérationnelle détermine la présence de l'interface. Situation d'abord. Ne montrer que ce qui change la décision. État et surface sont indépendants. Toute valeur inventée est marquée démonstration.

| Composant | Statut | Rôle et usage par défaut | À éviter | Responsive | Accessibilité | Dépendances |
|---|---|---|---|---|---|---|
| StatusChip | APPROVED | État compact : glyphe + libellé. États normal ● / info i / attention △ / critique ! / terminé ✓. Contour fin. | Aplat de couleur ; pill partout ; couleur seule. | Le libellé peut passer à la ligne. | Glyphe `aria-hidden`, préfixe « Statut : » pour lecteurs d'écran. | types.ts |
| MetricTile | APPROVED | Un seul nombre important ; prop `demo` obligatoire. | Rangée de KPI. | Taille fluide. | `<time>` si durée. | — |
| Timeline, TimelineEvent | APPROVED | Journal d'incident : heure, événement, état, source. | Fil social, bulles. | Colonne d'état plafonnée à 45 % de la ligne. | `<ol>`, `<time>`. | StatusChip |
| PeopleStatus | APPROVED | Décompte des personnes : règle proportionnelle (pleine = pointées, hachurée = à vérifier) et liste. Sans photos ni annuaire. | Esthétique d'annuaire. | — | Liste `<dl>` porteuse du contenu. | — |
| ActionList, ActionItem | APPROVED | Ce qui doit arriver ensuite : priorité, action, rôle, statut (à faire / en cours / terminé). | Kanban, gestion de projet. | Statut plafonné à 45 %. | `<ol>`, priorité lue. | — |
| OperationalScene | APPROVED | Composition d'une situation réelle. `layout` : `lead` (Normal), `plate` (Incident), `people` (évacuation), `open` (reprise) ; `first` media ou panel. Le média est primaire (10 px) ; l'interface n'est jamais sur les personnes. | Panneau sur le sujet ; même mise en page pour tous les états. | Recomposée sous 68 rem selon `first`. | `<figure>`. | next/image |
| OperationalRail | APPROVED | Bande sobre pour l'état Normal : filets et texte, sans plaque. | Utiliser pour un incident. | Lignes empilées sur mobile. | Région étiquetée. | OperationalScene |
| OperationalPanel, PanelSection | APPROVED | Plaque structurée à 4 px pour les contextes riches en information (incident, décompte). | Composant universel ; carte de tableau de bord ; ombre. | — | Région `aria-label`. | StatusChip |
| DocumentStatus, DocumentList | REVIEW | Référence de preuve : code, titre, état. | Ligne d'explorateur de fichiers. | Chip plafonné. | `<ul>`. | StatusChip |
| LiveIndicator | REJECTED | Indicateur « en direct » autonome. « Actif » est un état statique avec un mot. | Pulse, halo, radar, boucle. | — | — | — |

# 9. G — Flux (`components/flow`)

Règle : le continuum n'est pas une liste de fonctionnalités. Le sens est entièrement statique. L'action produit des preuves ; les preuves produisent de l'apprentissage.

| Composant | Statut | Rôle et usage par défaut | À éviter | Responsive | Accessibilité | Dépendances |
|---|---|---|---|---|---|---|
| Continuum | APPROVED | Neuf étapes canoniques en quatre mouvements, une ligne structurelle, boucle d'amélioration 09 → 01 · 02. Le pic 05–06 vient de la surface, de la masse et du profil. | Neuf cartes égales ; icônes en rangée ; changer les mots ou l'ordre ; lier les étapes à des produits. | Recomposition verticale sous 75 rem avec colonne vertébrale. | Listes ordonnées imbriquées, numéros et intensité écrits, aucun survol requis. | flow.module.css |
| DataToActionFlow | APPROVED | Exactement quatre temps : Données, Décision, Action, Amélioration ; poids et taille progressifs, note de retour. | Quatre cartes égales ; ajouter un cinquième temps. | Liste verticale sous 75 rem. | `<ol>`. | — |
| ProcessFlow | REVIEW | Processus borné : décalage, étape, sortie, porte de décision (losange + libellé). | Cartes égales ; décalages non marqués démonstration. | Liste verticale. | Décalages en texte. | — |
| ScenarioFlow | REVIEW | Cause, décision, conséquence, options pesées (symbole + mot, jamais couleur seule). | Moteur de graphe ; réclamer un incident réel. | — | `<ol>`, fourche en liste. | — |
| FlowConnector générique | REJECTED | Le connecteur est la ligne propre à chaque flux. | — | — | — | — |

# 10. H — Conversion (`components/conversion`)

Règle : la conversion est la prochaine étape, pas une interruption. La confiance se prouve.

| Composant | Statut | Rôle et usage par défaut | À éviter | Responsive | Accessibilité | Dépendances |
|---|---|---|---|---|---|---|
| CTASection | APPROVED | Fin de page : étiquette et filet, énoncé, soutien, action principale (rouge), action secondaire optionnelle, repère (ex. courriel). `tone` white / soft (ouvert) ou dark (compact). | Grande carte arrondie ; dégradé ; bandeau flottant ; urgence ; compte à rebours ; « Réservez maintenant ». | Empilement sous 68 rem. | `aria-labelledby`. | Button, Container |
| DemoCTA | APPROVED | Cas d'usage démonstration de CTASection. Textes du Lab : proposition, à valider par page. | Remplacer le texte de production sans décision. | — | — | CTASection |
| TrustStrip | APPROVED | Confiance par la preuve : code technique, énoncé, source (lien vers la page). Sans source vérifiée : « À valider ». | Logos, témoignages, certifications, chiffres, badges inventés. | 1 / 2 / 4 colonnes. | Liste étiquetée. | — |
| LeadForm | REVIEW | Formulaire de demande : vrais labels, `autoComplete`, erreurs associées, résumé d'erreurs qui prend le focus, état d'envoi lisible sans animation, succès, erreur générale. Aucune requête réseau au Lab. | Champ inventé ; placeholder comme label ; envoi réel depuis le Lab ; dupliquer le fournisseur. | Champs sur une colonne, cible 44 px. | `aria-invalid`, `aria-describedby`, `aria-busy`, `role="alert"` / `"status"`. | leadFormCopy |

Contrat de production à préserver (MIGRATION-ONLY / LOCKED) : cookies `coro_referral_code` et `coro_referral_first_touch` (capturés par la page d'accueil, lus par `DemoForm`) ; fournisseur du formulaire (voir `app/DemoForm.tsx`) ; connexions `https://app.getcoro.io/login` et `https://client.getcoro.io/login`.

# 11. Composants du catalogue V0.1 non construits

Statut : REVIEW (non construits). Créer seulement si une page migrée l'exige, après recherche de l'existant, avec escalade.

| V0.1 | Équivalent ou décision |
|---|---|
| HeroProduct, HeroEditorial, HeroMinimal | Non construits ; utiliser HeroTechnical / HeroSignature ou escalader. |
| SectionLight / Soft / Dark / Blueprint / Media | PageSection `tone` white / soft / navy / paper ; SectionMedia = SplitContent ou MediaFrame. |
| FeatureList / FeatureGrid | FeatureIndex ; FeatureGrid non construit. |
| ProductCard, MetricCard, ProofCard | ProductCard (ui) REVIEW ; MetricTile, MetricComposition ; ProofCard non construit. |
| LogoCloud, Testimonial | REVIEW : jamais tant qu'un contenu réel et autorisé n'existe pas. |
| EventCard, ResponderView, ArchitectureDiagram, BeforeAfter | Non construits. |
| BuildingOverlay | SpatialFigure et ses repères. |
| InlineCTA, ContactCTA | Non construits ; CTASection couvre le besoin principal. |
| MegaNav, AnnouncementBar | DesktopNavigation ; AnnouncementBar non construit. |
| Breadcrumb, Badge, Tag, Tabs, Tooltip | Non construits (StatusChip pour les statuts). |
| Modal | Non construit ; MIGRATION-ONLY : besoin d'une primitive de dialogue si un dialogue est conservé. |
| SkipLink | Composant du Lab (`app/design-lab/SkipLink.tsx`) ; à intégrer au layout racine à la migration, avec `tabIndex={-1}` sur `<main>`. |

# 12. États obligatoires

Tout composant interactif traite default, hover, focus-visible, active, disabled et, si pertinent, loading, success, warning, error et empty. Les composants de contenu tiennent compte des longueurs FR/EN, de l'absence de média, des titres longs et du responsive. Un libellé long ne doit jamais élargir la page (plancher : 320 px).

# 13. Décision de migration par composant

| Décision | Composants |
|---|---|
| REUSE | Tous les composants APPROVED ci-dessus. |
| ADAPT | SiteFooter (production) → SiteFooterV2 ; Section, ProductCard, StatusBadge → composants approuvés. |
| MERGE | Pieds de page (production, legacy) → SiteFooterV2. |
| CREATE | Uniquement une primitive de dialogue si nécessaire, et seulement sur décision. |
| DROP | Footer legacy et styles legacy concurrents, après validation d'impact. |

# 14. Documentation minimale d'un composant partagé

Objectif, quand l'utiliser, quand ne pas l'utiliser, variantes, props, responsive, accessibilité, dépendances, statut et pages consommatrices. Un changement d'un composant partagé impose : identifier les pages consommatrices, vérifier FR/EN, mobile et desktop, exécuter les tests.

# 15. Gouvernance

Les composants suivent DRAFT → REVIEW → APPROVED → LOCKED. Un composant LOCKED n'est modifié que si le besoin est explicite, l'impact sur les pages consommatrices est connu et la régression est testée. Une page nouvelle n'est jamais une autorisation implicite de modifier un composant LOCKED.
