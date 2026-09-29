CORO

WEBSITE V2

MASTER INDEX & GOVERNANCE

Référentiel maître du chantier · Documents, références, statuts et règles de décision

UNE SEULE PORTE D'ENTRÉE. UNE SEULE HIÉRARCHIE DE DÉCISION.

Ce document est le point de départ officiel de toute session de travail Website V2.

Version 2.0 | 24 septembre 2026 | Statut : gouvernance active, Design System V1.0 gelé (prend effet à la validation humaine du gel LAB-09)

# 0. À LIRE EN PREMIER (agent qui reprend le chantier)

1. Ce Master Index.
2. `00-governance/DESIGN-SYSTEM-V1-FREEZE.md` : l'état gelé, les statuts, les éléments ouverts, la QA manuelle restante.
3. `00-governance/CODEX-WEBSITE-RULES.md` et `00-governance/CODEX-MASTER-RESUME-PROMPT.md` (section V1.0 en tête).
4. Pour une page à migrer : `05-migration/CONTENT-MIGRATION-MATRIX.md` (décision, priorité, risque), `02-design/CORO-COMPONENT-LIBRARY.md`, `02-design/PAGE-FAMILY-ART-DIRECTION.md`, `03-content/CONTENT-GUIDELINES.md`, puis la checklist `04-quality/QA-ACCEPTANCE-CHECKLIST.md` §0.

RÈGLE — NE PAS REDESSINER LE DESIGN SYSTEM PENDANT LA MIGRATION D'UNE PAGE. Utiliser d'abord les composants et patterns approuvés. Escalader une lacune plutôt que d'inventer un nouveau langage visuel.

# 1. Rôle du Master Index

Ce document indique quels livrables existent, lesquels font autorité, dans quel ordre les consulter et quelles décisions restent ouvertes.

SOURCE DE VÉRITÉ — toute session Website V2 commence par ce Master Index, puis consulte uniquement les références nécessaires à la tâche.

> **MISE À JOUR ARCH-V2.1 (2026-09-26) :** l'état ci-dessous date du gel V1.0. Depuis, douze routes sont migrées (MIG-01 à MIG-03D). L'état réel, la matrice de routes, le registre V2, la feuille de route restante et la dette de mise en ligne sont dans `01-strategy/TARGET-PAGE-ARCHITECTURE-V2.1.md`, qui gouverne en cas de conflit.

# 2. État global du chantier

PHASE — DESIGN LAB TERMINÉ ; DESIGN SYSTEM V1.0 GELÉ ; MIGRATION DE PRODUCTION À DÉMARRER.

L'audit, l'inventaire, la matrice de migration, l'architecture cible, le plan SEO et la QA sont produits. Le Design Lab (LAB-01 à LAB-08) a construit, testé et approuvé le système : jetons, navigation, héros, rythme de page, spatial, opérationnel, flux, conversion, durcissement. LAB-09 documente et fige l'état.

Aucune page de production n'a été migrée sous le Design System V1.0. L'adoption des jetons V1 en production est une décision de migration (registre de gel §11).

# 3. Registre documentaire officiel

