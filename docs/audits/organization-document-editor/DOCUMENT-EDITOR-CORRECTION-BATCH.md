# Lot de correction proposé — sans implémentation

## Lot A — frontière de sécurité (bloquant)

1. Assainir le contenu avec une politique commune, stricte et testée avant persistance et/ou rendu; supprimer toute interpolation HTML non échappée.
2. Introduire une autorité serveur explicite de modification documentaire, distincte de la lecture du projet.
3. Refuser toutes les mutations de contenu, modules, procédures et versions selon l’état métier (`REVIEW`, `VALIDATED`, `EXPORTED`, `ARCHIVED`) conformément à la politique approuvée.
4. Propager la même décision aux endpoints spécialisés des modules 2–8 et procédures.
5. Aligner `validate/:projectId` sur `projectAccessWhere(actor)`.

Critère : refus avant toute écriture, tâche, notification ou audit métier; tests inter-tenant, hors affectation, état final et XSS.

## Lot B — concurrence, historique et audit (bloquant)

1. Ajouter une version de concurrence au document ou un ETag vérifiable; exiger la version attendue et retourner HTTP 409 en conflit.
2. Enregistrer l’acteur, l’opération, le projet, le document, la version avant/après et une corrélation d’audit.
3. Rendre création, restauration et suppression de versions transactionnelles et autorisées séparément.
4. Ne pas retourner `snapshot` dans la liste; créer un endpoint de lecture d’une version avec autorisation dédiée si nécessaire.
5. Encadrer la suppression par une règle de rétention approuvée; préférer l’archivage si l’historique doit être conservé.

Critère : deux éditeurs ne peuvent pas s’écraser silencieusement; historique et audit cohérents après échec.

## Lot C — UX de sauvegarde et reprise

1. Centraliser l’état sale de tous les modules.
2. Bloquer/faire confirmer section, langue, retour, fermeture et F5 lorsqu’une saisie non sauvegardée existe.
3. Afficher les erreurs de lecture/sauvegarde et offrir une nouvelle tentative idempotente.
4. Ne jamais afficher « sauvegardé » avant confirmation serveur; conserver le brouillon local après erreur.
5. Ajouter des tests panne réseau, timeout et réponse invalide.

## Lot D — accessibilité et design

1. Focus piégé/restauré dans l’historique, annonces `aria-live`, actions visibles au clavier et tactile.
2. Mesurer zoom 200 %, textes longs, navigation clavier et lecteurs d’écran.
3. Décider explicitement si la route reste legacy ou migre au Design System; ne pas compter les préférences Glass comme rendu Glass natif.

## Séquencement

Corriger A puis B avant toute nouvelle acceptation fonctionnelle. C et D suivent sur le même contrat serveur. Ne pas intégrer ce lot aux PR #115/#116; ouvrir des commits revus séparément. Une décision métier est requise uniquement si les états modifiables ou la suppression d’historique doivent différer de la politique proposée.
