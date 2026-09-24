CORO

RESPONSIVE & ACCESSIBILITY

Website V2 · Règles de conception multi-écrans et accessible

LA MÊME IDENTITÉ. LA MÊME INFORMATION. QUEL QUE SOIT L'ÉCRAN.

Le responsive et l'accessibilité ne sont pas des corrections de fin de
chantier. Ils font partie du système de conception dès le premier
composant.

Version 1.0 \| 24 septembre 2026 \| Statut : référence de conception

# 1. Objet et portée

Ce document définit les règles de conception responsive et
d'accessibilité de CORO Website V2. Il s'applique à toutes les pages,
composants, médias, formulaires, animations et parcours publics.

PRINCIPE --- aucune version mobile ou accessible ne doit être traitée
comme une version secondaire du site.

# 2. Objectif de conformité

Le chantier vise une expérience conforme aux bonnes pratiques modernes
d'accessibilité Web et structurée pour atteindre WCAG 2.2 niveau AA sur
le site public, sous réserve de validation technique et de tests.

RÈGLE --- lorsqu'un choix esthétique entre en conflit avec l'accès au
contenu ou à l'action, l'accès au contenu et à l'action prévaut.

# 3. Responsive : philosophie

CORO est conçu mobile-first au niveau des comportements, même lorsque
certaines compositions sont d'abord explorées visuellement en grand
écran.

- Le contenu prioritaire reste prioritaire sur tous les écrans.

- Les relations complexes sont simplifiées, pas supprimées.

- Les compositions sont recomposées plutôt que simplement rétrécies.

- L'identité architecturale doit survivre sur mobile.

- Aucun contenu essentiel ne dépend d'un hover.

# 4. Breakpoints

Les breakpoints définitifs devront être alignés sur le code existant
après audit. La V1.0 fonctionnelle du site utilisera un ensemble limité
et partagé.

RÈGLE --- aucun composant ou page ne crée son propre breakpoint sans
justification et validation.

Zones conceptuelles : mobile étroit, mobile large, tablette, desktop,
grand desktop. Ces zones décrivent des comportements; elles ne
constituent pas encore des valeurs CSS officielles.

# 5. Largeurs et gutters

- Gutter mobile cible : environ 20--24 px, à valider.

- Tablette : environ 24--32 px.

- Desktop : environ 32--48 px.

- Largeur maximale de contenu cohérente avec le Design System.

- Les textes longs conservent une mesure lisible; ils ne s'étirent pas
sur toute la largeur.

- Les zones full-bleed sont réservées aux médias ou compositions qui le
justifient.

# 6. Typographie responsive

Les tailles exactes sont définies par les tokens du Design System;
l'échelle doit cependant conserver une hiérarchie forte sans provoquer
de coupures artificielles.

- Utiliser des tailles fluides lorsque cela améliore la transition.

- Éviter les H1 dont la taille rend le contenu dominant au détriment de
l'information.

- Tester les titres FR et EN, notamment les chaînes longues.

- Ne jamais réduire le body sous une taille confortable uniquement pour
faire tenir une composition.

# 7. Navigation

OBLIGATOIRE --- la navigation est utilisable au clavier, au toucher et
avec technologies d'assistance.

- Logo avec destination claire.

- Menu mobile avec état ouvert/fermé annoncé correctement.

- Gestion du focus lors de l'ouverture et fermeture.

- Échap ferme les panneaux/modales lorsque pertinent.

- Les sous-menus ne dépendent pas uniquement du hover.

- Le sélecteur FR/EN est compréhensible et accessible.

# 8. Heroes

Sur mobile, un Hero n'est pas la version desktop empilée mécaniquement.

- H1 et promesse restent prioritaires.

- Les overlays sont réduits à l'information la plus utile.

- Un bâtiment ou média peut être recadré, repositionné ou simplifié.

- Les CTA restent visibles sans occuper tout le premier écran.

- Les données décoratives peuvent être supprimées; les données porteuses
de sens restent accessibles.

# 9. Blueprints, plans et bâtiments

Les compositions architecturales exigent une stratégie spécifique sur
petits écrans.

- Recadrage sur une zone significative.

- Séquence verticale de callouts lorsque la vue globale devient
illisible.

- Possibilité de séparer plan et explications.

- Les informations contenues dans le plan doivent exister sous forme
textuelle accessible si elles sont essentielles.

INTERDIT --- réduire un plan desktop jusqu'à rendre ses libellés
illisibles.

# 10. Cards et grilles

- Le nombre de colonnes diminue progressivement selon l'espace
disponible.

