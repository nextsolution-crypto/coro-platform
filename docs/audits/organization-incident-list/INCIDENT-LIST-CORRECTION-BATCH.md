# Lot correctif proposé — liste des incidents

Ce document décrit un lot futur. **Aucune correction produit n’est incluse dans l’audit.**

## Lot cohérent recommandé

1. Créer un DTO/projection minimale de liste, sans instantanés, fiche d’intervention ni jetons.
2. Ajouter une pagination serveur déterministe et un total gouverné; ne jamais présenter `items.length` comme total implicite.
3. Rendre exhaustivement les cinq statuts (`PRE_ALERT`, `ACTIVE`, `CONTAINED`, `RESOLVED`, `CANCELLED`).
4. Distinguer explicitement exercice et incident réel.
5. Ajouter recherche, tri et filtres serveur avec paramètres persistants.
6. Clarifier les dates et le contexte bâtiment; ne pas inventer responsable ou sévérité d’événement.
7. Préserver l’autorité Client actuelle : permission Incident + organisation + bâtiment; conserver les refus sans contenu ni compteur.

## Critères d’acceptation

- 62 incidents : 62 accessibles par pages, total 62, aucun double comptage.
- Les réponses de liste ne contiennent que les champs documentés du DTO.
- Chaque statut a un libellé distinct, accessible sans couleur.
- Les exercices sont identifiables et filtrables.
- Recherche accentuée, tri stable et combinaison de filtres fonctionnent au-delà de 50 éléments.
- 401, 403/404, 503 et zéro résultat restent distincts; une erreur ne devient jamais un faux zéro.
- Une réponse antérieure ne remplace pas la dernière sélection.
- Matrice Chrome 12/12, clavier, focus, zoom 200 %, F5 et console sans régression critique.

## Décisions métier nécessaires

- « En cours » signifie-t-il uniquement `ACTIVE` ou tous les états non terminaux?
- La sévérité globale et le responsable d’incident doivent-ils devenir des champs canoniques, ou l’interface doit-elle rester au niveau des tâches?
- La lecture interne avec `PlatformPermission.INCIDENT_READ` reste-t-elle organisationnelle ou doit-elle aussi dépendre d’une affectation de bâtiment?
