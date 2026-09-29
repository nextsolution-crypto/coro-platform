CORO

PAGE FAMILY ART DIRECTION

Website V2 · Matrice de personnalité visuelle par famille de pages

UNE MARQUE. PLUSIEURS ATMOSPHÈRES. AUCUNE DÉRIVE.

Version 1.1 \| 24 septembre 2026 \| Statut : direction artistique
complémentaire, réconciliée avec le Design Lab (V1.0 gelée)

# 1. Objectif

Le Design System garantit la cohérence. Cette matrice garantit la
variété. Elle évite deux échecs opposés : des pages incohérentes entre
elles, ou un site tellement standardisé que toutes les pages paraissent
identiques.

PRINCIPE --- même ADN, intensité et composition différentes selon le
sujet.

# 2. Invariants

Bleu marine CORO, blanc architectural, rouge signal; typographie et
tokens communs; profondeur contrôlée; architecture, personnes, données
et action; composants partagés; règles responsive/accessibilité/motion;
ton professionnel et concret.

# 2A. Trois familles de pages reliées (V1.0 gelée)

Le Design Lab a prouvé trois familles de composition. Ce sont des familles reliées d'une même marque, pas trois marques : elles partagent les mêmes jetons, les mêmes rayons, le même rouge d'action, les mêmes règles de profondeur, de mouvement et d'accessibilité. Elles se distinguent par la surface dominante, la place du média, la densité d'interface et le vocabulaire technique. Une page peut emprunter à plusieurs familles selon sa section.

La matrice par produit (§4) et l'intensité visuelle (§21) restent valables ; les trois familles décrivent la composition, pas le produit.

| | ARCHITECTURAL | OPÉRATIONNEL | TECHNIQUE |
|---|---|---|---|
| Caractère | Lumineux, éditorial, photographique, ouvert | Situationnel, humain, décisif | Structuré, documentaire, précis |
| Surfaces | Blanc et surface douce ; photographie dominante ; marine en accent | Marine, blanc et terrain (photographies de situation) | Papier, plans, indexation ; blanc ; marine pour la preuve |
| Héros | HeroSignature (A2) | HeroOperational | HeroTechnical |
| Média | Bâtiment ou site, 10 px | Personnes et situation, 10 px ; interface à côté du sujet, jamais dessus | Plan, document, capture : cadre net de 2 à 4 px et cartouche |
| Vocabulaire | Annotations reliées au bâtiment, index éditorial | États, chronologie, décompte, action ; intensité proportionnée | Références numérotées, cartouches, filets, indexation |
| Contextes | Plateforme, Client, bâtiment, homepage | Incident, Sentinelle, réponse, évacuation, reprise | Documents, planification, conformité |
| Rythme | `PageSection` white / soft ; `SplitContent` ; `SectionStatement` | Blanc / marine / terrain ; `OperationalScene` ; chronologie | `paper` (contextuel) ; `BlueprintFrame` ; `FeatureIndex` |
| Composants dominants | MediaFrame photo, BuildingFrame, EditorialBlock | OperationalScene, StatusChip, Timeline, PeopleStatus, ActionItem | BlueprintFrame, MapFrame, TechLabel, Cartouche, Accordion |

## Règles communes aux trois familles

