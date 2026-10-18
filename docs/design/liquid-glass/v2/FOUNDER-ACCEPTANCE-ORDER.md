# Liquid Glass V2 — ordre recommandé de la revue manuelle du Founder

Cette revue se fait sur un **build de préproduction privé** (jeton `NEXT_PUBLIC_GLASS_BETA=production-preview`), après décision séparée (voir
`ROLLBACK-AND-RELEASE-DOSSIER.md`). La matrice page par page est dans `coverage-matrix.md` : chaque route y indique son rendu, ses tests de validation et le résultat du balayage visuel.

## Préparation (5 minutes)

1. Ouvrir **Mon profil → Apparence** ; choisir *Liquid Glass (aperçu)*, puis tester **Clair**, **Sombre** et **Système** (changer le thème du système d’exploitation pour vérifier la réaction en direct).
2. Revenir à **Classique** : l’interface doit être strictement celle d’avant (barre latérale 240 px). Repasser en Glass : la barre latérale fait **350 px** par défaut (redimensionnable 180–400 px).
3. Sur mobile (ou fenêtre étroite) : le tiroir de navigation est inchangé.

## Ordre de revue (du moins risqué au plus sensible)

| # | Famille | Pages à parcourir | Ce qu’il faut regarder |
|---|---|---|---|
| 1 | Pilotes natifs | Tableau de bord, Mon profil, Paramètres, Portefeuille d’activités | Référence visuelle : tout le reste doit paraître de la même famille. |
| 2 | Travail courant | Projets (liste, détail), Activités, Timelog, Notifications, Planification | Cartes, tableaux, pastilles de statut, formulaires ; lisibilité en Sombre ; aucune zone blanche franche. |
| 3 | Portefeuille | Clients (fiche, portefeuille), Bâtiments (fiche, conformité, **carte**), Références | La carte garde son rendu sombre d’origine (écran conçu pour le sombre). |
| 4 | Administration | Équipe / utilisateurs, organisation, modèles de tâches, catégories de temps, retours, journal des changements | Tableaux, modales (ouvrir une modale : elle doit recouvrir la barre du haut et être opaque). |
| 5 | Réservations et capacité | Réservations (Booking), capacité, mandats | États (en attente, acceptée…) toujours lisibles sans la couleur seule. |
| 6 | Documents et configurateurs | Configurateurs PMU/PSI/PCA, éditeur de sections, bibliothèque | **La feuille de document (aperçu du contenu) doit rester claire** quel que soit le thème. |
| 7 | Mandats, procédures, contenu d’urgence | Mandat, procédures de projet, procédures d’administration | Contenu et ordre inchangés ; seule l’apparence change. |
| 8 | Commercial et financier | Rendement (opérationnel, financier), Commercial (configurateur, propositions, contrats…), Catalogue, Organisations, Contrôle, Métrologie | **Aucun montant ne doit changer** (CAD seul ; devise inconnue affichée explicitement). Un ADMIN client ne doit voir aucune de ces pages. |
| 9 | Authentification (application) | Connexion, réinitialisation | Formulaire et messages inchangés. |
| 10 | Portail client — accès | Connexion, mot de passe oublié, réinitialisation, lien magique | Le portail n’affiche aucun choix d’apparence hors préproduction. |
| 11 | Portail client — usage | Tableau de bord, bâtiments, documents (et lecture/validation), activités, carte, notifications, profil | Mobile d’abord (320 / 390 px) : pas de défilement horizontal. |
| 12 | Portail — Sentinelle | Accueil bâtiment, employés, invitations, historique, rapports, résilience, population, **incident et évacuation** | Les contrôles d’urgence restent rouges, opaques et explicites ; le bouton panique et sa fenêtre de résultat gardent leur rendu Classique exact. |
| 13 | Écrans publics et bornes | Borne, QR, présence, intervention, population publique | Les couleurs d’état plein écran (rouge urgence, ambre, vert) sont inchangées. |
| 14 | Exclu | Permissions de plateforme (`/admin/platform-permission-grants`) | Reste **Classique** par décision de sécurité : à ne pas migrer sans décision distincte. |

## Contrôles transverses à chaque page

* Basculer Clair ↔ Sombre sans recharger. Réduire la fenêtre (320 px). Tabulation au clavier : un contour visible suit le focus.
* Ouvrir au moins une modale ou un menu flottant lorsque la page en a.
* En cas de doute visuel : noter la route (colonne « Route » de la matrice) et la combinaison thème/largeur ; la reprise se fait par famille (retour arrière de niveau 3 du dossier).
