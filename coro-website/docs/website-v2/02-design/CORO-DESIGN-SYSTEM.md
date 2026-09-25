CORO

WEBSITE DESIGN SYSTEM V1.0

Website V2 · Spécification gelée

UN SYSTÈME POUR PRODUIRE CORO — PAS UNE COLLECTION DE PAGES

Ce document remplace la spécification V0.1 pré-implémentation. Il décrit le système tel qu'il a été construit et approuvé dans le Design Lab (LAB-01 à LAB-08), et non plus une cible.

Version 1.0 | 24 septembre 2026 | Statut : V1.0 gelé (prend effet à la validation humaine du gel LAB-09)

# 1. Objet et statut

Le Design System CORO Website V2 transforme la direction artistique approuvée en règles vérifiables qui empêchent la dérive entre pages tout en laissant de la liberté de composition.

Il est le contrat de référence pour la migration des pages de production. La source de vérité du code est `app/design-tokens.css` (jetons) et `components/*` (composants). Le registre des statuts est `00-governance/DESIGN-SYSTEM-V1-FREEZE.md`. Le catalogue est `02-design/CORO-COMPONENT-LIBRARY.md`.

RÈGLE — pendant la migration, on ne redessine pas le Design System. On utilise les composants et patterns approuvés d'abord. Une lacune est escaladée, jamais comblée par un nouveau langage visuel local.

# 2. Hiérarchie des sources de vérité

En cas de conflit, la source de priorité supérieure prévaut.

| Priorité | Source | Rôle |
|---|---|---|
| 1 | Décision humaine explicite la plus récente | — |
| 2 | Règles LOCKED de ce document | Rendu et principes gelés. |
| 3 | Jetons V1.0 (`--coro-v1-*`) | Valeurs techniques officielles. |
| 4 | CORO Visual Language | Intention et règles de marque. |
| 5 | Références APPROVED (`02-design/references/`) | Niveau d'ambition et sensation. |
| 6 | Page locale | Adaptation au contenu, jamais nouvelle identité. |

# 3. Cadre de lecture : cinq niveaux

Ce document distingue cinq niveaux. Chaque règle appartient à un seul.

- RÈGLES LOCKED : ne changent pas pendant une migration ordinaire sans approbation explicite.
- DÉFAUTS APPROUVÉS (APPROVED) : le choix par défaut sûr.
- EXCEPTIONS CONTEXTUELLES : permises seulement dans le contexte décrit.
- ÉLÉMENTS À REVOIR (REVIEW) : valides, mais à valider en usage réel.
- MOTIFS REJETÉS (REJECTED) : voir la section autoritative du Visual Language §16.

# 4. Couleur

## 4.1 Palette (jetons V1)

| Jeton | Valeur | Rôle | Niveau |
|---|---|---|---|
| `--coro-v1-red-600` | `#e51b2a` | Action (CTA principal) et signal. Rare. | LOCKED |
| `--coro-v1-red-700` | `#bf1522` | Survol, texte critique sur clair. | APPROVED |
| `--coro-v1-red-300` | `#ff5a66` | Rouge sur fond sombre (texte, critique). | APPROVED |
| `--coro-v1-navy-950` / `-900` / `-800` | `#061d35` / `#082b52` / `#0f3a68` | Autorité, profondeur opérationnelle. | LOCKED (950 / 900) |
| `--coro-v1-blue-700` | `#0d4f8b` | Bleu structurel : information, données, étiquettes techniques. | LOCKED |
| `--coro-v1-blue-500` / `-100` | `#1a6fb8` / `#e6eef6` | Focus sur clair ; teinte de fond bleue. | APPROVED |
| `--coro-v1-surface-0` / `-1` / `-2` | `#ffffff` / `#f6f8fa` / `#eef3f7` | Surfaces claires : blanc, alternance, doux / papier. | APPROVED |
| `--coro-v1-text-900` | `#162b3e` | Texte principal. | APPROVED |
| `--coro-v1-text-600` | `#5d6e7f` | Texte secondaire (≥ 4,5:1 sur toutes les surfaces claires). | APPROVED |
| `--coro-v1-on-dark-900` / `-600` | `#ffffff` / `#b8c9d8` | Texte sur marine. | APPROVED |
| `--coro-v1-border-200` | `#dce4ea` | Bordure neutre décorative. | APPROVED |
| `--coro-v1-success` / `-warning` / `-critical` / `-info` | `#107c47` / `#a15c00` / `#bf1522` / `#0d4f8b` | États sur clair. | APPROVED |
| `--coro-v1-success-on-dark` / `-warning-on-dark` | `#4cc38a` / `#f0b34a` | États sur marine ; information réutilise `--coro-v1-focus-on-dark`, critique réutilise `--coro-v1-red-300`. | APPROVED |
| `--coro-v1-focus` / `-focus-on-dark` | `#1a6fb8` / `#8cc8ff` | Anneau de focus. | LOCKED |

