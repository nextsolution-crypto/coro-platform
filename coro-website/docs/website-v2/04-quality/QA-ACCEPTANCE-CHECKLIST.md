CORO

QA ACCEPTANCE CHECKLIST

Website V2 · Contrôle qualité et critères d'acceptation

UNE PAGE N'EST PAS TERMINÉE PARCE QU'ELLE EST BELLE.

Elle est terminée lorsqu'elle est cohérente, complète, accessible,
responsive, performante, bilingue, testée et sans régression.

Version 1.1 \| 24 septembre 2026 \| Statut : référence QA, checklist de migration V1.0 en tête

# 0. CHECKLIST DE MIGRATION D'UNE PAGE (V1.0) — À UTILISER POUR CHAQUE PAGE MIGRÉE

Cette checklist est obligatoire pour toute page de production migrée vers le Design System V1.0. Les sections 1 à 30 ci-dessous détaillent les contrôles. Une case non applicable est notée « N/A » avec une raison ; une case non vérifiée n'est pas cochée.

Références : `00-governance/DESIGN-SYSTEM-V1-FREEZE.md`, `02-design/CORO-COMPONENT-LIBRARY.md`, `02-design/CORO-VISUAL-LANGUAGE.md` §16.

## 0.1 Préservation du contenu et des contrats

☐ La décision de la ligne de la page dans `05-migration/CONTENT-MIGRATION-MATRIX.md` est respectée (KEEP / REBUILD…).
☐ Comparaison du contenu legacy et V2 faite : aucune omission de contenu utile ; les omissions sont décidées et notées.
☐ URL, slug et ancres historiques conservés ou remappés explicitement.
☐ Médias historiques préservés ; aucun actif supprimé sur une recherche textuelle seule.
☐ **Audit de préservation des actifs visuels V1** fait AVANT le redesign : inventaire des actifs propres à la page (nom, dimensions, format) ; chaque actif ouvert et regardé ; nature classée (REAL PRODUCT UI / MARKETING ILLUSTRATION / DIAGRAM / OUTDATED-UNCLEAR) ; comparé au produit actuel ; décision KEEP / KEEP WITH PUBLICATION REVIEW / REPLACE / REJECT / UNCLEAR ; raison écrite pour chaque actif omis. Une capture produit utile est un contenu de migration, pas une décoration jetable (voir `05-migration/MIG-02-GATE.md` §2).
☐ Destinations externes exactes : CORO Platform `https://app.getcoro.io/login`, CORO Client `https://client.getcoro.io/login`, aucun autre portail.
☐ Contrats métier préservés lorsque la page les touche : parrainage (cookies `coro_referral_code`, `coro_referral_first_touch` ; capture sur `/`, lecture par `DemoForm`) et formulaire de démonstration (fournisseur et destination inchangés sauf décision approuvée).
☐ Aucun secret, aucun point d'accès sensible recopié dans un document ou exposé côté client.

## 0.2 Design System et prohibitions

☐ Scope des jetons V1 actif (`data-coro-system="v1"`) ; aucune valeur locale (couleur, rayon, ombre, espacement, point de rupture).
☐ Composants et patterns APPROVED utilisés d'abord ; toute lacune escaladée, jamais comblée localement.
☐ Rouge CORO uniquement pour l'action et l'état Critique ; jamais en remplissage décoratif.
☐ Rayons : média photo 10 px, panneau 4 px, contrôle 8 px, cadre technique 2 à 4 px ; pas de média technique à 10 px.
☐ Aucune ombre lourde par défaut ; profondeur par surface, bordure, média d'abord.
☐ Papier et grille seulement si la famille de la page le justifie.
☐ Aucune régression en mur de cartes (pas de grille de cartes identiques répétée) ni en gabarit SaaS générique.
☐ Aucun motif de la liste autoritative (Visual Language §16).
☐ Densité des superpositions inverse à la densité du média ; interface proportionnée à l'intensité opérationnelle ; situation d'abord.
☐ Hero adapté au rôle de la page ; deux pages voisines ne sont pas des clones.