- L'ordre de lecture visuel doit correspondre à l'ordre DOM.

- Les hauteurs forcées sont évitées lorsqu'elles nuisent aux contenus
FR/EN.

- Le carousel n'est utilisé que s'il améliore réellement l'expérience.

- Les informations importantes ne doivent pas être cachées derrière un
swipe non évident.

# 11. Tableaux et comparaisons

- Éviter le scroll horizontal pour des informations simples pouvant être
restructurées.

- Pour les tableaux complexes, prévoir une stratégie explicite : scroll
contrôlé, cartes par ligne, priorisation de colonnes ou vue alternative.

- Les en-têtes restent associés sémantiquement aux cellules.

- Les données ne sont jamais communiquées uniquement par position ou
couleur.

# 12. Formulaires

OBLIGATOIRE --- chaque champ possède un label persistant ou une
association accessible équivalente.

- Placeholder ≠ label.

- Erreurs associées au champ et expliquées clairement.

- Résumé d'erreurs lorsque le formulaire le justifie.

- Autofill et types de champs appropriés.

- Ordre de tabulation logique.

- Bouton de soumission explicite.

- État de chargement et confirmation après envoi.

# 13. Touch et interactions

- Cibles tactiles suffisamment grandes et espacées.

- Aucun geste complexe obligatoire sans alternative.

- Hover ne porte aucune information exclusive.

- États pressed/selected visibles.

- Les éléments cliquables doivent paraître interactifs.

- Éviter les contrôles minuscules dans les overlays opérationnels.

# 14. Clavier et focus

RÈGLE --- toute action disponible à la souris doit être accessible au
clavier lorsque sémantiquement applicable.

- Focus visible et contrasté.

- Ordre de focus prévisible.

- Aucun piège clavier.

- Les modales gèrent correctement l'entrée, le confinement et le retour
du focus.

- Skip link vers le contenu principal.

- Ne pas utiliser tabindex positif pour réordonner artificiellement la
page.

# 15. Sémantique HTML

- Une structure de headings logique.

- Un seul H1 principal par page sauf justification exceptionnelle.

- Utiliser button pour une action et link pour une navigation.

- Landmarks : header, nav, main, footer lorsque pertinents.

- Listes, tableaux, citations et formulaires utilisent leurs éléments
sémantiques.

- Éviter les div cliquables qui reproduisent des contrôles natifs.

# 16. Couleur et contraste

Les contrastes finaux seront vérifiés sur les tokens officiels.

- Texte normal : viser au minimum les exigences AA.

- Gros texte : exigences AA correspondantes.

- Focus, bordures fonctionnelles et contrôles doivent rester
perceptibles.

- Rouge, vert et ambre ne communiquent jamais seuls un état.

- Les overlays sur photographie utilisent une surface, un scrim ou une
solution garantissant la lisibilité.

# 17. Images et alt text

- Image informative : alt text décrivant sa fonction ou information
utile.

- Image décorative : alt vide lorsque approprié.

- Une capture d'interface est décrite selon ce qu'elle démontre, pas
pixel par pixel.

- Un plan essentiel nécessite une alternative textuelle ou structurée.

- Éviter de répéter dans l'alt un texte déjà immédiatement adjacent.

# 18. Vidéo et audio

- Les vidéos informatives prévoient sous-titres lorsque de la parole est
présente.

- Une transcription est prévue lorsque le contenu le justifie.

- Pas d'audio automatique.

- Contrôles accessibles.

- Les vidéos décoratives ne transportent aucune information essentielle.

- Les animations de fond ne doivent pas nuire à la lecture.

# 19. Mouvement et reduced motion

OBLIGATOIRE --- respecter prefers-reduced-motion.

- Les animations narratives possèdent une version réduite ou statique.

- Aucun contenu ne dépend du mouvement pour être compris.

- Éviter flashes, mouvements agressifs et parallaxe forte.

- Les microinteractions peuvent être réduites sans supprimer l'état
fonctionnel.

# 20. Zoom, reflow et orientation

- Le contenu doit rester utilisable avec agrandissement du texte et zoom
navigateur.

- Éviter les hauteurs fixes qui coupent le contenu.

- Le reflow doit limiter le besoin de défilement bidirectionnel.

- Ne pas verrouiller une orientation d'écran sans nécessité réelle.

- Tester les composants complexes avec police agrandie.

# 21. FR / EN et accessibilité

- L'attribut de langue du document est correct.

- Les changements de langue dans un contenu sont balisés lorsque
nécessaire.

- Les textes plus longs en français ne sont pas tronqués.