Le rouge est une ressource rare : il attire l'œil et ne devient jamais une couleur de remplissage généralisée. Le vert, l'ambre et le rouge signalent des états stables ; ils ne portent jamais un état seuls (glyphe et libellé textuel obligatoires).

Contrastes vérifiés (WCAG AA) : texte principal et secondaire sur blanc, surface 1 et surface douce ; blanc et texte clair sur marine ; blanc sur rouge CORO (4,64:1) ; états sur clair et sur marine ; anneau de focus (≥ 3:1) sur clair et marine. Un test (`tests/hardening.test.ts`) protège ces ratios.

## 4.2 Règles

- Aucune couleur locale lorsqu'un jeton existe. Aucune valeur hexadécimale locale dans les composants sans justification système.
- Le rouge signifie toujours signal ou action, jamais décoration. Un état Normal ou Terminé n'utilise pas de rouge. Le rouge apparaît sur l'état Critique.
- État et surface sont indépendants : le Normal existe sur marine, le Critique sur blanc.

# 5. Typographie

Famille : Inter (déjà chargée). Titres courts et affirmés ; corps lisible et dense B2B. Les tailles sont fluides.

| Jeton | Valeur | Usage |
|---|---|---|
| `--coro-v1-text-display-xl` | `clamp(2.625rem, 1.6rem + 4vw, 4.75rem)` | Héros exceptionnel. |
| `--coro-v1-text-display-l` | `clamp(2.25rem, 1.5rem + 3vw, 3.75rem)` | Héros standard. |
| `--coro-v1-text-h1` / `-h2` / `-h3` | `clamp(2.125rem, …, 3.25rem)` / `clamp(1.75rem, …, 2.625rem)` / `clamp(1.375rem, …, 1.875rem)` | Titre de page, grande section, sous-section. |
| `--coro-v1-text-body-l` / `-body` / `-small` / `-micro` | 1.0625–1.25rem / 1rem / .875rem / .75rem | Introduction, lecture, secondaire, méta. |
| Étiquette technique | `--coro-v1-label-*` : .75rem, poids 750, interlettrage .12em, capitales | Micro-libellés, indices, statuts. |

RÈGLES — aucun texte V2 sous 10 px (.625rem), plancher protégé par test. Le corps ne descend jamais sous une taille confortable pour faire tenir une composition. Un mot long doit pouvoir se couper plutôt que d'élargir la page.

# 6. Grille, largeur et espacement

- Largeur de contenu : 75 rem (`--coro-v1-content`), large 82,5 rem, lecture 44 rem (`--coro-v1-reading`).
- Échelle d'espacement discrète : `--coro-v1-space-1 / 2 / 3 / 4 / 6 / 8 / 12 / 16 / 24 / 32 / 40` (4 à 160 px).
- Sections : `PageSection` densité `compact`, `standard`, `immersive`.
- Aucun espacement arbitraire lorsqu'un jeton répond au besoin.

# 7. Géométrie (rayons)

