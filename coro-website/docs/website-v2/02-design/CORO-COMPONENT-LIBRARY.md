CORO

COMPONENT LIBRARY

Website V2 · Catalogue fonctionnel V0.1

VARIER LES COMPOSITIONS. STABILISER LE VOCABULAIRE.

Ce catalogue définit les familles de composants attendues pour Website
V2 avant confrontation au code existant. Il ne présume pas que ces
composants doivent tous être créés.

Version 0.1 \| 23 septembre 2026 \| Statut : pré-audit

# 1. Objet et statut

Le Component Library transforme le Design System en vocabulaire de
construction. Il décrit les responsabilités, variantes et règles d'usage
des composants qui permettront de créer des pages différentes sans
perdre l'identité CORO.

IMPORTANT --- cette V0.1 est une architecture cible. Après audit du
dépôt, chaque entrée devra être classée REUSE, ADAPT, MERGE, CREATE ou
DROP.

# 2. Principe de composition

RÈGLE --- une page ne doit jamais être conçue comme une suite de
composants choisis au hasard. Elle raconte une histoire; les composants
servent cette histoire.

- Réutiliser avant de créer.

- Préférer une variante à une duplication.

- Garder les composants suffisamment spécialisés pour porter l'identité
CORO.

- Éviter les composants universels surconfigurables qui finissent par
accepter n'importe quel style local.

# 3. Taxonomie

Le système est organisé en neuf familles.

  Famille             Rôle
  ------------------- ---------------------------------------------------
  A. Shell            Navigation, structure globale, footer.
  B. Hero             Entrée narrative des pages.
  C. Sections         Surfaces et rythmes principaux.
  D. Content          Texte, média, preuve, caractéristiques.
  E. Operational UI   Données, états, incidents, occupation.
  F. Architecture     Bâtiment, plan, zones et overlays.
  G. Narrative        Continuum, processus, timeline, relations.
  H. Conversion       CTA, formulaires, démonstration.
  I. Utility          Breadcrumb, langue, badges, états, accessibilité.

# 4. A --- Shell

Ces composants donnent au site sa cohérence structurelle.

  Composant         Variantes / rôle
  ----------------- ---------------------------------------------------------
  SiteHeader        Transparent / Light / Dark; sticky contrôlé.
  PrimaryNav        Navigation principale desktop.
  MegaNav           Écosystème, solutions ou ressources.
  MobileNav         Navigation mobile complète et accessible.
  LanguageSwitch    FR / EN; conserve le contexte si possible.
  AnnouncementBar   Optionnel; information temporaire.
  SiteFooter        Navigation secondaire, légal, confiance, accès produit.

# 5. B --- Heroes

Le Hero varie selon le rôle de la page. Il n'existe pas de template Hero
unique.

  Composant           Usage
  ------------------- ---------------------------------------------------------
  HeroArchitectural   Bâtiment + interface/données intégrées; signature CORO.
  HeroProduct         Produit précis + preuve d'usage.
  HeroEditorial       Vision ou sujet complexe dominé par la typographie.
  HeroOperational     Temps réel, incident, occupation, commandement.
  HeroMinimal         Pages secondaires, légales ou utilitaires.

# 6. Anatomie commune des Heroes

- Eyebrow optionnel, jamais obligatoire.

- H1 obligatoire et compréhensible sans le visuel.

- Lead court.

- 0 à 2 CTA selon le besoin réel.

- Média ou composition secondaire optionnelle.

- Zone de preuve possible : métrique, client, conformité ou statut.

INTERDIT --- imposer badge + H1 + paragraphe + deux boutons + screenshot
à toutes les pages.

# 7. C --- Sections

Les sections sont des surfaces de composition, pas des templates de
contenu.

  Composant          Rôle
  ------------------ -------------------------------------
  SectionLight       Lecture, précision, respiration.
  SectionSoft        Alternance claire.
  SectionDark        Immersion, produit, command center.
  SectionBlueprint   Plan, coupe, relation spatiale.
  SectionMedia       Photo ou vidéo dominante.
  SectionStatement   Grande idée / typographie forte.
  SectionProof       Réassurance, résultats, conformité.

