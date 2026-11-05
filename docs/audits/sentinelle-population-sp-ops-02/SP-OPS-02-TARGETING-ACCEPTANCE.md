# SP-OPS-02 — Acceptation du ciblage

## Règle mise en œuvre

L’établissement est recherché sous le profil environnemental du bâtiment autorisé. Une géométrie seule n’est jamais transformée silencieusement en point ou en centroïde. Seules des coordonnées ponctuelles valides permettent de confirmer l’intersection avec les zones opérationnelles. `MODELED_IMPACT` reste exclu.

Un établissement géographiquement concerné n’est notifiable que s’il est actif, sensible et possède au moins un contact d’urgence actif sur un canal autorisé. Même alors, il n’est jamais sélectionné automatiquement. Le navigateur transmet une sélection explicite; le serveur la recalcule et la valide avant création du brouillon.

## Preuves

- Hôpital QA et École QA : concernés, admissibles et affichés.
- Résidence avec géométrie sans coordonnées : conservée dans la qualification, jamais ciblée par centroïde.
- Deux cases admissibles : non cochées par défaut dans Chrome.
- Snapshot immuable créé pour les deux établissements choisis.
- Identifiant d’un autre tenant : refus avant mutation.
- Gel concurrent : deux réponses idempotentes, aucun doublon.
- Trois livraisons figées au total, dont deux institutionnelles supprimées en SANDBOX.

## Séparation scientifique

L’empreinte modélisée, la zone opérationnelle et la zone de protection restent des usages distincts. Le scénario, la source et les zones sont revérifiés avant le gel. Aucun calcul nouveau de dispersion ou décision scientifique automatique n’a été ajouté.

## Verdict

**GO — ciblage institutionnel simulé et gouverné.** Ce verdict ne couvre pas une diffusion réelle.