## 0.3 FR / EN

☐ Version FR complète et version EN complète (ou décision documentée de parité).
☐ Aucun texte utilisateur codé en dur dans une seule langue ; nomenclature produit conforme.
☐ Longueurs FR et EN testées (libellés longs, titres, boutons, pied de page).
☐ Sélecteur de langue conserve la page ; `hrefLang` correct ; attribut `lang` correct (MIGRATION-ONLY tant que `<html lang>` est fixe).

## 0.4 Responsive

☐ 320, 360, 390, 430, 768, 1024, 1200, 1440 et 1920 px vérifiés ; aucune barre de défilement horizontale.
☐ Le mobile est une recomposition : médias recadrés, superpositions réduites avec liste sémantique complète.
☐ Aucun libellé long n'élargit la page ; aucun texte sous 10 px.

## 0.5 Clavier, focus, lecteur d'écran

☐ Parcours clavier RÉEL (Tab, Maj+Tab, Entrée, Espace, Échap) sur en-tête, langue, boutons, accordéons, formulaire et pied de page.
☐ Focus visible sur toutes les surfaces (clair, doux, papier, marine, photographie) ; pas de piège clavier.
☐ Un H1 unique, ordre des titres logique ; landmarks header / nav / main / footer cohérents.
☐ Noms accessibles, `alt` pertinent (vide seulement si décoratif), listes et `<time>` sémantiques.
☐ Lecteur d'écran testé sur la navigation et le formulaire s'il y en a un.

## 0.6 Mouvement et contraste

☐ Sens entièrement statique ; aucun contenu dépend du mouvement, du survol ou de la couleur seule.
☐ `prefers-reduced-motion` vérifié dans un navigateur (émulation), pas seulement par lecture du code.
☐ Contrastes AA vérifiés (texte, contrôles, états, anneau de focus) ; zoom réel à 200 % et 400 % vérifié.

## 0.7 Médias

☐ `next/image` avec `sizes`, dimensions réservées, `priority` seulement pour le média du premier écran.
☐ Recadrage desktop / mobile vérifié ; pas de sujet important rogné ; pas de décalage de mise en page.
☐ Média de référence contenant du texte ou une marque incrustés non utilisé comme source de copie.
☐ Chaque image classée : MARKETING ILLUSTRATION (décorative, `alt` vide, jamais preuve), TECHNICAL ILLUSTRATION, REAL PRODUCT SCREENSHOT ou OTHER ; une illustration marketing n'est jamais décrite comme preuve produit et son interface générée n'est jamais une affirmation fonctionnelle.
☐ Captures produit : cartouche factuelle « Capture d'écran » (jamais « capture réelle »), `alt` exact, région défilable nommée et résumé texte adjacent sur mobile ; données visibles (noms, courriels, adresses, dates) vérifiées comme fictives ou autorisées, sinon PUBLICATION-BLOCKER ; aucun pixel modifié sans approbation humaine.

## 0.8 SEO de migration

☐ Title unique, description, canonical, hreflang, Open Graph et Twitter conformes à `05-migration/SEO-MIGRATION-PLAN.md`.
☐ JSON-LD existant inventorié puis restauré ou remplacé ; H1 rendu côté serveur dans la bonne langue.
☐ Aucun `noindex` accidentel ; page incluse ou exclue du sitemap selon la décision ; liens internes sans lien mort.
☐ Décision de langue de la page (Sentinelle, Sentinelle Population) appliquée.

## 0.9 Formulaires, confiance et conversion

