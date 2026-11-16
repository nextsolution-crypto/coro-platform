# INC-RP-01 — Acceptation UX du formulaire

## Critères fonctionnels

| Scénario | Résultat attendu |
|---|---|
| nouveau rapport contextualisé | organisation, bâtiment, auteur et heure préremplis côté serveur |
| saisie rapide | essentiel visible; sections avancées conditionnelles |
| personnes/véhicules/équipements | ajout, ordre, édition et suppression de plusieurs lignes |
| listes organisationnelles | valeurs actives proposées; anciennes valeurs historiques lisibles |
| brouillon | sauvegarde/reprise sans perte et conflit explicite |
| soumission incomplète | résumé clair et focus sur chaque champ manquant |
| correction | nouvelle version; version soumise précédente intacte |
| pièce jointe | progression, type/taille, quarantaine et erreur compréhensible |
| accès refusé | motif actionnable sans révéler l'existence de données hors périmètre |
| import historique | original, mapping et éléments non reconnus consultables |

## Performance et ergonomie

- première section interactive sans charger toutes les listes lourdes;
- recherche dans les longues listes et pagination côté serveur;
- ajout d'une ligne répétable sans déplacement inattendu du focus;
- autosauvegarde indiquée sans masquer un échec;
- aucune réponse réseau ancienne ne remplace une valeur récente;
- conservation du brouillon après F5 lorsque la politique le permet;
- état hors ligne explicite; aucune fausse confirmation de sauvegarde.

## Matrice responsive

Tester au minimum 360×800, 768×1024, 1024×768 et 1440×900, thèmes clair,
sombre et système lorsque supportés. Vérifier clavier, focus, zoom 200 %, textes
longs, listes, sélecteurs de date, répétitions et pièces jointes. Une mesure de
débordement seule ne constitue pas une inspection.

## Confidentialité et autorité

- aucune valeur sensible dans URL, télémétrie ou message d'erreur;
- projection de liste minimale;
- masquage par champ appliqué serveur;
- refus interorganisation et interbâtiment;
- révocation effective sur session ouverte à la requête suivante;
- audit séparé des lectures sensibles, modifications, soumissions et exports.

## Tests d'intégration requis

1. PostgreSQL réel et backend réel.
2. Créateur, réviseur, approbateur et lecteur avec portées distinctes.
3. Concurrence de deux brouillons et double soumission.
4. Modèle modifié pendant qu'un ancien brouillon existe.
5. Champ personnalisé sans migration Prisma.
6. Section conditionnelle devenant obligatoire.
7. Import avec champs mappés, partiels et inconnus.
8. Antivirus en attente, rejet et reprise.
9. Échec 503 et reprise idempotente.
10. Navigation authentifiée sur ordinateur, tablette et téléphone.

## Limites explicites

- parité exacte Reportperfect : `NOT_VERIFIED` sans artefact client;
- lecteur d'écran réel : `NOT_VERIFIED` sans recette humaine;
- production authentifiée : `NOT_VERIFIED` tant que non exécutée;
- impression navigateur : distincte d'un export PDF serveur probant.

## Gate de sortie Lot 0A

Le gate passe si le moteur peut représenter les capacités RP publiquement
confirmées, les champs client, les versions historiques et une enveloppe sans
perte pour les inconnus. Il n'autorise pas à déclarer une parité exacte.
