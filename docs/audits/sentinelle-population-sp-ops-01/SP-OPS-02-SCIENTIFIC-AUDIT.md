# SP-OPS-02 — Audit scientifique

## Source utilisée

Rapport Pinchin 0337180.008, révision du 24 juillet 2025, consulté localement et non ajouté au dépôt.

## Données factuelles extraites

| Élément | Valeur | Pages PDF |
|---|---|---|
| Substance | ammoniac anhydre | 1–2 |
| Modèle | DNV Phast | 2 |
| Seuil | AEGL-2, 160 ppm | 2–7 |
| Moyenne toxique des annexes | 600 s | 11, 15, 19, 23 |
| Vent / stabilité | 1,5 m/s, classe F | 2–7 |
| Hauteur d'intérêt | 1,7 m | 3–6 et annexes |
| Scénario 1 | 3 714,32 m | 3, 7, 12 |
| Scénario 2 | 1 743,24 m | 4, 7, 15 |
| Scénario 3 | 4 854,85 m, pire cas alternatif | 5, 7, 20 |
| Scénario 4 | 1 775,62 m | 6, 7, 24 |

## Interprétation retenue

- Les valeurs sont des distances sous le vent vers une concentration d'intérêt, dans les hypothèses documentées.
- Elles ne démontrent pas un disque uniforme autour du site.
- Les anneaux CORO restent des repères de planification lorsqu'aucune géométrie scientifique importée n'est disponible.
- La provenance du vent et la propagation sont opposées; CORO expose les deux conventions.
- Une empreinte `MODELED_IMPACT`, une zone de notification et une zone de protection sont trois objets de décision différents.

## Contrôles produits

- Le mode LIVE exige les champs scientifiques, une révision et une source documentaire courante.
- Les zones de ciblage LIVE doivent être validées, opérationnelles, renseignées et approuvées pour l'alerte.
- Une modification du scénario, de la source/version ou des zones bloque le gel et le preflight du snapshot précédent.
- Aucun calcul CORO ne transforme silencieusement la distance maximale du rapport en géométrie scientifique exacte.

## Réserve scientifique

L'application ne recalcule pas une dispersion à partir de météo en temps réel et ne remplace pas Phast ou l'autorité compétente. Toute nouvelle règle reliant météo, seuil ou mesure de protection nécessite une validation métier distincte.
