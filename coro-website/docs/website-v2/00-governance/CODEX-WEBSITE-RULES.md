CORO

CODEX WEBSITE RULES

Website V2 · Règles permanentes d'exécution

CONSTRUIRE DANS LE SYSTÈME. NE PAS RÉINVENTER CORO.

Ce document est destiné à être fourni à Codex au début du chantier et à
rester une contrainte normative pendant toute la reconstruction du site
public.

Version 1.0 \| 23 septembre 2026 \| Statut : règles de chantier

# 1. Mandat de Codex

Codex intervient comme agent d'implémentation du chantier Website V2. Il
analyse l'existant, propose lorsque demandé, puis implémente uniquement
dans le périmètre autorisé.

PRINCIPE --- la direction artistique CORO est déjà décidée. Codex ne
reçoit pas mandat de réinventer la marque à chaque page.

# 2. Périmètre du chantier

- Le site public actuel est l'application coro-website du dépôt CORO.

- Le chantier Website V2 doit être isolé dans un worktree et une branche
dédiés.

- Le travail porte principalement sur coro-website.

- Les applications métier ne doivent pas être modifiées sans
autorisation explicite.

- Une dépendance inter-applications doit être signalée avant toute
modification.

STOP --- si une demande exige de toucher à une application métier ou à
une infrastructure hors périmètre, Codex s'arrête et demande validation.

# 3. Ordre de travail obligatoire

1\. Audit de l'existant.

2\. Inventaire exhaustif URL / contenus / SEO.

3\. Matrice de migration.

4\. Validation humaine.

5\. Architecture cible.

6\. Design Lab.

7\. Validation / gel du Design System.

8\. Reconstruction progressive.

9\. Migration des contenus.

10\. FR/EN, SEO et redirections.

11\. QA responsive / fonctionnelle.

12\. Crawl comparatif ancien / nouveau.

13\. Go / No-Go.

14\. Déploiement.

INTERDIT --- commencer la reconstruction massive des pages avant
validation de l'inventaire, de la migration et du Design Lab.

# 4. Mode audit

Lorsqu'une tâche est déclarée AUDIT, Codex travaille en lecture seule
sauf instruction explicite contraire.

- Aucun fichier modifié.

- Aucune migration exécutée.

- Aucun package ajouté.

- Aucun refactor opportuniste.

- Aucun formatage global.

- Les constats doivent citer les chemins de fichiers, routes, composants
ou configurations concernés.

- Les incertitudes sont marquées comme telles; elles ne sont pas
comblées par supposition.

# 5. Protection absolue de l'existant

RÈGLE --- aucune page, URL publique, contenu utile ou acquis SEO ne
disparaît silencieusement.

Chaque URL doit recevoir un destin explicite : KEEP, REBUILD, MERGE,
REDIRECT, ARCHIVE-WITH-APPROVAL ou REVIEW.

- Une fusion doit identifier l'URL cible.

- Une redirection doit identifier source et destination.

- Une suppression nécessite une validation humaine explicite.

- Les contenus FR et EN doivent être inventoriés séparément.

- Les métadonnées, canonical, hreflang, structured data, sitemap et
robots doivent être inclus dans l'analyse.

# 6. Sources de vérité

Codex doit consulter les documents de chantier avant toute
implémentation pertinente.

Ordre de priorité : composants LOCKED → Design System V1.0 → CORO Visual
Language → références visuelles APPROVED → besoin local de la page.

RÈGLE --- une page locale ne peut pas contredire une source de vérité
supérieure pour résoudre plus facilement un problème d'implémentation.

# 7. Règle maîtresse de design

Une page peut introduire une nouvelle composition, mais pas une nouvelle
identité.

CORO doit rester architectural, opérationnel, humain, profond, précis,
premium, technologique et canadien.

Le langage visuel relie bâtiments, personnes, plans, données, décisions
et actions.

INTERDIT --- dériver vers un template SaaS générique, une esthétique AI
startup ou une collection de dashboards sans contexte réel.

# 8. Anti-patterns interdits

- Succession mécanique de sections blanches et de trois cards.

- Hero systématique badge + H1 + paragraphe + deux boutons + screenshot.

- Gradient violet/bleu générique.

- Glassmorphism ou glow utilisé comme décoration.

- Icônes décoratives sans rôle.

- Illustration abstraite sans rapport avec le métier.

- Cards flottantes animées sans signification.

- Valeurs CSS arbitraires page par page.

- Copie locale d'un composant partagé pour contourner le système.

- Modification d'une page approuvée pour faciliter une nouvelle page.