- Le papier et la grille sont contextuels : ils appartiennent à la famille technique ; ils ne sont pas la recette de toutes les pages.
- Un média dense reçoit peu de superpositions (repères numérotés plutôt qu'étiquettes complètes).
- La présence de l'interface suit l'intensité opérationnelle : Normal minimal, Incident fort, Personnes piloté par l'humain, Reprise ouverte.
- Le rouge signale l'action et l'état Critique ; il disparaît en reprise.
- La fin d'une page suit le même rythme dans toutes les familles : contenu, preuve, action, pied de page.

## Exemples approuvés au Lab (lots)

- Architectural : LAB-02 (HeroSignature), LAB-03 (rythme A : surface douce, photographie).
- Opérationnel : LAB-02 (HeroOperational), LAB-05 (Normal, Incident, Personnes, Reprise).
- Technique : LAB-02 (HeroTechnical), LAB-03 (rythme C : papier, plans, indexation), LAB-04 (plan).
- Transversal : LAB-06 (continuum et flux), LAB-07 (CTA, confiance, formulaire, pied de page).

Il n'existe pas de gabarit unique par famille : les exemples sont des références de composition, pas des templates à recopier.

# 3. Axes de variation

  Axe                Spectre
  ------------------ -----------------------------------------
  Immersion          Éditorial clair ↔ cinématique sombre
  Densité data       Narratif ↔ opérationnel dense
  Présence humaine   Système ↔ personnes en action
  Architecture       Légère ↔ bâtiment/plan dominant
  Territoire         Bâtiment ↔ cartographie/population
  Temporalité        Stable ↔ temps réel/chronologie
  Preuve             Concept ↔ interface/métrique/conformité

# 4. Matrice synthèse

  Famille          Dominante           Atmosphère
  ---------------- ------------------- ----------------------------------------
  Homepage         Écosystème          Architecturale, ambitieuse, équilibrée
  Platform         Socle               Structurée, systémique
  Documents        Conformité          Précise, documentaire
  Projects         Exécution           Dynamique, orientée flux
  Performance      Mesure              Analytique, décisionnelle
  Client           Confiance           Calme, premium
  Sentinelle       Temps réel humain   Opérationnelle, bâtiment vivant
  Population       Territoire          Cartographique, signal
  Incident         Commandement        Sombre, temporelle
  Exercices        Apprentissage       Humaine, scénario
  Résilience       Progrès             Analytique, stratégique
  Knowledge / AI   Connaissance        Structurée, assistée
  Campus           Institution         Spatiale, humaine
  Pricing          Décision            Claire, rassurante
  Resources        Expertise           Éditoriale, lumineuse
  Legal            Utilitaire          Sobre, minimale

# 5. Homepage --- l'écosystème en mouvement

OBJECTIF --- faire comprendre CORO en quelques secondes puis révéler sa
profondeur.

HeroArchitectural privilégié; bâtiment réel ou démo premium; alternance
clair/sombre; continuum comme colonne vertébrale; quelques interfaces
fortes plutôt qu'un catalogue exhaustif.

INTERDIT --- transformer la homepage en grille de fonctionnalités.

# 6. CORO Platform --- le socle

Atmosphère structurée et systémique. Architecture en couches :
organisation → clients → bâtiments → projets → modules. Diagrammes
propres et interfaces de gestion. Montrer comment les capacités se
branchent au socle.

# 7. CORO Documents --- conformité vivante

Blanc dominant avec sections blueprint. Documents, workflows,
validations et données bâtiment. Transition données → document →
validation → maintien. Peu d'effets, forte précision.

INTERDIT --- esthétique de simple éditeur de texte ou bibliothèque PDF.

# 8. CORO Projects --- l'exécution

Timelines, activités, assignations et jalons. Interfaces plus présentes
que l'architecture mais reliées aux mandats/sites. Accent sur le passage
du mandat à l'action.

# 9. CORO Performance --- décider avec les données

Métriques, tendances, capacité, objectifs et budgets. Beaucoup d'espace
autour des chiffres. Data visualization sobre. Relier chaque chiffre à
une décision ou un objectif.

# 10. CORO Client --- confiance et portefeuille

Architecture immobilière premium, portefeuille de bâtiments, statuts et
accès structurés. Moins de densité opérationnelle. Accent sur visibilité
et transparence.

# 11. CORO Sentinelle --- le bâtiment vivant

OBJECTIF --- montrer un environnement humain dynamique.

Présence humaine forte; plans, étages, zones; occupation, évacuation,
rassemblement et personnes manquantes; interfaces flottantes reliées
spatialement; mouvement entrée → présence → événement → évacuation →
statut.

INTERDIT --- réduire Sentinelle à un QR code ou registre de visiteurs.

# 12. Sentinelle Population --- le territoire

Cartographie dominante; zones, secteurs, établissements sensibles et
population; canaux et propagation du message; contexte industriel +
interface; présence publique sans dramatisation.

INTERDIT --- esthétique de catastrophe ou carte alarmiste sans contexte.

# 13. CORO Incident --- le command center

Marine profond, chronologie, événements, décisions, rôles et actions.
Rouge réservé au critique. Retour vers une section claire pour
rapport/REX/fermeture.

INTERDIT --- cyberpunk, mur d'écrans ou militarisation esthétique.

# 14. CORO Exercices --- apprendre avant l'incident

Atmosphère humaine et pédagogique. Table-top, évacuation, observation;
scenario flow; constats, recommandations et actions. Boucle exercice →
constats → actions → amélioration.

# 15. CORO Résilience --- mesurer et progresser

Indice CORO, écarts, dimensions, maturité et progression. Continuum
présent. Relier mesure → priorité → action → amélioration. Équilibre
blanc/marine.

# 16. CORO Knowledge / AI

Intelligente mais sobre. Réseau de connaissances, provenance, sources,
contexte et interfaces d'analyse. Assistance dans un workflow réel;
validation humaine visible.

INTERDIT --- cerveau lumineux, robot, particules IA, violet néon.

# 17. CORO Campus

Institutionnelle, spatiale et humaine. Campus multi-bâtiments,
populations, zones, cartographie et communication. Éviter toute
esthétique scolaire enfantine.

# 18. Pricing

Blanc dominant, comparaison facile, peu d'animations. Cards justifiées
par la comparaison des offres. ADN CORO par typographie, détails
architecturaux et confiance.

# 19. Resources

Éditoriale, lumineuse, experte. Lecture prioritaire, couvertures
cohérentes, catégories claires, liens pertinents vers produits sans
survente.

# 20. Legal / utilitaire

Minimal et extrêmement lisible. Header/footer CORO, largeur de lecture
optimisée, sommaire si long. L'identité vient de la précision.

# 21. Intensité visuelle

  Niveau             Familles
  ------------------ -------------------------------------------------------------
  1 --- Minimal      Legal, utilitaire
  2 --- Editorial    Resources, Pricing
  3 --- Structured   Platform, Documents, Client
  4 --- Expressive   Homepage, Projects, Performance, Résilience, Exercices
  5 --- Immersive    Sentinelle, Population, Incident, certaines sections Campus

# 22. Règle d'alternance

Deux pages adjacentes ne doivent pas sembler clonées. Elles peuvent
partager les mêmes composants mais diffèrent par composition, densité,
média dominant et rythme.

RÈGLE --- varier au moins deux axes parmi immersion, densité data,
présence humaine, architecture, territoire, temporalité et preuve.

# 23. Heroes par famille

  Famille          Hero privilégié
  ---------------- ----------------------------------
  Homepage         Architectural
  Platform         Editorial / architectural léger
  Documents        Editorial ou Product + blueprint
  Projects         Product / workflow
  Performance      Product / metric
  Client           Architectural léger
  Sentinelle       Architectural / Operational
  Population       Operational / cartographique
  Incident         Operational
  Exercices        Editorial / humain
  Résilience       Editorial / metric
  Knowledge / AI   Product / knowledge
  Campus           Architectural / cartographique
  Pricing          Minimal
  Resources        Editorial
  Legal            Minimal

# 24. Média dominant

Sentinelle : bâtiment + humain + interface. Population : carte +
environnement + interface. Incident : interface + timeline. Documents :
document + blueprint + interface. Client : architecture + portfolio UI.
Exercices : humain + scénario + rapport. Résilience : données +
continuum.

# 25. Rouge CORO

Le rouge garde la même signification : signal, action ou événement.

RÈGLE --- aucune famille ne transforme le rouge en décoration dominante.
Incident et Population peuvent l'utiliser davantage, proportionnellement
au sens.

# 26. Mouvement par famille

Documents : validation/progression. Projects : timeline/assignation.
Performance : évolution métrique. Sentinelle : présence/évacuation.
Population : diffusion/zones/canaux. Incident : chronologie/état.
Exercices : scénario/constats/actions. Résilience :
progression/amélioration.

RÈGLE --- le mouvement illustre le métier, pas la technologie pour
elle-même.

# 27. Test interpages

1\. Peut-on identifier la famille sans lire le nom du produit ?

2\. Peut-on identifier CORO logo masqué ?

3\. Est-elle suffisamment différente de la page précédente ?

4\. Respecte-t-elle les mêmes règles de couleur, profondeur, typo et
mouvement ?

5\. Le nouveau pattern est-il nécessaire ou constitue-t-il une dérive ?

# 28. Application au Design Lab

Le Lab doit tester au minimum les registres architectural, éditorial,
blueprint, opérationnel sombre, humain et analytique. Il doit démontrer
que le système supporte plusieurs personnalités sans fragmentation.

# 29. Statut et révision

Cette matrice est une direction cible. Elle sera confrontée à
l'architecture réelle des pages après inventaire du site et pourra être
ajustée avant LOCK. Les familles futures se positionnent sur les mêmes
axes plutôt que de créer une identité indépendante.

# 30. Règle finale

PRINCIPE --- le visiteur doit pouvoir parcourir CORO et sentir qu'il
change de contexte sans jamais changer de marque.

Le site doit ressembler à un écosystème conçu intentionnellement, pas à
une suite de landing pages produites séparément.