# 8. D --- Content

Ces composants structurent le contenu sans transformer chaque
information en card.

  Composant        Rôle
  ---------------- ----------------------------------------------------
  EditorialBlock   Titre, texte, liste, lien.
  SplitContent     Texte + média / interface.
  FeatureList      Liste structurée.
  FeatureGrid      Grille lorsque les éléments sont réellement pairs.
  ProductCard      Module / capacité.
  MetricCard       Chiffre ou indicateur dominant.
  ProofCard        Résultat, conformité, référence.
  LogoCloud        Clients / partenaires lorsque justifié.
  Testimonial      Citation / preuve sociale.
  MediaFrame       Image, vidéo ou capture contrôlée.

# 9. E --- Operational UI

Ces composants donnent à CORO sa dimension opérationnelle et restent
liés à de vraies fonctions.

  Composant          Exemple
  ------------------ ---------------------------------------
  OperationalPanel   État bâtiment / incident / opération.
  StatusChip         Normal / attention / critique.
  MetricTile         Occupation, indice, progression.
  EventCard          Incident, exercice, évacuation.
  TimelineEvent      Chronologie intervention.
  PeopleStatus       Présent, évacué, manquant, rôle.
  ActionItem         Action, responsable, échéance.
  DocumentStatus     Brouillon, validation, approuvé.
  LiveIndicator      Temps réel seulement si pertinent.

# 10. F --- Architecture et bâtiment

Cette famille est une signature différenciante de CORO.

  Composant         Rôle
  ----------------- ----------------------------------------
  BuildingFrame     Bâtiment ou scène.
  BlueprintFrame    Plan / coupe technique.
  BuildingOverlay   Donnée reliée spatialement.
  FloorMarker       Étage / niveau.
  ZoneMarker        Zone / secteur / rassemblement.
  CalloutLine       Lien contexte-donnée.
  MapFrame          Territoire / Population / multi-sites.
  ResponderView     Vue synthétique premiers répondants.

# 11. Règles des overlays

- Un overlay est relié à un objet ou une donnée identifiable.

- Limiter le nombre simultané.

- Prioriser sur mobile.

- Utiliser les couleurs sémantiques de manière stable.

- Ne pas inventer de fonctions CORO pour enrichir une scène.

# 12. G --- Narrative

Ces composants expliquent relations, séquences et transformations.

  Composant             Rôle
  --------------------- -------------------------------------------------------------------------------------------------
  Continuum             Connaître → anticiper → détecter → décider → agir → protéger → prouver → apprendre → améliorer.
  ProcessFlow           Étapes d'un processus.
  Timeline              Progression temporelle.
  ArchitectureDiagram   Relations entre modules ou couches.
  BeforeAfter           État avant / après.
  ScenarioFlow          Déroulé d'un scénario.
  DataToActionFlow      Données → décisions → actions → preuves → apprentissage.

# 13. H --- Conversion

La conversion reste sobre et adaptée à une vente B2B consultative.

  Composant    Rôle
  ------------ ---------------------------------------------
  CTASection   Action principale.
  DemoCTA      Demande de démonstration.
  ContactCTA   Prise de contact.
  InlineCTA    Action contextuelle légère.
  LeadForm     Formulaire de conversion.
  TrustStrip   Hébergement, conformité, sécurité, support.

# 14. I --- Utility

  Composant    Rôle
  ------------ ---------------------------
  Breadcrumb   Orientation.
  Badge        Catégorie ou statut.
  Tag          Métadonnée / filtre.
  Tooltip      Aide courte accessible.
  Accordion    Contenu secondaire / FAQ.
  Tabs         Vues apparentées.
  Modal        Interaction ciblée.
  SkipLink     Accessibilité clavier.
  FocusRing    Focus cohérent.

# 15. Variantes plutôt que copies

RÈGLE --- lorsqu'une page nécessite une variation, vérifier d'abord si
elle peut devenir une variante documentée du composant existant.

