# Préparation DISPLAY-06

DISPLAY-05C expose les interfaces futures utiles au Player sans les implémenter :

- publication approuvée et version exacte;
- `ProjectFile`, empreinte et rendu;
- bâtiment, étage, emplacement et affectation;
- statut, révocation et audit de publication;
- observation et correction sans mutation du document;
- clôture immuable et historique append-only.

DISPLAY-06 devra consommer uniquement les publications admissibles, vérifier les révocations et ne jamais déduire une commande d’écran d’une observation critique. Aucune commande, diffusion, websocket Player ou logique DISPLAY-06/07 n’a été ajoutée.

Réserve : définir séparément le contrat opérationnel de synchronisation Player et ses autorisations.
