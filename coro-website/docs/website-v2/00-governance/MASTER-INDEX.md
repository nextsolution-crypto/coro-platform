CORO

WEBSITE V2

MASTER INDEX & GOVERNANCE

Référentiel maître du chantier · Documents, références, statuts et
règles de décision

UNE SEULE PORTE D'ENTRÉE. UNE SEULE HIÉRARCHIE DE DÉCISION.

Ce document devient le point de départ officiel de toute session de
travail Website V2.

Version 1.0 \| 24 septembre 2026 \| Statut : gouvernance active

# 1. Rôle du Master Index

Ce document indique quels livrables existent, lesquels font autorité,
dans quel ordre ils doivent être consultés et quelles décisions restent
ouvertes.

SOURCE DE VÉRITÉ --- toute session Website V2 commence par ce Master
Index, puis consulte uniquement les références nécessaires à la tâche.

# 2. État global du chantier

PHASE --- PRE-DESIGN / PRE-AUDIT largement complétée.

La direction artistique, le système cible, la gouvernance, la QA, le
responsive, le motion, l'architecture cible et les références visuelles
ont été définis.

Restent dépendants de l'audit réel : inventaire du site actuel, matrice
de migration, architecture finale et plan SEO final.

# 3. Registre documentaire officiel

  ID   Document                     Statut
  ---- ---------------------------- ------------------
  01   WEBSITE V2 BRIEF             APPROVED
  02   CURRENT SITE INVENTORY       PENDING AUDIT
  03   CONTENT MIGRATION MATRIX     PENDING AUDIT
  04   CORO VISUAL LANGUAGE         APPROVED
  05   CORO DESIGN SYSTEM           V0.1 / PRE-LAB
  06   CORO COMPONENT LIBRARY       V0.1 / PRE-AUDIT
  07   TARGET PAGE ARCHITECTURE     V0.1 / PRE-AUDIT
  08   CORO CONTENT GUIDELINES      APPROVED
  09   SEO MIGRATION PLAN           PENDING AUDIT
  10   RESPONSIVE & ACCESSIBILITY   APPROVED
  11   QA ACCEPTANCE CHECKLIST      APPROVED
  12   CODEX WEBSITE RULES          APPROVED

# 4. Documents complémentaires normatifs

  Document                             Statut            Rôle
  ------------------------------------ ----------------- --------------------------------------
  Design Lab Specification             APPROVED          Validation Web avant production.
  Page Family Art Direction Matrix     APPROVED          Variété contrôlée entre familles.
  Motion & Interaction Specification   APPROVED          Signature de mouvement.
  Homepage V2 Blueprint                APPROVED TARGET   Narration cible homepage.
  Codex Master Resume Prompt           READY             Audit lecture seule au retour Codex.

# 5. Références visuelles maîtresses

Les références visuelles définissent l'intention, le niveau de qualité,
la profondeur et l'atmosphère. Elles ne sont jamais des spécifications
pixel-perfect.

  Référence   Sujet                          Statut
  ----------- ------------------------------ --------------------
  REF-01      Homepage Master                APPROVED DIRECTION
  REF-02      Sentinelle Master              APPROVED DIRECTION
  REF-03      Documents Master               APPROVED DIRECTION
  REF-04      Incident Master                APPROVED DIRECTION
  REF-05      Sentinelle Population Master   APPROVED DIRECTION
  REF-06      Résilience Master              APPROVED DIRECTION
  REF-07      Mobile Master Reference        APPROVED DIRECTION

# 6. Hiérarchie des sources de vérité

En cas de conflit, appliquer cet ordre :

1\. Décision humaine explicite la plus récente.

2\. Composant/page LOCKED.

3\. Design System V1.0 lorsqu'il existera.

4\. Document normatif APPROVED pertinent.

5\. Référence visuelle APPROVED.

6\. Blueprint/page target.

7\. Besoin local d'implémentation.

RÈGLE --- un besoin local ne peut jamais écraser silencieusement une
règle supérieure.

