CORO

MOTION & INTERACTION

Website V2 · Spécification du mouvement, des transitions et des
interactions

LE MOUVEMENT EXPLIQUE. IL NE DÉCORE PAS.

Le mouvement CORO doit donner vie aux relations entre bâtiment,
personnes, données, décisions et actions sans transformer le site en
démonstration d'effets.

Version 1.0 \| 24 septembre 2026 \| Statut : direction motion

# 1. Objet

Ce document définit la signature de mouvement de CORO Website V2 :
transitions, apparitions, overlays, navigation, scroll, feedback et
comportements interactifs.

PRINCIPE --- toute animation doit expliquer une relation, confirmer une
action, révéler une hiérarchie ou accompagner une transition d'état.

# 2. Caractère du mouvement CORO

Le mouvement est précis, calme, intentionnel et opérationnel.

- Pas nerveux.

- Pas ludique.

- Pas futuriste pour le simple effet.

- Pas de flottement permanent.

- Pas de spectacle avant le contenu.

- Sensation de système maîtrisé : les éléments apparaissent parce qu'une
information devient pertinente.

# 3. Grammaire fondamentale

Le langage motion suit cinq verbes : APPARAÎTRE → RELIER → CHANGER →
CONFIRMER → SE RÉSORBER.

Une donnée apparaît; une ligne la relie à son contexte; un état change;
l'interface confirme; l'élément secondaire se résorbe sans distraire.

# 4. Niveaux de mouvement

  Niveau             Durée cible    Usage
  ------------------ -------------- ----------------------------------------------
  M0 --- Instant     0--100 ms      Changement fonctionnel immédiat.
  M1 --- Micro       120--180 ms    Hover, focus, pressed, chip.
  M2 --- Interface   180--280 ms    Menu, accordion, panel, tooltip.
  M3 --- Narratif    350--700 ms    Overlay, callout, relation bâtiment-donnée.
  M4 --- Séquence    700--1400 ms   Petite chaîne narrative contrôlée.
  M5 --- Ambient     Très lent      Rare; texture ou profondeur non essentielle.

# 5. Easing

Les courbes exactes seront gelées dans le Design System après le Design
Lab.

- Entrée : décélération naturelle.

- Sortie : légèrement plus rapide que l'entrée.

- Changement d'état : direct et stable.

- Éviter les rebonds, elastic, overshoot ou spring ludique sauf
justification exceptionnelle.

RÈGLE --- CORO doit donner une sensation de précision, pas de jouet.

# 6. Apparition au scroll

- Utiliser avec parcimonie.

- Révéler des groupes logiques plutôt que chaque petit élément
séparément.

- Translation faible; opacité et léger déplacement suffisent souvent.

- Le contenu reste visible et ordonné si JavaScript ou animation est
désactivé.

INTERDIT --- faire « popper » chaque card au scroll simplement parce
qu'elle entre dans le viewport.

# 7. Scroll narratif

Le scroll peut expliquer une relation complexe lorsque le contenu le
justifie, notamment bâtiment, continuum ou scénario.

- Une section sticky doit apporter une compréhension impossible ou
nettement moins claire autrement.

- Prévoir une version mobile différente si le sticky devient encombrant.

- Prévoir une version reduced-motion.

- Éviter les séquences trop longues qui emprisonnent l'utilisateur.

# 8. Bâtiment et overlays

Signature privilégiée : le contexte apparaît d'abord, puis les données
utiles se connectent au bâtiment.

1\. Bâtiment / plan visible.

2\. Point ou zone d'intérêt.

3\. CalloutLine.

4\. Overlay ou métrique.

5\. Éventuel changement d'état.

RÈGLE --- l'overlay doit sembler provenir du bâtiment, pas flotter
arbitrairement devant lui.

# 9. Blueprint

- Les tracés peuvent se révéler progressivement si cela aide à
comprendre la structure.

- Les zones peuvent être mises en évidence au moment où leur information
apparaît.

