# Qualification des candidats stockage — sans suppression

L’inventaire réconcilie onze autorités applicatives. Un objet absent de l’une d’elles n’est jamais qualifié d’orphelin par ce seul fait.

L’extension prépare, sans lire les corps ni exposer les clés:

- catégories par usage probable (documents projet/bâtiment, PDF officiels/exports, preuves/rapports gouvernés, contrats/propositions, Population/Sentinelle, temporaires/staging, historique non classé);
- compte et octets par catégorie;
- ancienneté par plages `<30`, `30–89`, `90–364`, `≥365 jours` ou inconnue;
- énumération distincte des versions courantes et non courantes, avec octets agrégés;
- maintien du statut `CANDIDATE_REQUIRES_INDIVIDUAL_REVIEW`.

Une future remédiation exige, objet par objet ou groupe démontré homogène: autorité historique retrouvée, politique de rétention applicable, copie distante ou remplacement vérifié, absence d’usage applicatif, retour arrière sans exposition publique, puis autorisation de suppression distincte. Aucune suppression d’objet, version ou sauvegarde n’est contenue dans l’outil.

## Résultat production du 2026-11-01

Workflow `41361883831`, exécution `PASS`, lecture seule et sans capacité de suppression :

- 145 objets courants, 814 284 456 octets;
- 29 objets référencés présents, 0 référence manquante;
- 116 candidats, 690 458 654 octets;
- `UNCLASSIFIED_HISTORICAL`: 60 objets, 33 348 239 octets;
- `PROJECT_OR_BUILDING_DOCUMENT`: 56 objets, 657 110 415 octets;
- 110 objets de 30–89 jours, 6 objets de moins de 30 jours;
- 145 versions énumérées, 0 version non courante.

Conclusion : aucune suppression n'est justifiée automatiquement. La catégorie projet/bâtiment exige un rapprochement historique individuel avec versions, métadonnées et usages applicatifs; la catégorie historique non classée exige l'identification de l'autorité d'origine et de sa rétention. Aucune URL, clé d'objet, donnée personnelle ou contenu n'a été publié.

## Suivi distinct approuvé

- Responsable : sécurité stockage.
- Contributeurs requis : propriétaire de l’autorité applicative historique et exploitation stockage.
- Statut : `CANDIDATE_REQUIRES_INDIVIDUAL_REVIEW` pour les 116 objets; aucun n’est déclaré orphelin.
- Critères de décision : autorité d’origine retrouvée, versions et métadonnées rapprochées, usage applicatif exclu, rétention applicable identifiée, sauvegarde/retour arrière vérifiés et autorisation de suppression distincte.
- Action autorisée dans ce MASTER : conservation et suivi uniquement. Aucune suppression d’objet, de version ou de sauvegarde.
