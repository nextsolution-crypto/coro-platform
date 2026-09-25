CORO

DESIGN LAB SPECIFICATION

Website V2 · Laboratoire de validation avant production

VALIDER LE SYSTÈME AVANT DE CONSTRUIRE LES PAGES.

Le Design Lab transforme la direction artistique CORO en composants Web
réels, testables et comparables avant toute reconstruction massive.

Version 1.1 \| 24 septembre 2026 \| Statut : spécification de chantier, avancement du Lab en tête

# 0. AVANCEMENT DU LAB (état au gel LAB-09)

Le Design Lab existe dans `coro-website/app/design-lab/*` (route `/design-lab`, `noindex`, hors sitemap et navigation). Les lots LAB-01 à LAB-08 sont réalisés et approuvés ; LAB-09 est le gel V1.0 (documentation). Aucune migration de production n'a eu lieu.

| Lot | Contenu | Commit | Statut | Exceptions REVIEW |
|---|---|---|---|---|
| Actifs | Pack d'actifs visuels `public/website-v2/*` | `6d0baebf` | APPROVED | — |
| LAB-01 (+01B) | Fondations, jetons V1, navigation (en-tête, menu mobile, langue), primitives | `ae51ede0` | APPROVED | — |
| LAB-02 (+02B) | Système de héros : HeroSignature (A2), HeroOperational, HeroTechnical ; A1 conservé | `5871d0f0` | APPROVED | HeroArchitectural (A1) : comparaison historique |
| LAB-03 (+03B) | Rythme de page et différenciation des familles | `c00eb328` | APPROVED | SectionProof ; FeatureIndex « sequence » REJECTED |
| LAB-04 (+04B) | Bâtiment, plan, superpositions, densité full/ref | `585384d7` | APPROVED | PointMarker |
| LAB-05 (+05B) | Interface opérationnelle et intensité | `2852bb1e` | APPROVED | DocumentStatus ; LiveIndicator REJECTED |
| LAB-06 (+06B) | Continuum, flux, données → action | `2c2f8f87` | APPROVED | ProcessFlow, ScenarioFlow (usage réel) ; FlowConnector REJECTED |
| LAB-07 (+07B) | CTA, confiance, formulaire, pied de page V2 | `24822a70` | APPROVED | LeadForm (intégration production) ; énoncé « Traçabilité » REVIEW |
| LAB-08 | Durcissement responsive, accessibilité, résilience | `d212543a` | APPROVED | QA manuelle restante (zoom réel, Tab réel, lecteur d'écran, mouvement réduit émulé) |
| LAB-09 | Gel Design System V1.0 (documentation) | — | GEL EN COURS | Prend effet à la validation humaine |

## Zones réellement implémentées

Le Lab est organisé en huit zones numérotées par lot : 00 Foundations, 01 Navigation, 02 Heroes, 03 Rhythm, 04 Building, 05 Operational, 06 Continuum, 07 Conversion. Les zones 09 Responsive et 10 Accessibility de la spécification n'ont pas été construites comme zones : elles ont été traitées par l'audit LAB-08. Chaque étude a une vue isolée `?view=…` pour la QA responsive.

## Suite

Le Lab n'est pas le site. Il absorbe l'exploration ; la migration consomme des décisions gelées. Exposition de production : le Lab doit être verrouillé par environnement avant toute fusion vers `main` (voir `00-governance/DESIGN-SYSTEM-V1-FREEZE.md` §12).

# 1. Objet

Le Design Lab est une route de travail temporaire ou interne dans
coro-website destinée à valider le langage visuel, les tokens, les
composants, les comportements responsive et les interactions avant de
reconstruire les pages publiques.

OBJECTIF --- obtenir une preuve Web réelle que « ceci est CORO » avant
de multiplier les pages.

# 2. Ce que le Design Lab n'est pas

- Ce n'est pas la nouvelle homepage.

- Ce n'est pas une galerie décorative.

- Ce n'est pas un Storybook de tous les états techniques.

- Ce n'est pas une excuse pour créer tous les composants possibles.

- Ce n'est pas une page destinée à être indexée publiquement.

RÈGLE --- il démontre uniquement les primitives et compositions
nécessaires pour valider le système.

# 3. Préconditions

Le Design Lab ne doit être implémenté qu'après l'audit initial du dépôt
et la compréhension des styles, composants, polices, breakpoints et
conventions existantes.

- Confirmer worktree et branche Website V2.

- Lire Brief, Visual Language, Design System, Component Library,
Responsive/Accessibility et Codex Rules.

- Identifier ce qui peut être REUSE / ADAPT avant CREATE.

STOP --- ne pas reconstruire un système parallèle si l'existant contient
déjà une base saine.

# 4. Route et exposition

Route cible indicative : /design-system ou /design-lab, à confirmer
selon l'architecture.

- Non indexée.

- Exclue du sitemap public.

- Peut être protégée ou limitée à l'environnement de
développement/staging.

- Aucun lien principal public vers cette route.

- Suppression ou conservation interne décidée avant Go-Live.

# 5. Structure du laboratoire

Le Lab doit être organisé comme une séquence de validation, pas comme
une longue page aléatoire.

  Zone                    But
  ----------------------- ----------------------------------------------
  00 --- Foundations      Couleurs, typo, spacing, radius, profondeur.
  01 --- Navigation       Header, menus, langue, mobile.
  02 --- Heroes           Tester plusieurs entrées narratives.
  03 --- Light / Dark     Tester rythme et surfaces.
  04 --- Architecture     Bâtiment, blueprint, overlays.
  05 --- Operational UI   États, métriques, incident, occupation.
  06 --- Content          Texte, features, preuves, médias.
  07 --- Narrative        Continuum, timeline, data-to-action.
  08 --- Conversion       CTA et formulaires.
  09 --- Responsive       Comparaison des comportements.
  10 --- Accessibility    Focus, motion, clavier, états.

# 6. Zone 00 --- Foundations

OBLIGATOIRE --- afficher et tester les tokens réels plutôt qu'une simple
documentation.

- Palette sur fond clair et sombre.

- Contrastes texte/fond.

- Échelle typographique complète.

- Espacements et largeurs.

- Rayons et bordures.

- Niveaux d'élévation.

- États sémantiques success / warning / critical.

- Focus ring.

# 7. Zone 01 --- Navigation

Tester SiteHeader dans au moins deux contextes visuels : clair et
sombre/transparent.

- Navigation desktop.

- Menu mobile.

- MegaNav seulement si retenu après audit.

- LanguageSwitch.

- États hover/focus/active.

- Sticky behavior si retenu.

- Navigation clavier complète.

# 8. Zone 02 --- Heroes

Le Lab doit démontrer au moins deux Heroes clairement différents afin de
prouver que le système permet de varier sans perdre CORO.

- HeroArchitectural : bâtiment + données/interface intégrées.

- HeroEditorial ou HeroProduct : composition différente.

- Variante claire et/ou sombre selon pertinence.

- Test titre FR long et EN.

- Test 0, 1 et 2 CTA selon variantes.

INTERDIT --- valider un système où tous les Heroes reposent sur le même
squelette.

# 9. HeroArchitectural --- test signature

Ce bloc constitue le test le plus important de l'identité CORO.

- Bâtiment crédible comme contexte.

- Interface ou données reliées spatialement.

- Profondeur par couches.

- Rouge comme signal focal.

- Lisibilité du H1 indépendante du média.

- Version mobile recomposée.

- Mode reduced motion fonctionnel.

- Performance média acceptable.

# 10. Zone 03 --- Surfaces clair / sombre

Le Lab doit montrer une transition complète : SectionLight → SectionDark
→ retour clair.

- Vérifier que la page ne paraît ni trop blanche ni artificiellement
sombre.

- Tester les bordures et élévations sur les deux contextes.

- Vérifier que le rouge conserve sa puissance.

- Vérifier les CTA secondaires sur fonds opposés.

# 11. Zone 04 --- Architecture / Blueprint

Tester au moins une composition Blueprint réelle.

- Plan ou coupe comme structure.

- CalloutLine.

- FloorMarker ou ZoneMarker.

- BuildingOverlay.

- Information textuelle alternative.

- Version mobile : recadrage ou séquence verticale.

- Aucun libellé illisible après réduction.

# 12. Zone 05 --- Operational UI

Tester une scène opérationnelle compacte, pas un faux dashboard complet.

- OperationalPanel.

- MetricTile.

- StatusChip.

- Event/Timeline element.

- État normal / attention / critique.

- Données plausibles ou explicitement démo.

- Aucun élément inventant une fonction inexistante.

# 13. Zone 06 --- Content

Tester les composants de lecture qui éviteront l'effet « tout en cards
».

- EditorialBlock.

- FeatureList.

- SplitContent.

- ProductCard.

- MetricCard.

- ProofCard ou Testimonial.

- MediaFrame.

- Longueur de texte réaliste FR/EN.

# 14. Zone 07 --- Narrative

Tester au moins un composant expliquant le continuum ou la
transformation.

- Continuum CORO ou DataToActionFlow.

- Desktop : relation globale visible.

- Mobile : séquence compréhensible.

- Animation facultative mais fonctionnelle.

- Version statique complète en reduced motion.

# 15. Zone 08 --- Conversion

- CTASection clair et sombre.

- Primary / Secondary / Text link.

- Formulaire minimal si la conversion du futur site l'exige.

- États focus, loading, success et error.

- Microcopy conforme aux Content Guidelines.

# 16. Zone 09 --- Responsive

Le Design Lab doit être explicitement validé sur plusieurs largeurs; il
ne suffit pas de redimensionner rapidement le navigateur.

- Mobile étroit.

- Mobile large.

- Tablette portrait.

- Tablette paysage si pertinent.

- Desktop standard.

- Grand desktop.

- Tester titres longs, absence de média et contenus plus longs.

# 17. Zone 10 --- Accessibilité

- Parcours complet au clavier.

- Skip link.

- Focus visible.

- Contrastes.

- Landmarks et headings.

- Alt text et médias.

- Menu mobile accessible.

- Reduced motion.

- Zoom / texte agrandi.

- Screen reader sur navigation et composants complexes clés.

# 18. Motion Lab

Le Lab doit permettre de valider la signature de mouvement CORO avant de
l'utiliser partout.

- Micro : hover/focus/état.

- UI : ouverture panel/navigation.

- Narratif : apparition relationnelle d'un overlay ou flux.

- Ambient : seulement si réellement utile.

RÈGLE --- toute animation doit avoir une fonction et une version
réduite.

# 19. Données de démonstration

Les données utilisées dans le Lab doivent être plausibles, cohérentes et
identifiées comme démonstration lorsqu'elles pourraient être
interprétées comme réelles.

- Utiliser un bâtiment fictif ou l'environnement de démonstration CORO.

- Ne pas exposer de données client.

- Ne pas inventer une certification, un résultat ou une fonctionnalité
commerciale.

# 20. Références visuelles

Le Lab doit être comparé à la maquette maîtresse approuvée et aux
futures captures APPROVED.

- La maquette fixe le niveau d'ambition, pas les pixels.

- Les écarts peuvent être meilleurs que la maquette s'ils respectent
l'ADN.

- Une amélioration locale ne doit pas créer un nouveau langage.

- Toute nouvelle signature retenue doit être documentée.

# 21. Workflow de validation

1\. Codex implémente un petit lot du Lab.

2\. Tests techniques.

3\. Revue visuelle.

4\. Ajustements.

5\. Passage REVIEW → APPROVED.

6\. Capture de référence.

7\. Mise à jour du Design System / Component Library.

8\. LOCKED lorsque stable.

RÈGLE --- ne pas attendre la fin du Lab complet pour faire toutes les
validations.

# 22. Lots recommandés

  Lot      Contenu
  -------- ---------------------------------------
  LAB-01   Foundations + Header + navigation.
  LAB-02   HeroArchitectural + second Hero.
  LAB-03   Light/Dark + Content primitives.
  LAB-04   Blueprint + BuildingOverlay.
  LAB-05   Operational UI.
  LAB-06   Continuum / DataToAction + motion.
  LAB-07   CTA + formulaires + footer.
  LAB-08   Responsive / accessibility hardening.
  LAB-09   Regression review + gel V1.0.

# 23. Critères d'acceptation du Lab

Le Design Lab est accepté lorsque :

- l'identité CORO est reconnaissable sans dépendre du logo;

- au moins deux Heroes très différents paraissent appartenir à la même
marque;

- clair, sombre, blueprint et opérationnel fonctionnent ensemble;

- la profondeur existe sans surcharge;

- mobile conserve la personnalité;

- FR/EN ne cassent pas les composants;

- clavier, focus et reduced motion sont traités;

- les composants utilisent les tokens;

- aucune dépendance ou dette disproportionnée n'a été introduite;

- la maquette maîtresse peut être traduite en Web sans imitation rigide.

# 24. Critères de rejet

STOP --- le Lab n'est pas prêt si :

- il ressemble encore à un template SaaS générique;

- les compositions reposent toutes sur les mêmes cards;

- la profondeur disparaît sur mobile;

- les overlays sont décoratifs ou fictifs;

- les styles nécessitent de nombreuses exceptions locales;

- le système est trop rigide pour différencier les familles de produits;

- les performances sont déjà problématiques;

- l'accessibilité dépend de corrections futures.

# 25. Sorties du Design Lab

Après validation, le Lab doit produire :

- Design System V1.0 ajusté.

- Component Library V1.0 ajustée.

- Captures de références APPROVED.

- Liste des composants LOCKED.

- Règles motion finales.

- Règles responsive confirmées.

- Éventuels écarts documentés par rapport à V0.1.

- Base prête pour la reconstruction progressive des vraies pages.

# 26. Relation avec la homepage

La homepage ne doit pas être utilisée comme laboratoire de design. Elle
sera construite après validation du système.

RÈGLE --- le Design Lab absorbe l'exploration; la homepage consomme des
décisions déjà suffisamment mûres.

Cela réduit le risque de refaire plusieurs fois la homepage à mesure que
le langage visuel évolue.

# 27. Statut du Lab après lancement

Une fois Website V2 en production, trois options seront évaluées :
supprimer la route, la conserver uniquement en développement/staging, ou
la faire évoluer en documentation interne du Design System.

Elle ne doit pas devenir une page publique indexable par accident.

# 28. Instruction de reprise pour Codex

Lorsque le quota Codex redevient disponible, ne pas lui demander
immédiatement de construire le Lab. La première étape reste l'audit réel
de coro-website.

Après audit : confronter l'existant aux documents 04, 05, 06, 10 et 12;
proposer la matrice REUSE / ADAPT / MERGE / CREATE / DROP; puis
seulement lancer LAB-01.

# 29. Règle finale

OBJECTIF --- sortir du Design Lab avec un langage CORO prouvé dans le
navigateur, pas seulement décrit dans des documents.

Une fois ce jalon atteint, Codex n'aura plus à inventer le design des
pages. Il devra composer des histoires différentes avec un système
visuel déjà validé.