# 9. Avant de créer un composant

OBLIGATOIRE --- Codex vérifie dans cet ordre :

1\. Le composant existe-t-il déjà ?

2\. Une variante existante répond-elle au besoin ?

3\. Une variante nouvelle du composant existant est-elle préférable ?

4\. Le besoin justifie-t-il réellement un nouveau composant partagé ?

5\. Le nouveau pattern peut-il être réutilisé ailleurs ?

Tout nouveau composant ou pattern partagé doit être nommé, justifié et
documenté.

# 10. Tokens et CSS

- Utiliser les tokens du Design System lorsqu'ils existent.

- Ne pas introduire de couleur hex locale sans justification.

- Ne pas inventer de spacing, radius, shadow ou breakpoint local si le
système couvre le besoin.

- Éviter les styles inline pour contourner le système.

- Préférer les variantes explicites aux cascades de classes
conditionnelles opaques.

- Tout nouveau token doit répondre à un besoin système et non à une
seule préférence visuelle locale.

# 11. Compositions CORO

Codex peut composer avec les familles approuvées : HeroArchitectural,
HeroProduct, HeroEditorial, HeroOperational, sections Light / Soft /
Dark / Blueprint / Media / Statement / Proof, panneaux opérationnels,
data overlays, continuum, timeline et autres patterns validés.

RÈGLE --- cohérence ne signifie pas répétition. Les pages doivent
partager le langage tout en variant leur narration et leur composition.

# 12. Images et médias

- Les bâtiments et environnements réels sont privilégiés lorsqu'ils
servent le récit.

- Les interfaces doivent être reliées à un contexte réel plutôt que
simplement posées.

- Les images de stock génériques sont à éviter.

- Aucun texte essentiel ne doit exister uniquement dans une image.

- Les médias doivent avoir alt text, stratégie responsive et stratégie
de performance.

- Ne pas inventer visuellement une fonctionnalité CORO inexistante.

# 13. Mouvement

- Une animation doit expliquer un état, une relation ou une opération.

- Logique privilégiée : données → décisions → actions → preuves →
apprentissage.

- Respecter prefers-reduced-motion.

- Éviter parallaxe agressive, flottement permanent et animation
décorative.

- Le contenu doit rester compréhensible sans animation.

# 14. Responsive

OBLIGATOIRE --- chaque composant et chaque page sont vérifiés au minimum
en desktop, tablette et mobile.

- Le mobile n'est pas un empilement aveugle du desktop.

- Les overlays sont priorisés et réduits sur petit écran.

- Les plans et blueprints doivent être recadrés, simplifiés ou
séquencés.

- Aucun breakpoint ad hoc par page sans justification.

- Le contenu, les CTA et la hiérarchie doivent rester complets.

# 15. Accessibilité

- Navigation clavier et focus visible.

- Contrastes suffisants.

- Ordre DOM logique.

- Aucun état communiqué uniquement par couleur.

- Cibles tactiles suffisantes.

- Alt text pertinent.

- Zoom et agrandissement du texte testés.

- Réduction des animations respectée.

- Les améliorations visuelles ne doivent jamais réduire l'accessibilité.

# 16. Bilingue FR / EN

- Les routes et contenus FR/EN sont traités comme un système cohérent.

- Aucun texte utilisateur ne doit être hardcodé dans une seule langue si
l'architecture prévoit l'internationalisation.

- Les traductions doivent préserver le sens, pas uniquement la longueur.

- Les différences de longueur FR/EN sont testées dans les composants.

- hreflang, metadata et canonical sont vérifiés dans la phase SEO.

# 17. SEO et migration

- Préserver les URL performantes lorsque cela est pertinent.

- Les changements de slug nécessitent une entrée dans la matrice de
migration.

- Les 301 doivent être explicites et testables.

- Les titres, descriptions, canonical, OG, structured data et hreflang
doivent être inventoriés.

- Un crawl comparatif avant/après est obligatoire avant Go-Live.

STOP --- une page publique existante ne peut être supprimée simplement
parce qu'elle semble redondante.

# 18. Performance

- Éviter d'augmenter le poids JavaScript pour un effet visuel pouvant
être obtenu plus simplement.

- Images responsives, dimensions explicites et formats adaptés.

- Lazy loading lorsque pertinent.

- Préserver le contenu principal et le LCP.

- Les animations et overlays ne doivent pas dégrader sensiblement
l'expérience mobile.

- Toute bibliothèque nouvelle doit être justifiée avant ajout.

# 19. Sécurité et dépendances

- Ne jamais exposer secrets, tokens ou variables privées au client.

