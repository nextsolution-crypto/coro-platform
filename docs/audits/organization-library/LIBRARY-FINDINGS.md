# Constats — Bibliothèque organisation

Audit du candidat `65f58ddb10b3eb61878627d33bb5befc385499df`, avec référence produit active `cedbcbf40db4279ac6d7dec82dc58ec6f5976a38`.

| ID | Sévérité | Statut | Constat démontré | Impact | Condition de levée |
|---|---|---|---|---|---|
| LIB-SEC-01 | Critique | CORRIGÉ | Les routes globales ambiguës échouent désormais avec 403 sans écriture. | Aucun faux droit global attribué. | Décision métier requise avant toute future administration globale. |
| LIB-INT-01 | Élevée | CORRIGÉ | Le chemin de persistance déconnecté a été retiré du service; le catalogue reste code-versionné et en lecture seule. | Aucun faux succès futur; historique préservé. | Inventorier l’historique seulement si une autorité globale administrable est approuvée. |
| LIB-SEC-02 | Critique | CORRIGÉ_CODE | Les deux lectures contextualisées appliquent `projectAccessWhere(actor)` avant les overrides. | Un identifiant seul ne suffit plus. | Acceptation PostgreSQL/Chrome finale. |
| LIB-SEC-03 | Critique | CORRIGÉ_CODE | Custom procedures résout le projet parent avant lecture, génération, import, duplication ou mutation. | Refus avant appel IA ou écriture. | Acceptation PostgreSQL/Chrome finale. |
| LIB-UX-01 | Moyenne | CORRIGÉ_CODE | Chargements indépendants, alerte accessible et bouton Réessayer. | Une panne partielle n’est plus présentée comme un catalogue vide. | Recette Chrome 12/12 finale. |
| LIB-SCOPE-01 | Élevée | CONFIRMÉ | `/library` expose trois catalogues globaux (28 codes, 43 rôles, 43 procédures en production), sans fichiers, versions, téléchargement, prévisualisation, provenance ou Knowledge. | Le terme « Bibliothèque centrale » peut laisser croire à une bibliothèque documentaire plus large. | Clarifier le produit/UX ou relier explicitement les autorités documentaires sans les fusionner. |
| LIB-UX-02 | Moyenne | PARTIAL | Les cartes utilisent des retours à la ligne et une grille responsive; aucune recherche, filtre, tri, pagination ni navigation clavier explicite des panneaux de procédure. | Exploitation lente à 43+ entrées; preuve 12 configurations non exécutée dans ce lot. | Recette Chrome synthétique 12/12 et critères clavier/focus; ajouter les fonctions seulement après décision produit. |
| LIB-KNOW-01 | Élevée | NON_CONNECTÉ | Knowledge et CORO AI authentifié ne recherchent que les chunks ProjectFile; l’assistant public utilise son corpus public séparé. | Le catalogue n’est ni récupéré ni cité; le privé reste absent du public. | Adaptateur gouverné distinct si le besoin est approuvé. |
| LIB-DOC-01 | Moyenne | NOT_APPLICABLE | L’écran ne possède aucun objet téléchargeable ni accès au stockage privé. | Les critères téléchargement/intégrité ne peuvent pas être attribués à cette route. | Auditer ProjectFile/Knowledge séparément, sans présenter ce catalogue comme preuve documentaire. |

## Limites d’évidence

- La production a été consultée en lecture seule avec une session autorisée; aucune mutation ni téléchargement.
- Le stack QA complet multi-organisation et la matrice Chrome 12/12 n’ont pas été exécutés. Les défauts d’autorisation sont prouvés par contrats de code et tests de caractérisation, pas par exploitation de données étrangères.
- Aucun fournisseur IA, courriel, SMS ou stockage externe n’a été appelé.
