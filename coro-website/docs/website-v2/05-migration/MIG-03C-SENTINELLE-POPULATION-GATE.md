# MIG-03C — Sentinelle Population Gate

Clôture documentaire. Aucune modification de code, de CSS, de métadonnées ni d'image. Sources : baseline, rapports MIG-03C à MIG-03C-E, imports actuels de la page. Toute donnée non établie est notée « NOT ESTABLISHED — NOT REQUIRED FOR MIGRATION ».

## 1. Scénario préservé
Scénario V1 (fuite d'ammoniac, installation fictive « Prémont », Boucherville) conservé. Dix étapes dans l'ordre : 01 Détection, 02 Mise en œuvre du PUE, 03 Évaluation, 04 Activation du volet population, 05 Population concernée, 06 Message, 07 Diffusion, 08 Suivi, 09 Fin d'alerte, 10 Traçabilité et REX. Texte V1 inchangé, sauf les corrections de vérité approuvées (retrait des allégations de confidentialité d'adresse et de la feuille de route du configurateur PUE ; « SANDBOX » remplacé par « simulation »).

## 2. Approbation visuelle
VISUEL : approuvé après revue humaine de la recomposition en quatre actes (I : 01-03, II : 04-05, III : 06-08, IV : 09-10). LANGUE : FR seulement, vérifiée. SEO : KEEP (revue antérieure). ACCESSIBILITÉ DE LA CARTE : PASS, le sens essentiel figure en HTML et est testé ; ZPI / ZPU / ZSE non définis.

## 3. Matrice des assets (19 images V1, `public/images/sentinelle_population/`, préfixe `sentinelle-population-`)

| Asset | Dimensions | Rôle V1 / étape | Utilisé en V2 ? | Nature | Données visibles (résumé) | Décision | Statut de publication | Raison |
|---|---|---|---|---|---|---|---|---|
| `fuite-ammoniac` | 1466×1073 | 01 Détection | Oui | Illustration générée (scène de site) | Étiquette NH₃ | KEEP WITH REVIEW | REVIEW | Scène fictive |
| `activation-pue` | 1536×1024 | 02 Mise en œuvre du PUE | Oui | Illustration générée, interface inventée | « Prémont », Boucherville, scénario UE-03, date | KEEP WITH REVIEW | REVIEW | Interface non réelle, jamais présentée comme preuve |
| `zone-impact` | 1536×1024 | 03 Évaluation | Oui | Illustration générée avec carte | Zones, « Prémont », Boucherville | KEEP WITH REVIEW | REVIEW | Carte illustrative |
| `dashboard` | 1536×1024 | 04 Activation du volet population | Oui | Illustration générée, interface inventée | « Martin Gagnon », « Prémont », carte | KEEP WITH REVIEW | REVIEW | Interface non réelle |
| `zone` | 1536×1024 | 05 Population concernée | Oui | Illustration générée avec carte | Adresse d'apparence réelle (Boucherville), zones 0-1 / 1-3 / 3-5 km, 28 500 personnes, « Martin Gagnon » | REPLACE BEFORE GO-LIVE | **PUBLICATION-BLOCKER** | Adresse à confirmer, remplacer ou assainir |
| `messages` | 1536×1024 | 06 Message | Oui | Illustration générée, interface inventée | 48 890 / 36 220 / 8 470 / 4 200, « Martin Gagnon » | KEEP WITH REVIEW | REVIEW | Interface non réelle |
| `diffusion` | 1536×1024 | 07 Diffusion | Oui | Illustration générée, interface inventée | Effectifs par zone, canaux | KEEP WITH REVIEW | REVIEW | Interface non réelle |
| `incident` | 1536×1024 | 08 Suivi | Oui | Illustration générée, interface inventée | INC-2026-0814-001, « Martin Gagnon », effectifs | KEEP WITH REVIEW | REVIEW | Interface non réelle |
| `fin-alerte` | 1536×1024 | 09 Fin d'alerte | Oui | Illustration générée (scène de salle) | « Prémont », décompte de messages | KEEP WITH REVIEW | REVIEW | Scène fictive |
| `tracabilite` | 1536×1024 | 10 Traçabilité et REX | Oui | Illustration générée, interface inventée | 42 événements, 28 450 messages, 48 890 personnes | KEEP WITH REVIEW | REVIEW | Interface non réelle |
| `portail` | 1536×1024 | Portail citoyen | Oui | Illustration générée, interface inventée | « Prémont », zones 1-3-5 km | KEEP WITH REVIEW | REVIEW | Interface non réelle |
| `intervention` | 1536×1024 | Écosystème d'intervention | Oui | Illustration générée (scène) | « Prémont », « Poste de commandement » | KEEP WITH REVIEW | REVIEW | Scène fictive ; le texte n'affirme aucune intégration |
| `hero-ammoniac` | 1672×941 | Ancien hero V1 | Non (image OG seulement) | Infographie générée | Titre incrusté, scénario UE-03 | KEEP WITH REVIEW | REVIEW | Image OG ; hero V2 = `website-v2/sentinel/sentinelle-population-alert-territory.webp` |
| `alerte` | 1536×1024 | Alerte en cours | Non | Illustration générée, interface inventée | Numéro 1 800 363-4735 (attribué à l'urgence environnementale), 48 890 personnes | REJECT | **DO NOT PUBLISH** | Numéro douteux ; non rendue, hors métadonnées, conservée sur disque |
| `alerte-mobile` | 1024×1536 | Alerte reçue sur téléphone | Non | Illustration générée | « Prémont », Boucherville | DEFER | REVIEW | Non requise par la V2 |
| `inscription` | 1536×1024 | Inscription citoyenne | Non | Illustration générée, interface inventée | 1 800 555-0100, courriel de démonstration | DEFER | REVIEW | Non requise |
| `installation` | 1536×1024 | Fiche d'installation | Non | Illustration générée, interface inventée | Téléphone (438) 749-6541, adresse, code postal | DEFER | REVIEW | Non requise ; coordonnées à ne pas publier sans confirmation |
| `registre` | 1536×1024 | Registre d'occupation (thème Sentinelle) | Non | Illustration générée, interface inventée | Noms de personnes, 247 personnes | DEFER | REVIEW | Relève de Sentinelle, pas de Population |
| `rex` | 1536×1024 | Retour d'expérience | Non | Illustration générée (scène de salle) | « Prémont », dates | DEFER | REVIEW | Non requise (couverte par l'étape 10) |