| Rôle | Jeton | Valeur | Niveau |
|---|---|---|---|
| Cadre technique | `--coro-v1-radius-frame` | 2 px | LOCKED |
| Panneau (défaut des surfaces de contenu) | `--coro-v1-radius-panel` | 4 px | LOCKED |
| Contrôle (boutons, champs) | `--coro-v1-radius-control` | 8 px | LOCKED |
| Média photographique | `--coro-v1-radius-image` | 10 px, coins visibles et contenus | LOCKED |
| Grands rayons | `--coro-v1-radius-md` / `-lg` / `-xl` | 12 / 16 / 24 px | Exceptionnel, justifié |
| Pill | `--coro-v1-radius-pill` | 999 px | Statut ou étiquette sémantique seulement |

Un média technique (plan, carte, capture) n'utilise jamais 10 px : il prend un cadre net (2 à 4 px).

# 8. Profondeur

Hiérarchie : SURFACE → BORDURE → MÉDIA → SUPERPOSITION → LUMIÈRE → OMBRE. On cherche la profondeur d'abord dans le contraste de surface, le filet de 1 px, le média et l'information reliée à l'objet, l'ombre en dernier.

- Aucune ombre lourde par défaut. Niveaux 1 et 2 suffisent presque toujours. Niveaux 3 et 4 : exceptionnels (élément flottant justifié, signal).
- Sur fond sombre : contraste, bordure et lumière contrôlée, pas de halo.
- Aucun flou, aucun verre, aucune lueur décorative.

# 9. Surfaces et rythme

Tons de `PageSection` : `white`, `soft`, `paper`, `navy`. La surface douce et le papier (grille de dessin) sont contextuels : le papier convient aux familles techniques et documentaires, pas à toutes les pages. Une famille architecturale privilégie `soft` et la photographie.

L'alternance clair / sombre suit le récit (respiration, immersion opérationnelle, retour au réel, preuve, action). Elle ne devient pas mécanique et ne répète pas la même structure deux sections de suite.

# 10. Boutons et CTA

- Principal : rouge CORO, action dominante (`Button` variante `primary`). Un seul principal par contexte.
- Secondaire : marine ou contour selon le fond (`secondary`, `ghost`). Sur fond sombre, `surface="dark"`.
- Cible minimale 44 px ; états hover, focus-visible, pressed et disabled traités.
- Les libellés décrivent l'action et ce qui se passe ensuite (« Demander une démonstration »).

# 11. Cartes et panneaux

Une carte n'est pas le composant par défaut de l'information. Préférer un index (`FeatureIndex`), un filet, une composition de média ou un panneau structuré ; un panneau opérationnel reste un plateau à 4 px, sans ombre.

INTERDIT — grille de trois cartes identiques répétée ; mur de cartes. Voir Visual Language §16.

# 12. Héros

Trois variantes approuvées : `HeroSignature` (architectural, A2, direction préférée), `HeroOperational`, `HeroTechnical`. Un héros n'a pas obligatoirement de badge, deux CTA ou une capture. Le H1 reste compréhensible sans le visuel. Sur mobile, recomposition et non empilement. `HeroArchitectural` (A1) est une comparaison historique (REVIEW). Le mode d'en-tête intégré de `HeroSignature` est une direction approuvée quand la lisibilité du média est maîtrisée, pas un défaut global.

# 13. Médias