- Les acronymes et libellés restent compréhensibles.

- La version anglaise reçoit les mêmes tests que la version française.

# 22. États système

Chaque composant interactif prévoit : default, hover, focus-visible,
active, disabled et, selon le cas, loading, success, warning, error et
empty.

RÈGLE --- un état doit être perceptible par plus d'un seul indice
lorsque nécessaire : texte, icône, forme, couleur, position ou annonce
accessible.

# 23. Contenu dynamique

- Les mises à jour importantes sont annoncées aux technologies
d'assistance lorsque pertinent.

- Éviter les régions live trop bavardes.

- Un chargement ne doit pas déplacer brutalement le contenu.

- Les skeletons sont décoratifs et ne remplacent pas un statut de
chargement accessible.

- Les erreurs asynchrones doivent être compréhensibles et récupérables.

# 24. Performance comme accessibilité

Une expérience lourde pénalise particulièrement le mobile, les
connexions lentes et certains utilisateurs de technologies d'assistance.

- Images dimensionnées et optimisées.

- Lazy loading lorsque pertinent.

- JavaScript limité aux interactions nécessaires.

- Fonts chargées de façon contrôlée.

- Pas de vidéo hero lourde sans stratégie de fallback.

- Réserver l'espace des médias pour limiter les décalages de mise en
page.

# 25. Matrice de test par viewport

  Vue                 Objectif de test
  ------------------- --------------------------------------------------------------
  Mobile étroit       Lisibilité, navigation, CTA, titres longs, plans simplifiés.
  Mobile large        Rythme, cards, overlays prioritaires, formulaires.
  Tablette portrait   Transitions de grille, navigation, splits.
  Tablette paysage    Compositions intermédiaires, médias.
  Desktop standard    Composition cible, profondeur, navigation complète.
  Grand desktop       Max-width, respiration, absence d'étirement excessif.

# 26. Matrice de test accessibilité

  Test             Minimum
  ---------------- -----------------------------------------------------
  Clavier          Parcours complet sans souris.
  Focus            Visible et ordre logique.
  Contraste        Tokens et overlays.
  Screen reader    Navigation, formulaires, composants complexes clés.
  Zoom / texte     Agrandissement sans perte de contenu.
  Reduced motion   Version utilisable et cohérente.
  FR / EN          Même niveau d'accès dans les deux langues.
  Erreurs          Compréhensibles, associées, récupérables.

# 27. Definition of Done --- composant

Un composant n'est pas APPROVED tant que :

- desktop, tablette et mobile sont vérifiés;

- clavier et focus fonctionnent;

- sémantique et noms accessibles sont corrects;

- contrastes et états sont vérifiés;

- FR/EN sont testés;

- zoom et contenu long ne cassent pas le rendu;

- reduced motion est traité si animation;

- aucun contenu essentiel n'est perdu sur petit écran.

# 28. Definition of Done --- page

- Hiérarchie de headings valide.

- Navigation et landmarks cohérents.

- Tous les CTA utilisables au clavier et au toucher.

- Images et médias traités.

- Formulaires accessibles le cas échéant.

- Responsive validé sur la matrice de viewports.

- Pas de débordement horizontal accidentel.

- Contenu complet FR/EN.

- Tests d'accessibilité de base passés.

- Aucune régression sur composants LOCKED.

# 29. Outils et validation technique

Les outils exacts seront confirmés après audit du dépôt. Le chantier
devrait combiner tests automatisés et vérification humaine.

- Lint / règles JSX ou équivalent.

- Audit automatisé d'accessibilité.

- Audit navigateur de performance.

- Tests clavier manuels.

- Vérification lecteur d'écran sur les parcours clés.

- Tests responsive réels ou émulation fiable.

IMPORTANT --- un score automatisé ne constitue pas à lui seul une
validation d'accessibilité.

# 30. À confirmer après audit du code

- Breakpoints existants.

- Framework CSS et stratégie responsive.

- Bibliothèque de composants.

- Outils de test actuels.

- Gestion du focus dans navigation/modales.

- Fonts et stratégie de chargement.

- Architecture i18n.

- Composants interactifs existants à auditer.

- Niveau actuel de conformité et dette d'accessibilité.

# 31. Règle finale

PRINCIPE --- Website V2 doit être aussi convaincant sur un téléphone
tenu d'une main et avec un clavier qu'il l'est sur un grand écran de
présentation.

La profondeur graphique CORO ne doit jamais dépendre de l'exclusion d'un
utilisateur. Le système doit conserver personnalité, information et
capacité d'action dans toutes les conditions d'usage.
