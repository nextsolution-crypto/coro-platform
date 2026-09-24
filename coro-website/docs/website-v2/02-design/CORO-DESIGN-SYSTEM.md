CORO

DESIGN SYSTEM

Website V2 · Spécification V0.1 pré-implémentation

UN SYSTÈME POUR PRODUIRE CORO --- PAS UNE COLLECTION DE PAGES

Ce document traduit le Visual Language en règles réutilisables. Les
valeurs marquées PROVISOIRE devront être confrontées au code existant et
au Design Lab avant gel.

Version 0.1 \| 23 septembre 2026 \| Statut : pré-implémentation

# 1. Objet et statut

Le Design System CORO Website V2 transforme la direction artistique
approuvée en règles suffisamment précises pour empêcher la dérive
interpages tout en laissant de la liberté de composition.

IMPORTANT --- V0.1 n'est pas encore un contrat CSS. Les valeurs
proposées servent de cible et devront être comparées au dépôt puis
validées dans le Design Lab avant V1.0 / LOCKED.

# 2. Hiérarchie des sources de vérité

En cas de conflit, la source de priorité supérieure prévaut. Toute
exception doit être documentée.

  Priorité   Source                      Rôle
  ---------- --------------------------- --------------------------------------------------
  1          Composants LOCKED           Rendu déjà approuvé.
  2          Tokens Design System V1.0   Valeurs techniques officielles.
  3          CORO Visual Language        Intention et règles de marque.
  4          Références APPROVED         Cible de composition et sensation.
  5          Page locale                 Adaptation au contenu, jamais nouvelle identité.

# 3. Principes du système

- Tokeniser avant de styliser localement.

- Composer avec des primitives et patterns réutilisables.

- Créer des variantes plutôt que dupliquer un composant.

- Limiter les valeurs arbitraires.

- Maintenir une sémantique stable pour couleur, profondeur et état.

- Concevoir desktop, tablette et mobile ensemble.

RÈGLE --- une nouvelle composition est permise; un nouveau langage
visuel ne l'est pas.

# 4. Palette fonctionnelle V0.1

Le rouge CORO est une ressource rare : il attire l'œil et ne devient pas
une couleur de remplissage généralisée.

  Token proposé                     Valeur cible   Usage
  --------------------------------- -------------- --------------------------------
  \--coro-navy-950                  #061D35        Sections immersives profondes.
  \--coro-navy-900                  #082B52        Marine principal / identité.
  \--coro-blue-700                  #0D4F8B        Accent technique / données.
  \--coro-red-600                   #E51B2A        Signal / CTA / événement.
  \--surface-0                      #FFFFFF        Surface claire principale.
  \--surface-1                      #F6F8FA        Alternance claire.
  \--surface-2                      #EEF3F7        Blueprint / technique.
  \--text-900                       #162B3E        Texte principal.
  \--text-600                       #617283        Texte secondaire.
  \--border-200                     #DCE4EA        Bordure neutre.
  \--success / warning / critical   PROVISOIRE     États sémantiques.

# 5. Typographie

Famille exacte : À VALIDER après audit des polices déjà chargées et des
licences. Les titres sont courts et affirmés; le body privilégie
lisibilité et densité B2B.

  Style           Desktop   Mobile   Usage
  --------------- --------- -------- ----------------------
  Display XL      64--76    42--50   Hero exceptionnel.
  Display L       52--60    36--42   Hero standard.
  H1              44--52    34--40   Titre page.
  H2              34--42    28--34   Grande section.
  H3              24--30    22--26   Sous-section.
  Body L          18--20    17--19   Intro.
  Body            16--18    16--17   Lecture.
  Small / Micro   11--14    11--14   Meta, statut, label.

# 6. Grille et rythme

L'espacement suit une échelle discrète plutôt que des valeurs inventées
localement.

  Règle               Cible V0.1      Note
  ------------------- --------------- ---------------------
  Max content         1200--1320 px   Selon densité.
  Text measure        620--760 px     Lecture éditoriale.
  Gutter desktop      32--48 px       À tester.
  Gutter tablet       24--32 px       Transition.
  Gutter mobile       20--24 px       Respiration.
  Section standard    96--128 px      Rythme principal.
  Section immersive   128--176 px     Hero / statement.

# 7. Espacement

Échelle proposée : 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 160
px.

# 8. Géométrie

Rayons cibles : 8 / 12 / 16 / 24 px, plus pill lorsque sémantiquement
nécessaire.

CORO doit rester plus architectural que « bubbly ». Les grands rayons
sont réservés aux surfaces qui les justifient.

# 9. Profondeur

Niveaux : 0 Flat → 1 Structure → 2 Raised → 3 Floating UI → 4 Signal.

- Ombres diffuses et sobres.

- Sur fond sombre, préférer contraste, bordure et lumière contrôlée.

- Le contexte détermine l'élévation; pas le composant seul.

# 10. Boutons et CTA

- Primary : rouge CORO, action dominante.

- Secondary : marine ou outline selon fond.

- Ghost : navigation contextuelle.

- Text link : approfondissement.

- Hover, focus, active et disabled obligatoires en V1.0.

- Les libellés décrivent l'action concrète.

# 11. Cards et panneaux

Une card n'est pas le composant par défaut de toute information.

Familles : Editorial Card, Product Card, Metric Card, Operational Panel,
Floating UI, Proof Card.

