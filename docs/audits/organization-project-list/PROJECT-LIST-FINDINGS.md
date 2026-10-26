# Constats — liste des projets organisation

## PROJ-LIST-001 — Réactivation d'une archive

- Catégorie : sécurité métier / archive
- Gravité : **BLOQUANTE** pour OPERATOR
- Statut : **FAIL démontré**
- Emplacement : UI `page.tsx:170,577`; API `projects.service.ts:126`
- Reproduction : un OPERATOR affecté ouvre Archives puis appelle `PUT /projects/:id` avec `status=IN_PROGRESS`.
- Attendu : lecture seule; aucune réouverture implicitement autorisée.
- Observé : HTTP succès et état modifié. Le test a remis le fixture synthétique à `ARCHIVED`.
- Impact : contournement de la politique d'archivage et mutation historique par un acteur de lecture légitime.
- Correction recommandée : état source chargé côté serveur, refus transactionnel de toute mutation d'un projet archivé, sauf future autorité de réouverture explicitement approuvée; retirer le bouton.
- Recette : refus serveur sans audit métier de succès, document ou tâche secondaire; lecture conservée.

## PROJ-LIST-002 — Panne principale convertie en état vide

- Catégorie : résilience / vérité de l'interface
- Gravité : **BLOQUANTE fonctionnelle**
- Statut : **FAIL démontré**
- Emplacement : `page.tsx:129-157` et rendu vide à partir de `page.tsx:359`.
- Reproduction : réponse 503 synthétique sur `GET /projects`.
- Attendu : erreur explicite, absence de faux zéro, bouton Réessayer.
- Observé : `0 / illimité projets` et onboarding « premier projet ».
- Impact : une panne peut inciter l'utilisateur à recréer des données et masque l'indisponibilité réelle.
- Correction recommandée : état d'erreur principal séparé, conservation contrôlée du dernier succès avec fraîcheur, retry explicite et requêtes secondaires indépendantes.
- Recette : erreur lente/réseau/503, retour normal, aucune boucle et aucune donnée résiduelle d'un autre contexte.

## PROJ-LIST-003 — Sélection persistante entre onglets et suppression trompeuse

- Catégorie : mutation / UX
- Gravité : **ÉLEVÉE**
- Statut : **FAIL prouvé par le code; mutation destructive complète non rejouée**
- Emplacement : `page.tsx:181-210,311-348,775-803`.
- Observé : `selectedIds` n'est pas nettoyé au changement actifs/archives; l'appel supprime tous les IDs sélectionnés alors que la confirmation n'affiche que les éléments visibles. Le texte annonce une suppression définitive, mais l'API applique `isActive=false`.
- Impact : un projet masqué par l'onglet courant peut être désactivé; message incohérent avec l'effet réel.
- Correction recommandée : sélection liée au périmètre affiché, confirmation exhaustive, endpoint de lot idempotent et libellé « désactiver/retirer » conforme.
- Recette : changement onglet/filtre, annulation, double clic, échec partiel et persistance après F5.

## PROJ-LIST-004 — Annuaire de filtre non adapté

- Catégorie : minimisation / UX
- Gravité : **MOYENNE**
- Statut : **FAIL démontré visuellement et dans le code**
- Emplacement : `GET /users/organization`; `page.tsx:136,295`.
- Observé : l'OPERATOR reçoit tous les utilisateurs de l'organisation, y compris inactifs, administrateurs, rôle et courriel. L'écran affiche notamment l'utilisateur révoqué comme filtre à zéro.
- Impact : bruit, métadonnées inutiles et surface d'exposition supérieure au besoin de la liste.
- Correction recommandée : endpoint de filtres projet minimal retournant uniquement les responsables actifs et visibles, sans courriel ni rôle non requis.
- Recette : acteur actif/inactif, autre organisation, responsable sans projet et retrait d'affectation.

## PROJ-LIST-005 — Compteurs et limite de licence ambigus

- Catégorie : exactitude
- Gravité : **MOYENNE**
- Statut : **FAIL prouvé par le code**
- Emplacement : `page.tsx:232,250,261-306`; `projects.service.ts:80-87`.
- Observé : le numérateur est `visibleProjects.length`, donc dépend du filtre et de l'onglet, tandis que le dénominateur est la limite globale. Le frontend exclut les archives du seuil; le backend compte tous les projets `isActive`, archives comprises.
- Impact : compteur incohérent et bouton création potentiellement actif avant un refus serveur.
- Correction recommandée : retourner un résumé serveur canonique (total actif, archivé, consommant la licence) et nommer chaque valeur.
- Recette : archive seule, filtre responsable, limite atteinte, création concurrente.

## PROJ-LIST-006 — Navigation carte non accessible au clavier

- Catégorie : accessibilité
- Gravité : **MOYENNE**
- Statut : **FAIL prouvé par le code**
- Emplacement : `page.tsx:455`.
- Observé : carte `div` avec `onClick`, sans lien, rôle, tabulation ni gestion clavier.
- Impact : fiche difficile ou impossible à ouvrir au clavier et sémantique absente pour les technologies d'assistance.
- Correction recommandée : lien natif vers `/projects/:id`; commandes de sélection séparées et étiquetées.
- Recette : Tab/Shift+Tab/Entrée/Espace, focus visible, nom accessible et ouverture nouvel onglet.

## PROJ-LIST-007 — Recherche, tri et pagination absents

- Catégorie : amélioration UX
- Gravité : **NON BLOQUANTE à faible volume**
- Statut : **NON_APPLICABLE pour la recette actuelle**
- Observé : aucun contrôle ou paramètre de liste; le serveur retourne tous les projets triés par modification décroissante.
- Impact : scalabilité et localisation d'un mandat limitées lorsque le portefeuille grandit.
- Condition : décision produit sur les champs recherchables, les filtres et la pagination serveur.