Exemples : SectionDark density=compact\|standard\|immersive; HeroProduct
media=dashboard\|building\|photo; MetricCard emphasis=normal\|strong.

INTERDIT --- multiplier FeatureCard2, FeatureCardNew,
FeatureCardSentinel ou autres doublons locaux.

# 16. Props et API

- Les props expriment une intention sémantique, pas une valeur CSS
arbitraire.

- Préférer tone=\'dark\' à background=\'#082B52\'.

- Préférer density=\'compact\' à paddingTop={73}.

- Préférer emphasis=\'strong\' à une ombre codée localement.

- Les escape hatches sont rares et documentées.

# 17. États obligatoires

Tout composant interactif considère default, hover, focus-visible,
active, disabled et, si pertinent, loading, success, warning, error et
empty.

Les composants de contenu considèrent les longueurs FR/EN, l'absence de
média, les titres longs et le responsive.

# 18. Responsive par composant

- Chaque composant possède une stratégie responsive explicite.

- Les overlays sont priorisés, pas simplement réduits.

- Les splits peuvent devenir séquentiels.

- Les plans peuvent être recadrés ou guidés.

- Les données comparatives restent lisibles sans scroll horizontal
inutile.

# 19. Accessibilité par défaut

- Sémantique HTML correcte.

- Focus visible.

- Contraste et états non dépendants uniquement de la couleur.

- Labels et noms accessibles.

- Gestion clavier des composants interactifs.

- Reduced motion intégré aux composants animés.

# 20. Documentation minimale

Chaque composant partagé documente : objectif, quand l'utiliser, quand
ne pas l'utiliser, variantes, props, exemples, responsive,
accessibilité, dépendances, statut DRAFT/REVIEW/APPROVED/LOCKED et pages
consommatrices.

# 21. Matrice de décision après audit

Après audit du dépôt, chaque composant existant ou cible reçoit une
décision.

  Décision   Signification
  ---------- ----------------------------------------------------------
  REUSE      Conserver tel quel ou quasi tel quel.
  ADAPT      Conserver la base et aligner sur V2.
  MERGE      Fusionner des doublons.
  CREATE     Créer car besoin non couvert.
  DROP       Retirer uniquement après validation et analyse d'impact.

# 22. Design Lab minimal

Avant reconstruction massive, le Design Lab démontre au minimum :

- SiteHeader + navigation mobile.

- HeroArchitectural et un second Hero différent.

- SectionLight, SectionDark et SectionBlueprint.

- EditorialBlock, FeatureList, ProductCard et MetricCard.

- OperationalPanel + data overlay sur bâtiment.

- Continuum ou DataToActionFlow.

- CTASection et SiteFooter.

- Hover/focus et reduced motion.

- Desktop, tablette et mobile.

# 23. Critères d'acceptation

- Besoin clair.

- Tokens utilisés.

- Pas de duplication.

- API sémantique et limitée.

- Responsive validé.

- Accessibilité de base validée.

- FR/EN testé.

- États interactifs complets.

- Aucun style local arbitraire nécessaire.

- Statut et documentation à jour.

# 24. Gouvernance

Les composants suivent DRAFT → REVIEW → APPROVED → LOCKED.

RÈGLE --- un composant LOCKED n'est modifié que si le besoin est
explicite, l'impact sur ses pages consommatrices est connu et la
régression est testée.

Une page nouvelle ne constitue jamais une autorisation implicite de
modifier un composant LOCKED.

# 25. À confirmer avec le code

- Composants déjà présents dans coro-website.

- Conventions de nommage.

- Framework CSS et tokens existants.

- Polices et chargement.

- Breakpoints.

- Système i18n.

- Bibliothèque d'icônes.

- Composants partagés avec d'autres applications.

- Tests visuels ou Storybook éventuels.

- Dette technique et doublons.

# 26. Prochaine étape

Cette V0.1 ne déclenche aucune création de composants. Au retour de
Codex, l'audit du dépôt produira une matrice EXISTANT → CIBLE et
permettra de transformer ce document en V1.0.

Le Design Lab sera ensuite le lieu de validation réelle avant de LOCKER
les composants fondamentaux.