☐ Formulaire : labels, erreurs associées, résumé d'erreurs, état d'envoi, succès, échec récupérable ; destination et fournisseur vérifiés ; aucune donnée sensible exposée.
☐ La conversion est la suite logique (pas d'interruption) ; CTA précis ; un seul principal par contexte.
☐ Aucune allégation non vérifiée : claims juridiques, réglementaires, sécurité, hébergement, prix et références marqués REVIEW tant qu'ils ne sont pas validés (voir Freeze §9).
☐ Aucun faux logo, faux témoignage, fausse certification ; données de démonstration identifiées comme telles.
☐ Un seul pied de page visible (SiteFooterV2 une fois le pied de page fusionné).

## 0.10 Régression et clôture

☐ Pages consommatrices d'un composant partagé identifiées et vérifiées (FR/EN, mobile / desktop).
☐ `npm test`, `npm run typecheck`, lint et `npm run build` verts.
☐ Aucun composant LOCKED modifié sans approbation ; aucun refactor opportuniste.
☐ Anomalies consignées avec classe (DS-BLOCKER, DS-MAJOR, DS-MINOR, LEGACY-DEBT, SEO-MIGRATION, CONTENT-GOVERNANCE, ENVIRONMENT) ; aucun BLOCKER / CRITICAL ouvert avant APPROVED.

# 1. Objet

Cette checklist définit les contrôles obligatoires avant qu'un
composant, une page, un lot ou le site Website V2 puisse passer de
REVIEW à APPROVED puis LOCKED.

RÈGLE --- les validations visuelles seules ne suffisent jamais.

# 2. Niveaux de validation

☐ Composant : unité réutilisable prête à être consommée.

☐ Page : contenu et parcours complets.

☐ Lot : ensemble cohérent de pages/composants sans régression.

☐ Release candidate : site complet prêt au Go / No-Go.

☐ Production : validation post-déploiement.

# 3. QA composant --- design system

☐ Utilise les tokens approuvés.

☐ Aucun hex, spacing, radius, shadow ou breakpoint arbitraire non
justifié.

☐ N'introduit pas un pattern déjà couvert par un composant existant.

☐ API/props sémantiques et limitées.

☐ Variantes documentées.

☐ États default, hover, focus-visible, active et disabled traités.

☐ Loading, empty, success, warning et error traités lorsque pertinents.

☐ Statut DRAFT / REVIEW / APPROVED / LOCKED à jour.

# 4. QA composant --- responsive

☐ Mobile étroit vérifié.

☐ Mobile large vérifié.

☐ Tablette portrait vérifiée.

☐ Tablette paysage vérifiée lorsque pertinent.

☐ Desktop standard vérifié.

☐ Grand desktop vérifié lorsque pertinent.

☐ Aucun overflow horizontal accidentel.

☐ Titres longs FR/EN testés.

☐ Absence de média ou contenu plus long testée.

☐ Le comportement mobile est une recomposition, pas seulement une
réduction.

# 5. QA composant --- accessibilité

☐ Élément HTML sémantique approprié.

☐ Utilisable au clavier si interactif.

☐ Focus visible.

☐ Nom accessible correct.

☐ Contraste suffisant.

☐ État non communiqué uniquement par couleur.

☐ Cible tactile suffisante.

☐ Reduced motion traité si animation.

☐ Screen reader testé pour les composants complexes clés.

# 6. QA page --- contenu

☐ H1 unique et clair.

☐ Promesse compréhensible sans connaître CORO.

☐ Contenu conforme au Content Guidelines.

☐ Nomenclature produit exacte.

☐ Aucune capacité future présentée comme disponible.

☐ Chiffres, preuves, normes et affirmations vérifiables.

☐ CTA précis et cohérents avec le parcours réel.

☐ Aucun lorem ipsum, placeholder ou contenu de test.

☐ Aucun contenu historique utile perdu sans décision de migration.

# 7. QA page --- direction artistique

☐ Conforme au CORO Visual Language.

☐ Architecture / monde réel présents lorsque pertinents.

☐ Profondeur obtenue sans surcharge.

☐ Rouge CORO utilisé comme signal, pas comme décoration dominante.

☐ Alternance clair/sombre cohérente avec le récit.

☐ Pas d'esthétique SaaS générique.

☐ Pas de répétition mécanique de grilles de trois cards.

☐ Hero adapté au rôle de la page.

☐ Comparaison visuelle effectuée avec les références APPROVED.

# 8. QA page --- navigation et parcours

☐ Header correct.

☐ Navigation active cohérente.

☐ Breadcrumb lorsque nécessaire.

☐ Tous les liens internes fonctionnent.

☐ Tous les liens externes nécessaires fonctionnent.

☐ CTA mènent à la bonne destination.

☐ Retour ou poursuite du parcours évident.

☐ Footer complet.

☐ Aucun lien mort.

# 9. QA page --- FR / EN

☐ Version FR complète.

☐ Version EN complète.

☐ Sens et niveau de preuve équivalents.

☐ Aucun texte utilisateur hardcodé dans une seule langue.

☐ Terminologie officielle respectée.

☐ Différences de longueur testées.

☐ Sélecteur de langue conserve le contexte lorsque possible.

☐ Attributs de langue corrects.

# 10. QA page --- SEO

☐ URL conforme à la matrice de migration.

☐ Title unique et pertinent.

☐ Meta description présente et pertinente.

☐ Canonical correct.

☐ hreflang correct si applicable.

☐ Open Graph / partage vérifié.

☐ Structured data vérifiée si applicable.

☐ H1 et structure de headings cohérents.

☐ Images importantes avec alt approprié.

☐ Page incluse/exclue du sitemap selon décision.

☐ Aucun noindex accidentel.

# 11. QA page --- performance

☐ Images optimisées et dimensionnées.

☐ Formats modernes lorsque possible.

☐ Lazy loading appliqué lorsque pertinent.

☐ Média hero avec stratégie de chargement adaptée.

☐ Pas de dépendance lourde ajoutée sans justification.

☐ Pas d'animation coûteuse inutile.

☐ Pas de décalage de mise en page important.

☐ JavaScript client limité au besoin réel.

☐ Test sur profil mobile effectué avant APPROVED.

# 12. QA page --- accessibilité

☐ Parcours clavier complet.

☐ Focus visible et ordre logique.

☐ Landmarks cohérents.

☐ Structure de headings logique.

☐ Images et médias correctement décrits.

☐ Formulaires labellisés et erreurs accessibles.

☐ Zoom / texte agrandi sans perte de contenu.

☐ Reduced motion vérifié.

☐ Contrastes vérifiés.

☐ Aucun contenu essentiel dépend uniquement du mouvement, hover ou
couleur.

# 13. QA page --- formulaires

☐ Labels persistants.

☐ Champs requis identifiés.

☐ Validation claire.

☐ Erreurs associées aux champs.

☐ État loading visible.

☐ Double soumission empêchée si nécessaire.

☐ Confirmation de succès.

☐ Échec récupérable.

☐ Données sensibles non exposées côté client.

☐ Destination et traitement du formulaire vérifiés.

# 14. QA page --- médias

☐ Images finales, pas de placeholders.

☐ Droits/licences ou origine connus lorsque requis.

☐ Alt text correct.

☐ Recadrage desktop/mobile vérifié.

☐ Captures produit à jour.

☐ Données de démonstration identifiées comme telles lorsque nécessaire.

☐ Vidéos avec contrôles et sous-titres si parole.

☐ Aucun autoplay audio.

☐ Fallback si média lourd ou indisponible.

# 15. QA régression

OBLIGATOIRE --- après toute modification d'un composant partagé :

☐ Identifier toutes les pages consommatrices.

☐ Vérifier les pages APPROVED / LOCKED concernées.

☐ Vérifier FR/EN.

☐ Vérifier mobile/desktop.

☐ Vérifier changements visuels non intentionnels.

☐ Vérifier navigation et interactions.

☐ Documenter les écarts acceptés.

# 16. QA lot / commit

☐ Objectif du lot clairement défini.

☐ Aucun refactor opportuniste non lié.

☐ Fichiers modifiés cohérents avec le périmètre.

☐ Tests exécutés listés.

☐ Résultats des tests documentés.

☐ Aucun secret ou fichier local ajouté.

☐ Git diff relu.

☐ Build/lint/tests pertinents verts.

☐ Commit descriptif et limité lorsque demandé.

# 17. Audit de migration

☐ Chaque URL historique a une décision.

☐ KEEP / REBUILD : URL et contenu vérifiés.

☐ MERGE : destination validée.

☐ REDIRECT : 301 source → destination testée.

☐ ARCHIVE : approbation explicite.

☐ FR et EN traités.

☐ Métadonnées importantes conservées ou améliorées.

☐ Aucun contenu utile supprimé silencieusement.

# 18. Crawl comparatif pré-production

Le crawl ancien/nouveau constitue un contrôle majeur du Go / No-Go.

☐ Nombre d'URL comparé.

☐ Codes HTTP comparés.

☐ 404/soft-404 examinées.

☐ Chaînes/boucles de redirection absentes.

☐ Titles comparés.

☐ Meta descriptions comparées.

☐ Canonicals comparés.

☐ H1 comparés.

☐ hreflang comparé.

☐ Indexability comparée.

☐ Sitemap et robots vérifiés.

☐ Liens internes cassés corrigés.

# 19. Tests fonctionnels critiques

☐ Navigation principale.

☐ Navigation mobile.

☐ FR ↔ EN.

☐ Demande de démonstration.

☐ Contact.

☐ Connexion conseiller.

☐ Portail client.

☐ Liens vers pages légales.

☐ Liens produits/modules.

☐ Téléchargements publics éventuels.

☐ Toute intégration externe visible.

# 20. Navigateurs et appareils

Le parc exact sera confirmé selon les statistiques disponibles; à
défaut, le minimum de validation couvre les moteurs modernes dominants.

☐ Chromium desktop.

☐ Safari/WebKit lorsque disponible.

☐ Firefox desktop.

☐ Chrome Android.

☐ Safari iOS lorsque disponible.

☐ Au moins un appareil mobile réel ou environnement équivalent fiable
avant Go-Live.

# 21. Sécurité de surface publique

☐ Aucun secret dans bundle/client/source public.

☐ Variables d'environnement correctement séparées.

☐ Formulaires protégés selon architecture.

☐ Messages d'erreur ne divulguent pas d'information sensible.

☐ Liens externes et embeds examinés.

☐ Headers/sécurité applicables vérifiés lors de la phase technique.

☐ Aucun endpoint métier exposé accidentellement par la refonte.

# 22. Pré-Go-Live

☐ Backup / stratégie de retour connue.

☐ Build de production réussi.

☐ Variables d'environnement production vérifiées.

☐ Domaine et HTTPS vérifiés.

☐ Redirections chargées.

☐ Sitemap final.

☐ robots.txt final.

☐ Analytics / consentement vérifiés si applicables.

☐ Formulaires testés en production/staging représentatif.

☐ Pages légales accessibles.

☐ Favicon, manifest et metadata de partage vérifiés.

# 23. Critères NO-GO

NO-GO si l'un des éléments suivants est non résolu :

☐ Perte d'URL ou de contenu sans décision approuvée.

☐ Redirections critiques manquantes.

☐ Parcours démonstration/contact cassé.

☐ Régression majeure mobile.

☐ Problème d'accessibilité bloquant sur navigation ou formulaire.

☐ Erreur de langue importante ou page manquante FR/EN.

☐ Build instable ou erreur runtime critique.

☐ Secret ou problème de sécurité identifié.

☐ Régression SEO majeure connue.

☐ Page LOCKED modifiée sans validation.

# 24. Critères GO

GO lorsque :

☐ Tous les bloqueurs sont fermés.

☐ Les écarts non bloquants sont documentés et acceptés.

☐ Crawl comparatif accepté.

☐ Parcours critiques validés.

☐ Responsive et accessibilité de base validés.

☐ FR/EN validés.

☐ SEO technique validé.

☐ Performance acceptable.

☐ Plan de rollback disponible.

☐ Validation humaine finale obtenue.

# 25. QA post-déploiement

Dans les heures suivant le déploiement :

☐ Homepage et pages clés répondent correctement.

☐ Redirections critiques testées.

☐ Formulaires testés.

☐ FR/EN testés.

☐ Navigation mobile testée.

☐ Erreurs serveur/client surveillées.

☐ Sitemap accessible.

☐ robots correct.

☐ Analytics/mesure vérifiés si applicables.

☐ Aucun asset majeur manquant.

# 26. QA après stabilisation

Après une courte période de stabilisation :

☐ Re-crawl complet.

☐ 404 et redirections examinées.

☐ Performance terrain examinée si données disponibles.

☐ Erreurs et logs examinés.

☐ Conversions/formulaires examinés.

☐ Retours utilisateurs ou internes consolidés.

☐ Correctifs classés : critique / important / amélioration.

# 27. Registre des anomalies

Chaque anomalie QA doit inclure : page/composant, environnement,
viewport, langue, étapes de reproduction, résultat attendu, résultat
obtenu, sévérité, capture si utile, responsable et statut.

Severités recommandées : BLOCKER, CRITICAL, MAJOR, MINOR, POLISH.

# 28. Acceptation d'une page

Une page peut passer APPROVED lorsque toutes les vérifications
applicables sont terminées et qu'aucun BLOCKER/CRITICAL n'est ouvert.

Une page passe LOCKED après validation humaine explicite et devient une
référence de régression pour la suite du chantier.

# 29. Acceptation finale Website V2

RÈGLE --- la mise en production n'est pas la fin de la QA; elle est le
passage d'une phase de validation à une phase d'observation.

Le site est considéré livré lorsque la migration est complète, les
parcours sont stables, le crawl post-déploiement est accepté et les
anomalies restantes sont documentées comme non bloquantes.

# 30. Règle finale

PRINCIPE --- aucune qualité ne compense l'absence d'une autre : un site
magnifique mais lent, inaccessible, incomplet, cassé en anglais ou
destructeur pour le SEO n'est pas un Website V2 réussi.

CORO Website V2 est accepté lorsque design, contenu, technique,
accessibilité, performance, bilinguisme et migration fonctionnent comme
un seul système.

## Editorial resource discovery (rule for every remaining public-page migration)

A discovery requirement, not a requirement that every page carries a resource section.

1. Identify the page's subject territory.
2. Search the existing CORO blog, guides and resources. The blog is served by the API (`GET /api/blog/public`, `/blog/[slug]`), not by local files: list it from the API, do not assume slugs.
3. Verify every candidate route exists and is publishable (article `isPublished`, page answers 200, not a FUTURE or REVIEW route).
4. Evaluate semantic relevance to what the page actually says.
5. Integrate only resources that materially deepen the page (typically 3 to 6 at most).
6. Prefer contextual linking over arbitrary SEO linking; anchors are the real article titles, never keyword-stuffed.
7. Avoid duplicate or weak links (same article twice, or an article that overlaps another already chosen).
8. Never invent a resource route or create an article to fill a slot.
9. Preserve FR/EN availability truth: an FR-only page links the FR article; a page offering English links to `?lang=en` only when the article has an English version.
10. Verify the links during QA (route answers 200, focus visible, no overflow at 390 and 1440).

Record the candidate table (article, URL, topic, relation, value, status, LINK / DO NOT LINK) in `MIG-03-REGISTER.md`.