# 7. Quel document lire selon la tâche

  Tâche            Références obligatoires
  ---------------- ----------------------------------------
  Audit dépôt      01 + 12 + Master Resume Prompt
  Design général   04 + 05 + 06
  Nouvelle page    07 + Page Family Matrix + 08
  Homepage         Homepage Blueprint + REF-01 + 04/05/06
  Sentinelle       Page Family Matrix + REF-02 + 04/05/06
  Documents        Page Family Matrix + REF-03 + 04/05/06
  Incident         Page Family Matrix + REF-04 + Motion
  Population       Page Family Matrix + REF-05 + Motion
  Résilience       Page Family Matrix + REF-06
  Mobile           10 + REF-07 + 05/06
  Animation        Motion Specification + 10
  SEO/migration    02 + 03 + 09 + 07 final
  QA               11 + 10 + 12

# 8. Statuts de gouvernance

  Statut          Signification
  --------------- -------------------------------------------
  DRAFT           Exploration; non stable.
  REVIEW          Prêt pour revue.
  APPROVED        Direction ou implémentation validée.
  LOCKED          Référence stable; modification contrôlée.
  PENDING AUDIT   Impossible à finaliser sans dépôt.
  BLOCKED         Une condition empêche de poursuivre.

# 9. Règle LOCKED

RÈGLE --- un élément LOCKED ne peut pas être modifié parce qu'une
nouvelle page serait plus simple à construire autrement.

Toute modification nécessite : motif, impact, pages consommatrices,
tests de régression et validation explicite.

# 10. Gouvernance des références visuelles

- Une image APPROVED fixe le caractère et la qualité.

- Les textes ou détails générés dans une maquette ne deviennent pas
automatiquement des vérités produit.

- Les logos, normes, clients, chiffres et fonctionnalités doivent être
vérifiés avant implémentation.

- Le navigateur et le système validé peuvent améliorer la maquette.

RÈGLE --- reproduire l'intention, pas les imperfections d'une image
générée.

# 11. Gouvernance du contenu

Le Content Guidelines est la référence éditoriale.

Les textes des maquettes sont des propositions, sauf lorsqu'ils sont
explicitement approuvés comme copy finale.

Les affirmations réglementaires, sécurité, conformité, statistiques et
clients nécessitent une source ou validation avant publication.

# 12. Gouvernance du Design System

Le Design System V0.1 est une cible, pas encore un contrat CSS.

Après audit et Design Lab, il devient V1.0 lorsque tokens, breakpoints,
typo, motion et composants fondamentaux ont été testés dans le
navigateur.

STOP --- ne pas implémenter aveuglément V0.1 en ignorant l'existant.

# 13. Gouvernance de la Component Library

Après audit, chaque composant cible reçoit REUSE, ADAPT, MERGE, CREATE
ou DROP.

DROP nécessite une validation d'impact. CREATE n'est choisi qu'après
recherche de l'existant.

Les composants fondamentaux passent progressivement APPROVED puis LOCKED
via le Design Lab.

# 14. Gouvernance des URL et SEO

RÈGLE --- aucune URL publique n'est supprimée ou renommée avant Document
02 + Document 03 + analyse SEO.

Chaque URL reçoit une décision explicite : KEEP, REBUILD, MERGE,
REDIRECT, ARCHIVE-WITH-APPROVAL ou REVIEW.

Les redirections et changements de slug ne sont jamais implicites.

# 15. Gouvernance FR / EN

Les deux langues ont une parité fonctionnelle et éditoriale.

Une différence volontaire doit être documentée.

Les composants doivent être testés avec les longueurs réelles des deux
langues avant APPROVED.

# 16. Gouvernance responsive

REF-07 prouve la direction mobile; le Document 10 fixe les règles.

RÈGLE --- mobile n'est pas une version appauvrie. La composition peut
changer, l'information essentielle et la personnalité restent.

# 17. Gouvernance motion

Motion Specification est normative.

Tout nouveau pattern animé doit expliquer un état, une relation ou une
opération.

