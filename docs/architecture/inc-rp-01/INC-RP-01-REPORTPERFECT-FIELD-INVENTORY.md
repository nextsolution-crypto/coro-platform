# INC-RP-01 — Inventaire des champs Reportperfect

## Portée et niveau de preuve

Cet inventaire est un référentiel de compatibilité, pas une déclaration de
parité. Aucun formulaire ou export client Reportperfect représentatif n'a été
fourni. La parité exacte reste donc **NOT_VERIFIED**.

Niveaux utilisés :

- `CONFIRMED_CURRENT` : documentation officielle ControlPerfect actuelle.
- `CONFIRMED_HISTORICAL` : brochure ou client mobile historique publié.
- `INFERRED` : comportement impliqué, mais libellé/type exact non publié.
- `CORO_PROPOSED` : besoin métier CORO, sans affirmation de compatibilité RP.

## Sources publiques

| Source | Date consultée | Apport | Niveau |
|---|---:|---|---|
| [ControlPerfect — ReportPerfect](https://www.controlperfect.com/en/products/reportperfect) | 2026-11-16 | modèles, champs requis/facultatifs, listes, conditions, pièces jointes, actions, recherche, audit et accès | `CONFIRMED_CURRENT` |
| [ControlPerfect — ReportPerfect (FR)](https://www.controlperfect.com/fr/produits/reportperfect) | 2026-11-16 | terminologie française actuelle | `CONFIRMED_CURRENT` |
| [Brochure historique Reportperfect](https://www.hellopro.fr/documentation/pdf_prod/3/2/1/1011832_cc953e6cf5dc93492ed0d2eed23a17b7.pdf) | 2026-11-16 | plus de 200 champs, personnes/lieux/véhicules, médias et historique | `CONFIRMED_HISTORICAL` |
| [ControlPerfect Mobile — App Store](https://apps.apple.com/us/app/controlperfect-mobile/id1435509728) | 2026-11-16 | formulaires synchronisés, pièces jointes et sélection du lieu | `CONFIRMED_HISTORICAL` |

Les fiches de revendeurs sont utilisées seulement comme pistes. Elles ne
permettent pas de confirmer un nom de champ ou un contrat d'export.

## Capacités et familles de champs documentées

| Élément | Type/forme connue | Fonction | Preuve |
|---|---|---|---|
| Type de rapport | modèle configurable | incident, accident, événement, non-conformité, observation | `CONFIRMED_CURRENT` |
| Champ requis ou facultatif | règle de formulaire | complétude selon le type de rapport | `CONFIRMED_CURRENT` |
| Liste normalisée | liste déroulante | cohérence de saisie et analyse | `CONFIRMED_CURRENT` |
| Champ conditionnel | règle dépendant d'une réponse | afficher seulement les questions pertinentes | `CONFIRMED_CURRENT` |
| Auteur | identification automatique | imputabilité | `CONFIRMED_CURRENT` |
| Horodatage | date/heure automatique | chronologie | `CONFIRMED_CURRENT` |
| Description | texte, libellé exact non publié | recherche par mot-clé et récit | `INFERRED` |
| Date | date/date-heure, libellé exact non publié | recherche et chronologie | `INFERRED` |
| Nom/personne | référence ou texte, contrat non publié | recherche et personnes impliquées | `CONFIRMED_HISTORICAL` |
| Lieu/site/bâtiment/zone | référence hiérarchique | portée et contrôle d'accès | `CONFIRMED_CURRENT` |
| Véhicules impliqués | section répétable, détails inconnus | contexte d'incident | `CONFIRMED_HISTORICAL` |
| Photos, vidéos, PDF, rapports externes | pièces jointes | preuve documentaire | `CONFIRMED_CURRENT` |
| Documents légaux/conformité | pièces jointes classifiées | preuve et conformité | `CONFIRMED_CURRENT` |
| Action corrective/préventive | sous-objet suivi | responsable, progression, fermeture | `CONFIRMED_CURRENT` |
| Statut d'action | ouvert/en cours/fermé | suivi | `CONFIRMED_CURRENT` |
| Commentaires | collection collaborative | échanges et suivi | `CONFIRMED_CURRENT` |
| Classification/priorité | liste/configuration | triage et analyse | `CONFIRMED_CURRENT` |
| Cause et tendance | données d'analyse | prévention et statistiques | `CONFIRMED_CURRENT` |
| Historique des modifications | journal | traçabilité complète | `CONFIRMED_CURRENT` |
| Politique de rétention | configuration | conservation contrôlée | `CONFIRMED_CURRENT` |

## Ce qui n'est pas confirmé

Les libellés précis, identifiants techniques, cardinalités, valeurs de listes,
formats de date, règles de validation, structure d'export et plus de 200 champs
historiques ne sont pas publics de façon suffisante. Ils ne doivent pas être
codés comme équivalents RP. Leur intégration exige un formulaire ou export
client représentatif et une validation de droits d'utilisation.

## Données à demander pour la validation de parité

1. Un export anonymisé avec dictionnaire de colonnes et encodage.
2. Une version de chaque modèle de formulaire réellement utilisé.
3. Les listes de valeurs et règles conditionnelles associées.
4. Un exemple avec personnes, véhicules, pièces jointes et corrections.
5. Les identifiants stables, fuseaux horaires, valeurs nulles et suppressions.
6. La politique de rétention et le mécanisme d'audit du client source.

## Décision

Le moteur CORO doit accueillir les capacités documentées et préserver tout
élément inconnu dans une enveloppe historique. Il ne doit jamais convertir une
inférence en champ « compatible Reportperfect » sans preuve associée.