INTERDIT --- transformer chaque section en grille de trois cartes
identiques.

# 12. Sections

Primitives : SectionLight, SectionSoft, SectionDark, SectionBlueprint,
SectionMedia, SectionStatement, SectionProof.

Les pages alternent ces primitives selon leur histoire; aucune séquence
fixe ne doit être répétée mécaniquement.

# 13. Heroes

Variantes : HeroArchitectural, HeroProduct, HeroEditorial,
HeroOperational, HeroMinimal.

- Un Hero n'a pas obligatoirement un badge, deux CTA ou un screenshot.

- Le H1 reste compréhensible sans le visuel.

- Le mobile conserve la hiérarchie au lieu d'empiler mécaniquement le
desktop.

# 14. Data overlays

- Chaque overlay a une source claire : bâtiment, zone, personne,
événement ou indicateur.

- Limiter les overlays simultanés.

- Utiliser des données plausibles et des fonctions réelles.

- Rouge = signal; vert = positif; bleus = contexte.

- Éviter les overlays purement décoratifs.

# 15. Médias

- Ratios standardisés par famille de composant.

- Recadrage responsive prévu dès la conception.

- Aucun texte essentiel uniquement dans une image.

- Alt text, lazy loading et formats modernes.

- Les médias hero ont une stratégie de performance et de fallback.

# 16. Mouvement

Le mouvement raconte une transition d'état ou une relation. Réduction
des animations obligatoire.

  Type       Durée cible   Usage
  ---------- ------------- ------------------------------
  Micro      120--180 ms   Hover / focus / état.
  UI         180--280 ms   Panel / navigation.
  Narratif   350--700 ms   Donnée / relation spatiale.
  Ambient    Très lent     Subtil, utile, désactivable.

# 17. Responsive

- Les breakpoints exacts seront alignés sur le code existant après
audit.

- Hero riche sur desktop, hiérarchie simplifiée mais identité conservée
sur mobile.

- Overlays : 1--2 éléments prioritaires maximum sur mobile.

- Blueprint : recadrage ou séquence guidée.

- Aucun breakpoint inventé page par page.

# 18. Accessibilité

- Contrastes conformes pour texte, contrôles et états.

- Focus clavier visible et cohérent.

- Ordre DOM logique indépendamment de la composition.

- Un état n'est jamais communiqué uniquement par couleur.

- Cibles tactiles suffisantes.

- Alt text pertinent.

- prefers-reduced-motion pris en charge.

- Zoom et agrandissement du texte ne cassent pas les compositions.

# 19. Composants pressentis

SiteHeader / MegaNav / MobileNav; HeroArchitectural / HeroProduct /
HeroEditorial / HeroOperational; Section / SectionDark /
SectionBlueprint / SectionMedia; ProductCard / MetricCard /
OperationalPanel / FloatingUI / ProofCard; BuildingOverlay /
BlueprintFrame / DataCallout; Continuum / Timeline / ProcessFlow /
ArchitectureDiagram; LogoCloud / Testimonial / CTASection / SiteFooter.

Cette liste sera validée et dédupliquée dans le Document 06 après audit
du code.

# 20. Gouvernance des tokens

- Aucune couleur locale lorsqu'un token existe.

- Aucun spacing arbitraire lorsqu'un token répond au besoin.

- Aucun nouveau radius ou shadow sans justification système.

- Les changements de token sont évalués sur toutes les pages APPROVED /
LOCKED.

# 21. Gouvernance des composants

- Rechercher l'existant avant de créer.

- Préférer une variante documentée à une copie locale.

- Un nouveau composant répond à un besoin réel non couvert.

- Les props ne servent pas à recréer des styles arbitraires.

- Tester les composants partagés sur toutes leurs pages avant merge.

- Les composants LOCKED ne sont pas modifiés indirectement.

# 22. États de validation

DRAFT → REVIEW → APPROVED → LOCKED.

  Statut     Signification
  ---------- ----------------------------------------------------------------------
  DRAFT      Exploration; aucune garantie de stabilité.
  REVIEW     Assez mature pour revue visuelle et responsive.
  APPROVED   Conforme à la direction et réutilisable comme référence.
  LOCKED     Référence stable; modification uniquement avec validation explicite.

# 23. Conditions de passage V0.1 → V1.0

- Audit des styles, polices, composants et breakpoints actuels.

- Construction du Design Lab.

- Test des tokens sur au moins un Hero, une section claire, une section
sombre, un blueprint, une interface flottante, des cards, un CTA et le
footer.

- Validation desktop / tablette / mobile.

- Contrôle accessibilité et performance.

- Suppression ou justification de toute valeur provisoire.

- Validation finale de Mathieu avant statut LOCKED.

# 24. Critère de réussite

Si l'on masque le logo, une page doit encore être reconnaissable comme
CORO. Si l'on change de produit, elle doit pouvoir changer de
composition sans cesser d'appartenir au même système.

Le Design System est réussi lorsqu'il réduit les décisions arbitraires
de Codex sans réduire la personnalité du site.

# 25. Prochaine étape

Cette V0.1 peut être utilisée pour préparer le Design Lab, mais elle ne
doit pas être implémentée aveuglément avant l'audit du dépôt. Au retour
de Codex : inventaire technique → confrontation avec V0.1 → Design Lab →
ajustements → Design System V1.0.