Reduced motion est obligatoire.

Une animation décorative ne justifie pas une nouvelle dépendance.

# 18. Gouvernance QA

Le Document 11 définit les critères d'acceptation.

Une validation esthétique ne suffit pas pour APPROVED.

Avant LOCKED : responsive, FR/EN, accessibilité, interactions et
régression doivent être vérifiés.

# 19. Séquence officielle au retour de Codex

1\. Ouvrir le worktree/branche Website V2.

2\. Donner le Codex Master Resume Prompt.

3\. Audit lecture seule.

4\. Vérifier AUDIT STATUS: READY FOR REVIEW et git status inchangé.

5\. Analyser le rapport.

6\. Produire Document 02.

7\. Produire Document 03.

8\. Mettre Document 07 à jour vers V1.0.

9\. Produire Document 09.

10\. Matrice composants EXISTANT → CIBLE.

11\. Lancer LAB-01 seulement après validation.

# 20. Séquence Design Lab

LAB-01 Foundations + navigation.

LAB-02 HeroArchitectural + second Hero.

LAB-03 surfaces + contenu.

LAB-04 blueprint + overlays.

LAB-05 Operational UI.

LAB-06 continuum + motion.

LAB-07 CTA + formulaires + footer.

LAB-08 responsive/accessibility hardening.

LAB-09 regression review + gel V1.0.

# 21. Séquence de production après Lab

1\. Homepage réelle.

2\. Revue et LOCK si stable.

3\. Pages maîtresses : Sentinelle, Documents, Incident, Population,
Résilience.

4\. Pages secondaires en réutilisant le système.

5\. Ressources / secteurs / pricing / entreprise.

6\. Migration finale contenus.

7\. SEO/redirections.

8\. QA globale.

9\. Crawl comparatif.

10\. Go / No-Go.

11\. Déploiement + QA post-prod.

# 22. Conditions de STOP

STOP si : mauvaise branche/worktree; suppression d'URL envisagée sans
matrice; page/composant LOCKED à modifier; application hors périmètre à
toucher; dépendance majeure à ajouter; donnée/claim incertain; migration
destructive; contradiction entre sources normatives; risque SEO ou
sécurité non compris.

# 23. Décisions encore ouvertes

- Inventaire exact des routes.

- Slugs finaux.

- Navigation finale après confrontation à l'existant.

- Pages Knowledge/AI/Campus publiques au lancement.

- Composants existants réutilisables.

- Tokens techniques finaux.

- Breakpoints finaux.

- Polices finales selon existant/licence.

- Copy finale de toutes les pages.

- Preuves clients et témoignages.

- SEO final et redirections.

# 24. Ce qui est désormais décidé

- ADN visuel CORO.

- Refus du SaaS générique.

- Architecture opérationnelle augmentée.

- Variété contrôlée par famille.

- Rouge comme signal.

- Alternance clair/sombre.

- Bâtiment/plan/personnes/données comme territoire.

- Motion fonctionnel.

- Mobile comme expérience complète.

- Design Lab avant reconstruction massive.

- Protection absolue des URL/contenus/SEO.

- Gouvernance DRAFT → REVIEW → APPROVED → LOCKED.

# 25. Fin de phase PRE-DESIGN

PHASE --- à la publication de ce Master Index, la phase de conception
préalable est considérée suffisamment complète pour attendre l'audit
technique.

De nouvelles idées peuvent être consignées, mais aucune expansion
importante de l'architecture ou de la direction artistique n'est
nécessaire avant confrontation au dépôt.

RÈGLE --- éviter de continuer à produire des variantes qui créeraient de
nouvelles décisions avant d'avoir vu l'existant.

# 26. Règle finale

SOURCE DE VÉRITÉ --- Website V2 doit progresser par décisions
explicites, versionnées et vérifiables.

Le but n'est pas seulement d'obtenir un beau site. Le but est de
construire un système Web CORO distinctif, cohérent, maintenable,
accessible, performant et migré sans perte.