Aucune de ces images n'est une capture réelle du produit et aucune n'est présentée comme preuve.

## 4. Matrice de provenance des données

| Donnée | Asset / étape | Type | Provenance | Statut | Décision Go-Live |
|---|---|---|---|---|---|
| Adresse d'apparence réelle de Boucherville | `zone` / 05 | Adresse | UNCLEAR | **PUBLICATION-BLOCKER** | Remplacer ou assainir |
| Installation « Prémont » | Plusieurs / 01-10 | Nom d'installation | Probablement fictive, non confirmée | PUBLICATION-REVIEW | Confirmer |
| « Martin Gagnon » | `dashboard`, `zone`, `messages` | Nom de personne | Probablement fictif, non confirmé | PUBLICATION-REVIEW | Confirmer |
| 12 400 / 48 890 / 28 500 personnes | Hero, `messages`, `zone` | Effectifs | Probablement fictifs, non confirmés | PUBLICATION-REVIEW | Confirmer |
| Zones 0-1 / 1-3 / 3-5 km | `zone-impact`, `zone` | Distances | Illustratives | PUBLICATION-REVIEW | Libellé « illustratif » présent sous la carte |
| 1 800 363-4735 | `alerte` (non utilisée) | Téléphone | Ne correspond à aucun numéro officiel établi | **DO NOT PUBLISH** | Image non publiée |
| 1 800 555-0100 ; (438) 749-6541 | `inscription`, `installation` (non utilisées) | Téléphones | Non établie | PUBLICATION-REVIEW | Images non utilisées |

## 5. Matrice des canaux