| ID | Document | Fichier | Statut |
|---|---|---|---|
| 01 | Website V2 Brief | `01-strategy/WEBSITE-V2-BRIEF.md` | APPROVED |
| 02 | Current Site Inventory | `05-migration/CURRENT-SITE-INVENTORY.md` | AUDIT VALIDÉ, mis à jour V1.1 |
| 03 | Content Migration Matrix | `05-migration/CONTENT-MIGRATION-MATRIX.md` | REVIEW, priorités V1.0 ajoutées |
| 03b | MIG-02 Gate (protocole de migration, règle des actifs visuels V1, registre des blockers) | `05-migration/MIG-02-GATE.md` | Gate MIG-02, à lire avant MIG-03 |
| 03c | MIG-03 Register (famille Résilience & opérations) | `05-migration/MIG-03-REGISTER.md` | Points de mise en ligne MIG-03 |
| 03d | MIG-04-PRE Security & Pricing Governance Gate (vérité publique sûre pour `/security` et `/pricing`, registre de blockers et décisions) | `05-migration/MIG-04-PRE-SECURITY-PRICING-GATE.md` | Gate de gouvernance, à lire avant MIG-04A et MIG-04B |
| 03e | MIG-05-PRE / MIG-05A Guides Family Audit & Migration Gate (hub `/guides` implémenté) (inventaire des six guides et du hub, frontière de vérité produit, audit réglementaire, audit des sept images, séquence de migration) | `05-migration/MIG-05-GUIDES-GATE.md` | Gate de pré-migration, à lire avant MIG-05A |
| 03f | MIG-06-PRE Remaining Legacy Surface Audit & Next-Phase Gate (surface publique restante après MIG-05 : `/`, `/blog`, `/blog/[slug]`, `/privacy`, `/terms` ; phases proposées, phase MIG-06 recommandée = pages légales) | `05-migration/MIG-06-REMAINING-LEGACY-GATE.md` | Gate d'audit, à lire avant MIG-06 |
| 03g | MIG-07-PRE Blog Architecture, Content, API, SEO & Migration Gate + MIG-07A/B/B-B/C Implementation Results (index V2 + pagination, article V2 + registre dynamique explicite, polish du canevas desktop, découverte par catégorie/mot-clé) — surface légale restante après clôture Blog = `/` uniquement | `05-migration/MIG-07-BLOG-GATE.md` | Gate d'audit + résultats d'implémentation, MIG-07 CLOSED |
| 03h | MIG-08-PRE Homepage Master Audit, Preservation Matrix, Visual Narrative & Final-Showpiece Gate (audit initial, storyboard cible, aucune implémentation à ce stade) | `05-migration/MIG-08-HOMEPAGE-GATE.md` | Gate d'audit historique — voir bandeau de statut en tête de fichier ; superseded par MIG-08A |
| 03i | MIG-08A Homepage implementation, MIG-08A-QA master audit, MIG-08A-QA-FIX technical closure, MIG-08A-QA-GOV EditorialHero governance resolution (`app/home/**` construit section par section, revue visuelle humaine, 632/632 tests, validation humaine desktop + iPad + iPhone) | `app/home/**` (pas de doc dédiée — code + suite de tests faisant autorité) | MIG-08A CLOSED — implémentation complète, gouvernance résolue, prêt pour commit |
| 04 | CORO Visual Language | `02-design/CORO-VISUAL-LANGUAGE.md` | APPROVED, V1.1 (motifs interdits autoritatifs §16) |
| 05 | CORO Design System | `02-design/CORO-DESIGN-SYSTEM.md` | V1.0 gelé |
| 06 | CORO Component Library | `02-design/CORO-COMPONENT-LIBRARY.md` | V1.0 gelé (catalogue autoritatif) |
| 07 | Target Page Architecture V1.0 | `01-strategy/TARGET-PAGE-ARCHITECTURE.md` | HISTORIQUE, supplanté en partie par le Document 07c |
| 07c | **Target Page Architecture V2.1** (état réel après MIG-03D, autorité d'architecture courante) | `01-strategy/TARGET-PAGE-ARCHITECTURE-V2.1.md` | AUTORITAIRE (ARCH-V2.1, 2026-09-26) ; V2.1 gouverne en cas de conflit avec V1.0 |
| 07b | Site Architecture & Page Blueprints (MIG-00A) | `01-strategy/SITE-ARCHITECTURE-AND-PAGE-BLUEPRINTS.md` | Plan de construction du site cible, à valider ; à lire avant toute migration |
| 08 | CORO Content Guidelines | `03-content/CONTENT-GUIDELINES.md` | APPROVED |
| 09 | SEO Migration Plan | `05-migration/SEO-MIGRATION-PLAN.md` | APPROVED MIGRATION PLAN, addendum V1.0 |
| 10 | Responsive & Accessibility | `04-quality/RESPONSIVE-ACCESSIBILITY.md` | APPROVED, V1.1 (constats LAB-08 §30) |
| 11 | QA Acceptance Checklist | `04-quality/QA-ACCEPTANCE-CHECKLIST.md` | APPROVED, V1.1 (checklist de migration §0) |
| 12 | Codex Website Rules | `00-governance/CODEX-WEBSITE-RULES.md` | APPROVED |
| 13 | Design System V1.0 Freeze Register | `00-governance/DESIGN-SYSTEM-V1-FREEZE.md` | Gel V1.0 (LAB-09) |

# 4. Documents complémentaires normatifs

| Document | Fichier | Statut | Rôle |
|---|---|---|---|
| Design Lab Specification | `02-design/DESIGN-LAB-SPECIFICATION.md` | APPROVED, avancement en tête | Lots LAB-01 à LAB-09. |
| Page Family Art Direction Matrix | `02-design/PAGE-FAMILY-ART-DIRECTION.md` | APPROVED, V1.1 (trois familles) | Variété contrôlée entre familles. |
| Motion & Interaction Specification | `02-design/MOTION-INTERACTION.md` | APPROVED, V1.1 (gel §0) | Signature de mouvement. |
| Homepage V2 Blueprint | `01-strategy/HOMEPAGE-V2-BLUEPRINT.md` | APPROVED TARGET | Narration cible de la homepage. |
| Codex Master Resume Prompt | `00-governance/CODEX-MASTER-RESUME-PROMPT.md` | Section V1.0 en tête ; prompt d'audit d'origine conservé pour l'historique | Reprise depuis l'état gelé. |

# 5. Références visuelles maîtresses

Les références visuelles (`02-design/references/REF-01` à `REF-07`) définissent l'intention, le niveau de qualité, la profondeur et l'atmosphère. Elles ne sont jamais des spécifications pixel-perfect. Homepage, Sentinelle, Documents, Incident, Population, Résilience, Mobile : APPROVED DIRECTION.

# 6. Hiérarchie des sources de vérité

En cas de conflit, appliquer cet ordre :

1. Décision humaine explicite la plus récente.
2. Règles LOCKED (registre de gel).
3. Design System V1.0 (jetons, composants).
4. Document normatif APPROVED pertinent.
5. Référence visuelle APPROVED.
6. Blueprint / page cible.
7. Besoin local d'implémentation.

RÈGLE — un besoin local ne peut jamais écraser silencieusement une règle supérieure.

# 7. Quel document lire selon la tâche

| Tâche | Références obligatoires |
|---|---|
| Migrer une page | Matrice de migration (03) + Component Library (06) + Page Family + Content Guidelines (08) + QA §0 |
| Homepage | Homepage Blueprint + REF-01 + 03 + 05 + 06 |
| Sentinelle / Population | Page Family + Matrice (03) + décision de langue EN + 06 |
| Documents / Projets / Performance / Client | Page Family + Matrice (03) + 06 |
| Composant nouveau | STOP : escalader (voir Codex Rules §9 et registre de gel §5) |
| Mobile | Responsive & Accessibility (10) §30 + 06 |
| Animation | Motion §0 + 10 |
| SEO / langue | 02 + 03 + 09 |
| QA | 11 §0 + 10 + 12 |
| Prohibitions | Visual Language §16 (section autoritative) |

# 8. Statuts de gouvernance

Cycle de vie : DRAFT → REVIEW → APPROVED → LOCKED. Le registre V1.0 emploie : LOCKED, APPROVED, REVIEW, REJECTED, MIGRATION-ONLY, LEGACY-DEBT (définitions dans le registre de gel §2). PENDING AUDIT et BLOCKED restent valables pour des éléments hors registre.

# 9. Règle LOCKED

Un élément LOCKED ne peut pas être modifié parce qu'une nouvelle page serait plus simple à construire autrement. Toute modification nécessite : motif, impact, pages consommatrices, tests de régression et validation explicite. Le gel LAB-09 applique LOCKED aux règles listées au registre de gel §3 ; il prend effet à la validation humaine.

# 10. Gouvernance des références visuelles

- Une image APPROVED fixe le caractère et la qualité.
- Les textes ou détails générés dans une maquette ou un média ne deviennent pas des vérités produit ; un média avec texte ou marque incrustés est une référence de laboratoire.
- Les logos, normes, clients, chiffres et fonctionnalités doivent être vérifiés avant implémentation.

# 11. Gouvernance du contenu

Le Content Guidelines est la référence éditoriale. Les textes des maquettes et du Lab sont des propositions. Les affirmations réglementaires, sécurité, conformité, statistiques et clients nécessitent une source ou validation avant publication. Éléments ouverts : registre de gel §9.

# 12. Gouvernance du Design System

Le Design System est V1.0 : jetons, typographie, rayons, profondeur, composants, responsive et accessibilité ont été testés dans le navigateur et figés. Les jetons `--coro-v1-*` sont additifs et s'appliquent sous `data-coro-system="v1"`. La règle d'adoption en production est une décision MIGRATION-ONLY.

# 13. Gouvernance de la Component Library

Chaque composant a un statut dans le catalogue (06). CREATE n'est choisi qu'après recherche de l'existant et escalade. DROP nécessite une validation d'impact.

# 14. Gouvernance des URL et SEO

RÈGLE — aucune URL publique n'est supprimée ou renommée sans Document 02 + Document 03 + Document 09. Chaque URL a une décision explicite : KEEP, REBUILD, MERGE, REDIRECT, ARCHIVE-WITH-APPROVAL ou REVIEW. Les redirections et changements de slug ne sont jamais implicites.

# 15. Gouvernance FR / EN

Les deux langues ont une parité fonctionnelle et éditoriale. Une différence volontaire est documentée. Les composants sont testés avec les longueurs réelles des deux langues.

# 16. Gouvernance responsive

Mobile n'est pas une version appauvrie. La composition peut changer ; l'information essentielle et la personnalité restent. Plancher : 320 px.

# 17. Gouvernance motion

La Motion Specification est normative (§0 gelé). Tout pattern animé explique un état, une relation ou une opération. Reduced motion est obligatoire. Aucune dépendance de mouvement décorative.

# 18. Gouvernance QA

La checklist de migration (QA §0) s'applique à chaque page migrée. Une validation esthétique ne suffit pas pour APPROVED. La QA manuelle non réalisée est listée au registre de gel §10 et reste requise avant production.

# 19. Séquences déjà réalisées

- Audit de l'existant, inventaire (02), matrice (03), architecture cible (07), plan SEO (09) : réalisés.
- Design Lab LAB-01 à LAB-08 : réalisés et approuvés (avancement dans Design Lab Specification §0).
- LAB-09 : gel V1.0 documentaire, en cours de validation humaine.

# 20. Phases restantes

1. Validation humaine du gel V1.0 et commit du gel.
2. Pré-fusion : verrouiller `/design-lab` par environnement ; décider la stratégie de fusion vers `main`.
3. Décision d'adoption des jetons V1 en production ; fusion des pieds de page ; layout racine (lien d'évitement, cible `main`).
4. Migration des pages selon la séquence de la matrice §18B.
5. Migration du contenu, FR/EN, SEO et redirections (Document 09).
6. QA manuelle avant production (registre de gel §10) et crawl comparatif.
7. Go / No-Go, déploiement, QA post-déploiement.