- Ne pas modifier auth, API, permissions ou logique métier dans le cadre
du design sans mandat explicite.

- Examiner l'impact d'une dépendance avant ajout.

- Ne pas lancer de migration ou action destructive dans le cadre du
chantier Website V2 sans instruction explicite.

# 20. États de validation

DRAFT → REVIEW → APPROVED → LOCKED.

- DRAFT : exploration permise.

- REVIEW : prêt pour revue visuelle, responsive et fonctionnelle.

- APPROVED : conforme et réutilisable comme référence.

- LOCKED : ne pas modifier sans instruction explicite.

RÈGLE --- l'ajout d'une nouvelle page ne constitue jamais une
autorisation implicite de modifier une page LOCKED.

# 21. Travail par lots

Codex doit privilégier de petits lots cohérents et vérifiables.

- Un objectif principal par lot.

- Limiter le nombre de fichiers modifiés.

- Éviter les refactors non liés.

- Après chaque lot : résumé, fichiers touchés, tests exécutés,
résultats, risques et points à valider.

- Un lot doit pouvoir être compris et reverté sans dépendre d'un
ensemble massif de changements non reliés.

# 22. Format du compte rendu Codex

À la fin de chaque tâche, Codex doit fournir :

1\. Résultat obtenu.

2\. Fichiers créés / modifiés.

3\. Décisions prises.

4\. Tests et commandes exécutés.

5\. Résultats des tests.

6\. Écarts ou éléments non terminés.

7\. Risques / régressions possibles.

8\. Ce qui nécessite validation humaine.

9\. Commit proposé uniquement si le lot est prêt.

# 23. Règles Git

- Travailler uniquement dans le worktree / branche Website V2 désignés.

- Vérifier branche et état Git avant modification.

- Ne pas mélanger des changements provenant d'autres chantiers.

- Ne pas force-push.

- Ne pas réécrire l'historique sans instruction.

- Ne pas commit automatiquement si Mathieu n'a pas demandé le commit.

- Un commit doit être cohérent, limité et descriptif.

# 24. Contrôle de régression design

Avant de déclarer une page prête :

- comparer avec la référence visuelle maîtresse;

- vérifier les tokens et composants;

- vérifier répétition excessive des patterns;

- vérifier profondeur, rythme et alternance clair/sombre;

- vérifier desktop / tablette / mobile;

- vérifier FR / EN;

- vérifier hover / focus / états;

- vérifier qu'aucune page APPROVED / LOCKED n'a régressé.

# 25. Conditions de STOP

STOP --- Codex doit interrompre l'implémentation et demander validation
si :

- une URL existante devrait être supprimée;

- une page LOCKED doit être modifiée;

- une application hors coro-website doit être touchée;

- une dépendance majeure doit être ajoutée;

- une migration ou opération destructive serait nécessaire;

- la demande contredit une règle normative;

- un choix de design majeur n'est pas couvert par le système;

- une incertitude pourrait entraîner une perte de contenu, SEO, sécurité
ou fonctionnalité.

# 26. Definition of Done --- page

Une page n'est pas terminée parce qu'elle « a l'air bonne ».

OBLIGATOIRE --- contenu complet, responsive, FR/EN, composants
conformes, accessibilité de base, performance raisonnable, SEO prévu,
liens et CTA fonctionnels, aucun contenu historique perdu, aucun impact
non voulu sur les pages approuvées.

# 27. Definition of Done --- chantier

Le chantier n'est terminé qu'après : inventaire et matrice clôturés;
toutes les URL traitées; pages reconstruites; FR/EN validé; redirections
testées; QA responsive et fonctionnelle; audit
accessibilité/performance; crawl comparatif; absence de régression
critique; Go/No-Go formel; déploiement validé.

# 28. Instruction de démarrage à Codex

Au début d'une nouvelle session Website V2, Codex doit :

1\. Confirmer le worktree et la branche.

2\. Lire les documents de chantier pertinents.

3\. Identifier le statut DRAFT / REVIEW / APPROVED / LOCKED des éléments
touchés.

4\. Résumer le périmètre exact de la tâche.

5\. Signaler tout conflit ou incertitude avant modification.

6\. Procéder uniquement après que le périmètre est clair.

# 29. Règle finale

PRINCIPE --- Codex est libre d'être ingénieux à l'intérieur du système,
pas de redéfinir le système en cours de route.

Le but n'est pas de rendre toutes les pages identiques. Le but est que
chaque page soit singulière, forte et utile tout en donnant
immédiatement l'impression qu'elle appartient à CORO.