- Photographie : rayon 10 px, coins visibles. Cadrage responsive prévu (`object-position`, tranche de l'image). Alt décrivant le média seulement ; aucun texte essentiel uniquement dans l'image.
- Média technique : cadre net, cartouche fermant, jamais 10 px.
- Média de référence (contient du texte ou une marque incrustés) : jamais source de copie ou de vérité produit ; à annoncer comme média de référence.
- Actifs visuels : `public/website-v2/*`, non modifiés par le Lab.

# 14. Superpositions spatiales

- La densité des superpositions est inverse à la densité du média source : photo simple, plusieurs repères ; coupe, nombre modéré ; plan complexe ou carte déjà chargée, très peu d'étiquettes.
- Un repère complet est exceptionnel ; le repère numéroté (`density="ref"`) est la norme sur un média dense ; le détail vit dans la liste sémantique.
- Un repère est aria-hidden ; une liste ordonnée réelle porte tout le contenu. Sur petit écran : marqueurs numérotés limités (2 à 3) sur le média, liste complète dessous (pattern LOCKED).
- Aucune donnée de carte de démonstration n'est présentée comme réelle.

# 15. Interface opérationnelle

- L'intensité opérationnelle détermine la présence de l'interface : Normal = présence minimale (`OperationalScene layout="lead"` + `OperationalRail`) ; Incident = hiérarchie forte (`layout="plate"` + `OperationalPanel`) ; Personnes / évacuation = piloté par l'humain (`layout="people"`) ; Reprise = ouvert, chronologie, preuve, apprentissage (`layout="open"`).
- Situation d'abord, interface ensuite. Ne montrer que ce qui change la décision.
- Toute valeur inventée est identifiée comme démonstration.
- Cinq états : Normal, Information, Attention, Critique, Terminé, chacun avec glyphe et libellé.
- Aucun `LiveIndicator` autonome : « actif » est un état statique avec un mot.

# 16. Flux et continuum

- `Continuum` : neuf étapes canoniques, quatre mouvements, une ligne structurelle unique, boucle d'amélioration vers 01 et 02. Le pic d'intensité (05–06) vient de la surface, de la masse et du profil, pas d'un écart typographique excessif : toutes les étapes ont une autorité comparable.
- Cassure mobile : recomposition verticale avec colonne vertébrale.
- Point de rupture 75 rem (contenu) pour les rangées de flux.
- `DataToActionFlow` : exactement quatre concepts (Données, Décision, Action, Amélioration).
- Le sens est entièrement statique ; le mouvement ne fait que tracer des lignes.

# 17. Conversion et confiance

- La conversion est la prochaine étape, pas une interruption : énoncé, filet, action. Pas de grande carte arrondie, pas de dégradé, pas de bandeau flottant, pas de compte à rebours.
- Deux intensités : `CTASection` clair ou doux (ouvert) après une page calme ; sombre (compact, sur une ligne) après un contenu opérationnel.
- Confiance par la preuve : chaque repère renvoie à la page qui le porte ; un énoncé non vérifié est marqué « À valider ».
- `LeadForm` : vrais labels, `autocomplete`, erreurs associées (`aria-invalid`, `aria-describedby`), résumé d'erreurs qui reçoit le focus, cible 44 px, bouton principal rouge. Le contrat de parrainage et le fournisseur du formulaire de production sont à préserver.
- `SiteFooterV2` : marque et énoncé → navigation → accès (Platform, Client) → coordonnées puis légal. Uniquement des routes implémentées.

# 18. Mouvement

Jetons : `--coro-v1-motion-instant` 80 ms, `-fast` 140 ms, `-base` 220 ms, `-slow` 420 ms, `-narrative` 650 ms ; courbes `--coro-v1-ease-enter` (`cubic-bezier(.16,.84,.3,1)`), `-exit`, `-standard`. Détail et motifs implémentés : `02-design/MOTION-INTERACTION.md` §V1.0.

RÈGLES — le sens est statique d'abord ; aucune boucle infinie, aucun pulse, aucun scroll-jacking ; `prefers-reduced-motion` donne une expérience complète ; règle globale dans `app/design-tokens.css` (animations et transitions ramenées à 0,01 ms).

# 19. Responsive

- Points de rupture partagés : 48 rem et 68 rem.
- Exceptions dictées par le contenu : 75 rem (flux : continuum, données → action) ; 80 rem (annotations techniques du héros). L'en-tête resserre ses espacements entre 68 et 75 rem plutôt que de créer un point de rupture.
- Aucun point de rupture inventé page par page.
- Le mobile est une recomposition, pas une réduction. 320 px est le plancher de sûreté.

Détail : `04-quality/RESPONSIVE-ACCESSIBILITY.md`.

# 20. Accessibilité

- Contrastes AA ; focus visible et cohérent (3 px) ; aucun état porté par la couleur seule ; cibles d'au moins 44 px pour les contrôles ; ordre DOM logique ; alt pertinent ; `prefers-reduced-motion` respecté ; libellés longs FR/EN sans débordement.
- Un audit manuel (zoom réel, Tab réel, lecteur d'écran, mouvement réduit émulé) reste à faire avant production.

# 21. Gouvernance des jetons et des composants

- Aucune couleur, aucun espacement, rayon ou ombre locaux quand un jeton existe. Un nouveau jeton répond à un besoin système, pas à une préférence locale, et se teste sur toutes les pages APPROVED / LOCKED.
- Rechercher l'existant avant de créer ; préférer une variante documentée à une copie ; ne pas dupliquer un composant partagé pour contourner le système.
- Les composants LOCKED ne sont pas modifiés indirectement.
- Adoption des jetons V1 en production : voir `00-governance/DESIGN-SYSTEM-V1-FREEZE.md` §11. Une page migrée n'est pas conforme sans le scope `data-coro-system="v1"`.

# 22. Statuts

DRAFT → REVIEW → APPROVED → LOCKED restent le cycle de vie. Le registre V1.0 utilise LOCKED, APPROVED, REVIEW, REJECTED, MIGRATION-ONLY et LEGACY-DEBT (voir le registre de gel).

# 23. Motifs interdits

La section autoritative est `02-design/CORO-VISUAL-LANGUAGE.md` §16. Elle n'est pas dupliquée ici.

# 24. Historique V0.1 → V1.0 (utile pour la lecture d'anciens documents)

| Sujet | V0.1 | V1.0 |
|---|---|---|
| Rayons | 8 / 12 / 16 / 24 px | 2 / 4 / 8 px + image 10 px ; 12 / 16 / 24 exceptionnels |
| Texte secondaire | `#617283` | `#5d6e7f` |
| Succès | provisoire | `#107c47` (clair), `#4cc38a` (sombre) |
| Ombres | 0 à 4, diffuses | Niveaux 1–2 ; 3–4 exceptionnels ; profondeur par surface d'abord |
| Points de rupture | à aligner après audit | 48 rem / 68 rem partagés ; exceptions 75 rem et 80 rem |
| Familles de pages | par produit | trois familles reliées : Architectural, Opérationnel, Technique (voir Page Family) |
| Typographie | à valider | Inter ; échelle fluide gelée |
| Statut | pré-implémentation | V1.0 gelé, code de référence dans le dépôt |

# 25. Critère de réussite

Si l'on masque le logo, une page doit encore être reconnaissable comme CORO. Si l'on change de produit, elle peut changer de composition sans cesser d'appartenir au même système.

Le Design System est réussi lorsqu'il réduit les décisions arbitraires sans réduire la personnalité du site.

## Évolution V1.1 — VISUAL-01 (approuvée)

Le Design System V1 évolue, il n'est pas redessiné. Principe directeur : MONDE RÉEL → PRODUIT → PROCESSUS → PREUVE → CONVERSION.

- **Héros photographique** : approuvé comme mode d'ouverture de page lorsque le contexte du monde réel renforce matériellement l'identité de la page (`EditorialHero` avec l'option `photo`). Le texte reste en HTML sur un champ marine ; la photographie occupe environ les deux tiers de la largeur et se fond dans le marine par un dégradé confiné au bord côté texte. Aucun dégradé décoratif sans image, aucune lueur, aucun flou, aucun mouvement.
- **Cartes** : autorisées de façon sélective comme dispositifs de profondeur et de regroupement lorsqu'elles représentent un objet distinct (capacité, document, preuve, ressource, statut, connexion produit, moyen de contact) : bordure de 1 px, surface V1, rayon V1, aucune ombre. Les murs de cartes restent rejetés ; au plus un ensemble de cartes majeur par page.
- **Gouvernance des images générées** : les photographies sont des ILLUSTRATIONS MARKETING, décoratives par défaut (`alt=""`), jamais une preuve du produit. Seules les captures approuvées servent de preuve produit.
