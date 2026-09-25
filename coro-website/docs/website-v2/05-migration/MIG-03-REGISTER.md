# MIG-03 REGISTER — famille Résilience & opérations

Registre minimal des points de mise en ligne propres à MIG-03. Les points MIG-02 restent dans `MIG-02-GATE.md`.

| Classe | Portée | Élément |
|---|---|---|
| DÉCISION | Sentinelle | `/sentinelle` est FR seulement : `hasEnglish: false`, canonical FR, hreflang `fr-CA` + `x-default`, aucun contenu EN ; sélecteur de langue (en-tête) et lien « English » (pied) masqués via `englishAvailable={false}` |
| RECAPTURE | Sentinelle | RECAPTURE REQUIRED BEFORE GO-LIVE : registre d'occupation, évacuation, personnes manquantes / non confirmées (aucune capture produit actuelle ; les images V1 montrent des interfaces inventées) |
| REVIEW | Sentinelle | Formulation de vie privée : « Sentinelle enregistre les entrées, les sorties et les statuts opérationnels déclarés; le registre d’occupation n’assure pas la géolocalisation continue des personnes. » Aucune allégation Loi 25 ; purge du registre à 12 mois non publiée |
| PROPRIÉTÉ | QR intervention | Incident (jeton public par incident, valide tant que l'incident est actif) ; non publié sur Sentinelle |
| PROPRIÉTÉ | Panneau d'alarme | PARTIAL, Incident / futur : crée un incident en pré-alerte ; dispositif IoT externe absent du dépôt |
| BLOCKER (hérité MIG-03A) | Résilience | Provenance des captures `coro-organisation-urgence.webp` et `coro-alerte-panique-courriel.webp` |
| RÉSERVÉ | Sentinelle Population | Scénario V1 industriel / environnemental et ses images préservés pour MIG-03C ; hero réservé `sentinelle-population-alert-territory.webp` |