# 21. Séquence de production après le gel

1. Shell partagé unique et pied de page unique.
2. Pages institutionnelles déjà V2.
3. Pages produit, puis Sentinelle et Sentinelle Population, Pricing, Security.
4. Guides et blog (shell).
5. Homepage.
6. Migration finale des contenus, SEO et redirections.
7. QA globale, crawl comparatif, Go / No-Go, déploiement.

# 22. Conditions de STOP

STOP si : mauvaise branche / worktree ; suppression d'URL envisagée sans matrice ; page ou composant LOCKED à modifier ; application hors périmètre à toucher ; dépendance majeure à ajouter ; donnée ou allégation incertaine ; migration destructive ; contradiction entre sources normatives ; risque SEO ou sécurité non compris ; besoin d'un composant ou d'un langage visuel absent du catalogue.

# 23. Décisions encore ouvertes

Gouvernance de contenu :

- Énoncé « Traçabilité » (REVIEW avant publication).
- Identité légale et formulation du copyright (REVIEW avant migration).
- Typographie de l'adresse (REVIEW avant migration).
- Hébergement au Canada, prix, parrainage, nombre de procédures, références réglementaires, fournisseur / SLA (REVIEW avant republication).

Architecture et migration :

- Où poser `data-coro-system="v1"` (enveloppe de page ou layout racine).
- Statut EN de Sentinelle et de Sentinelle Population.
- Stratégie locale à long terme (`?lang=en` conservé au lancement).
- Statut public de Incident, Exercices, Knowledge, AI, Network, Campus, Ops, QR Intervention.
- Nécessité d'une primitive de dialogue (vidéo d'accueil).
- Exposition de `/design-lab` : verrouillage par environnement avant fusion vers `main`.
- Inventaire live du blog (slugs, traductions, images).
- Preuves clients et témoignages : seulement avec contenu réel et autorisation.