| Canal | CORO direct ? | Externe / coordonné ? | Statut | Formulation publique | Décision |
|---|---|---|---|---|---|
| SMS | Oui | — | Implémenté | « SMS et courriel, auprès des abonnés qui ont consenti » | KEEP |
| Courriel | Oui | — | Implémenté | Idem | KEEP |
| Voix | Non | — | Non implémenté | Non revendiqué | Aucune mention |
| Sirènes | Non | Externe | CORO ne les active pas | « relèvent des autorités et de l’organisation; CORO ne les active pas » | KEEP |
| Réseaux sociaux | Non | Externe | Idem | Idem | KEEP |
| Systèmes municipaux | Non | Externe | Idem | Idem ; FAQ « Remplace-t-il Québec En Alerte? Non » | KEEP |
| Radio | Non | Externe | Non revendiqué | Non mentionné | Aucune mention |
| Porte-à-porte | Non | Externe | Non revendiqué | Non mentionné | Aucune mention |
| Bulletin municipal | Non | Externe | Non revendiqué | Non mentionné | Aucune mention |

## 6. Matrice réglementaire (affirmations retenues)

| Affirmation publique | Source officielle | Appui de la source | État | Décision |
|---|---|---|---|---|
| Le Règlement sur les urgences environnementales (2019), pris sous la Loi canadienne sur la protection de l'environnement (1999), prévoit des éléments relatifs aux environs d'une installation et aux communications avec les membres du public susceptibles d'être touchés | Règlement sur les urgences environnementales (2019), DORS/2019-51, Justice Canada (lien dans la page) | Appuyée par les recherches MIG-03C ; numéro d'article non établi | Conservée de la V1 | PRESERVE |
| « Pensé notamment pour les installations concernées par le Règlement » | Même règlement | Formulation de soutien, pas de conformité | Conservée | PRESERVE |
| « CORO soutient la planification, l’intervention et la traçabilité. Son utilisation ne garantit pas à elle seule la conformité » | — | Prudence explicite | Conservée | PRESERVE |

Confirmé : aucune revendication de conformité ni de certification de CORO ; les obligations RUE/E2 restent à l'organisation réglementée. Le reste est hors périmètre de MIG-03C.

## 7. Capacités et texte public

| Capacité | Statut | Allégation publique ? | Public maintenant ? | Décision |
|---|---|---|---|---|
| Portail citoyen | Existant | Oui, limitée : consentir, confirmer les canaux, enregistrer son secteur | Oui | KEEP |
| Préparation d'alerte | Existant | Oui | Oui | KEEP |
| Flux d'approbation | Existant | Oui | Oui | KEEP |
| Destinataires figés | Existant | Oui (« message figé », « validation humaine ») | Oui | KEEP |
| SMS / courriel | Existants | Oui | Oui | KEEP |
| Statut de livraison | Existant | Oui (« statuts disponibles ») | Oui | KEEP |
| Traçabilité / historique | Existant | Oui | Oui | KEEP |
| Rapport de preuve | Existant | Oui (« preuves disponibles ») | Oui | KEEP |
| Autorités, premiers répondants, rétention, multi-site, seuils de substances | Non audités | Non (seulement « ne remplace pas ») | Non | NOT REQUIRED FOR MIGRATION — NO DEPENDENT PUBLIC CLAIM |
| Configuration de scénario | Existant | Seulement dans le scénario fictif | Limité | NOT REQUIRED FOR MIGRATION — NO DEPENDENT PUBLIC CLAIM |

Préparer — KEEP (préparation de scénarios, zones et messages). Alerter — KEEP (brouillon → approbation → destinataires figés → envoi). Documenter — KEEP (historique et rapport de preuve).

## 8. Go-Live
- **PUBLICATION-BLOCKER :** étape 05, `zone.webp`, adresse d'apparence réelle de Boucherville : remplacer ou assainir avant la mise en ligne.
- **PUBLICATION-REVIEW :** données de démonstration non confirmées des images utilisées.
- **DO NOT PUBLISH :** `alerte.webp`.
- **MIGRATION-BLOCKER :** aucun connu.

## 9. Décision de sortie
Documentation complète. Le blocker de l'étape 05 empêche la mise en production, pas le commit de migration.