- Les callouts suivent une séquence logique.

- Ne pas animer chaque ligne du plan.

- Sur mobile, préférer une séquence verticale simple à une animation
miniature illisible.

# 10. Data overlays

- Entrée courte et précise.

- Hiérarchie : donnée principale avant détails.

- Un changement critique peut utiliser le rouge et une transition d'état
contrôlée.

- Pas de clignotement permanent.

- Les données live ne doivent pas provoquer des déplacements constants
de layout.

- Une valeur qui change peut être soulignée brièvement puis revenir à un
état stable.

# 11. Sentinelle

Motion narrative privilégiée : entrée → présence → événement →
évacuation → rassemblement → statut.

- Le QR/PIN peut déclencher une confirmation courte.

- L'occupation peut évoluer sans animation spectaculaire.

- Lors d'une évacuation, les statuts changent de manière claire et
traçable.

- Les personnes manquantes reçoivent une emphase sémantique, pas un
effet alarmiste.

# 12. Sentinelle Population

Motion privilégiée : zone → population → canal → diffusion →
confirmation.

- La carte peut révéler progressivement une zone concernée.

- Les canaux apparaissent comme moyens de communication, pas comme feux
d'artifice.

- La propagation d'un message peut être suggérée par une séquence
simple.

INTERDIT --- onde de choc, explosion, sirène visuelle ou animation
catastrophiste.

# 13. Incident

Motion privilégiée : événement → décision → action → changement d'état →
clôture.

- Timeline évolutive.

- Nouvel événement inséré clairement.

- Changement critique perceptible sans clignotement.

- Fin d'incident : transition vers rapport, preuve et REX.

- L'immersion sombre ne justifie pas une animation permanente.

# 14. Exercices

Motion privilégiée : scénario → observation → constat → recommandation →
action.

- La timeline peut progresser par étapes.

- Les constats peuvent se relier aux actions correctives.

- Ton plus pédagogique et moins urgent qu'Incident.

# 15. Documents

Motion privilégiée : données → génération/édition → validation →
approbation → maintien.

- Montrer progression et workflow.

- Les validations peuvent être confirmées par microinteraction.

- Éviter l'animation cliché d'une feuille qui s'écrit toute seule si
elle n'apporte rien.

# 16. Performance et Résilience

- Les métriques peuvent se révéler progressivement.

- Les graphiques animent une fois pour expliquer, pas en boucle.

- Les changements de valeur doivent rester lisibles.

- Le continuum peut progresser d'une étape à l'autre.

- L'Indice CORO doit conserver une présence stable et crédible.

# 17. Knowledge / AI

- Montrer recherche, sources, relation et assistance.

- Les résultats apparaissent avec provenance ou contexte lorsque
pertinent.

- Éviter curseur qui tape tout seul, particules, cerveau ou pulsation «
IA ».

- La validation humaine peut être un moment d'interaction explicite.

# 18. Navigation

- Header sticky : transition discrète de surface/ombre si retenue.

- Menus : ouverture rapide, stable, sans rebond.

- MegaNav : apparition groupée, pas item par item.

- MobileNav : panneau ou couche claire avec focus géré.

- Changement de langue : aucune animation qui ralentit la navigation.

# 19. Boutons

- Hover : changement subtil de surface, bordure ou élévation.

- Pressed : feedback immédiat.

- Focus-visible : état net, non animé ou très court.

- Loading : empêcher ambiguïté et double action.

- Success : confirmation brève.

INTERDIT --- boutons qui grossissent fortement, rebondissent ou
poursuivent le curseur.

# 20. Cards

- Hover uniquement si la card est réellement interactive.

- Élévation faible ou déplacement de 1--3 px maximum comme cible
indicative.

- Une card statique ne doit pas bouger simplement pour sembler moderne.

- Les grilles ne doivent pas lancer des cascades longues d'animations.

# 21. Liens

- Feedback simple : couleur, soulignement, icône ou déplacement très
faible.