# 24. Ce qui est désormais décidé

- ADN visuel CORO, refus du SaaS générique, alternance clair / sombre, mouvement fonctionnel, mobile comme expérience complète.
- Rouge d'action `#C0392B`, rayons 10 / 4 / 8 / 2–4, profondeur par surface d'abord.
- Trois familles de pages reliées : Architectural, Opérationnel, Technique.
- Continuum canonique en neuf étapes, quatre mouvements.
- Design Lab avant migration, migration progressive, protection absolue des URL, contenus et SEO.
- Gouvernance DRAFT → REVIEW → APPROVED → LOCKED avec le registre V1.0.

# 25. Fin de phase Design Lab

La phase de conception et de validation par le Lab est terminée. De nouvelles idées peuvent être consignées, mais aucune extension du Design System n'est nécessaire avant la migration. RÈGLE — éviter de produire des variantes qui créeraient de nouvelles décisions avant que les pages n'aient consommé le système.

# 26. Règle finale

SOURCE DE VÉRITÉ — Website V2 progresse par décisions explicites, versionnées et vérifiables.

Le but n'est pas seulement un beau site. C'est un système Web CORO distinctif, cohérent, maintenable, accessible, performant et migré sans perte.

> **MIG-00A-B :** décisions humaines intégrées (statuts `/guides`, `/coro-incident`, `/plateforme`, `/coro-exercices`, gouvernance des affirmations, validation SEO préalable) : voir §26 de `01-strategy/SITE-ARCHITECTURE-AND-PAGE-BLUEPRINTS.md` (statuts déjà reportés dans ce document).
