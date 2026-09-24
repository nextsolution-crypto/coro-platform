CORO

QA ACCEPTANCE CHECKLIST

Website V2 · Contrôle qualité et critères d'acceptation

UNE PAGE N'EST PAS TERMINÉE PARCE QU'ELLE EST BELLE.

Elle est terminée lorsqu'elle est cohérente, complète, accessible,
responsive, performante, bilingue, testée et sans régression.

Version 1.0 \| 24 septembre 2026 \| Statut : référence QA

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