- L'état focus est prioritaire sur l'effet hover.

- Les liens externes ne nécessitent pas d'animation spéciale.

# 22. Formulaires

- Focus immédiat et stable.

- Validation au moment approprié, pas d'agitation pendant la saisie.

- Erreur : message + état visuel, sans shake agressif.

- Submit : loading clair.

- Success : confirmation et prochaine étape.

- Les changements de hauteur sont contenus pour limiter les sauts.

# 23. Accordions, tabs et modales

- Accordion : hauteur/opacity courte; contenu accessible sans animation.

- Tabs : changement rapide, éviter slide horizontal théâtral.

- Modal : fade + faible translation ou scale contrôlé.

- Gestion du focus obligatoire.

- Sortie plus rapide que l'entrée.

# 24. États système

Normal → attention → critique doit être perceptible par texte, icône,
couleur et/ou forme.

RÈGLE --- aucun état critique ne repose sur un clignotement continu.

Les transitions servent à attirer brièvement l'attention, puis
l'interface redevient stable.

# 25. Reduced motion

OBLIGATOIRE --- prefers-reduced-motion doit produire une expérience
complète.

- Supprimer parallaxe et séquences complexes.

- Remplacer déplacements par changements instantanés ou fades très
courts.

- Conserver états et confirmations.

- Les données et relations restent disponibles sous forme statique.

- Aucun contenu ne disparaît avec la désactivation du mouvement.

# 26. Mobile

Le mobile privilégie clarté et réactivité.

- Moins d'overlays simultanés.

- Moins de sticky narratif.

- Séquences verticales.

- Interactions tactiles sans dépendance au hover.

- Animation plus courte lorsque l'espace réduit augmente la sensation de
mouvement.

# 27. Performance motion

- Privilégier opacity et transform.

- Éviter animations provoquant des recalculs de layout continus.

- Limiter listeners de scroll lourds.

- Utiliser IntersectionObserver ou mécanismes adaptés lorsque pertinent.

- Ne pas charger une librairie lourde pour quelques fades.

- Toute dépendance motion doit être justifiée après audit du stack.

# 28. Motion tokens proposés

  Token              Cible V0.1
  ------------------ ------------------
  motion-instant     80 ms
  motion-fast        140 ms
  motion-base        220 ms
  motion-slow        420 ms
  motion-narrative   650 ms
  ease-enter         À valider au Lab
  ease-exit          À valider au Lab
  ease-standard      À valider au Lab

# 29. Test du Design Lab

Le Design Lab doit tester :

- navigation desktop/mobile;

- hover/focus/pressed;

- apparition de section;

- BuildingOverlay + CalloutLine;

- changement d'état opérationnel;

- continuum ou DataToActionFlow;

- formulaire loading/error/success;

- reduced motion;

- mobile réel ou émulation fiable;

- impact performance.

# 30. Critères d'acceptation

Le motion system est APPROVED lorsque :

- le mouvement semble appartenir à CORO;

- il explique plutôt qu'il distrait;

- il reste cohérent entre produits;

- les durées et easings sont tokenisés;

- reduced motion est complet;

- mobile reste confortable;

- aucune animation ne dégrade sensiblement la performance;

- aucun effet ne devient indispensable à la compréhension.

# 31. Anti-patterns

INTERDIT --- parallax agressive; cartes flottantes en boucle; glow
pulsant; particules; compteurs qui repartent à chaque scroll; animations
longues avant accès au contenu; texte qui se tape automatiquement;
transitions 3D gratuites; zooms permanents; clignotement d'alerte;
curseur custom qui gêne l'usage.

# 32. Règle finale

PRINCIPE --- CORO doit donner l'impression qu'un système opérationnel
prend vie au bon moment, pas qu'une landing page cherche à
impressionner.

Le meilleur mouvement CORO est celui qui rend une relation évidente puis
s'efface pour laisser l'utilisateur comprendre et agir.
