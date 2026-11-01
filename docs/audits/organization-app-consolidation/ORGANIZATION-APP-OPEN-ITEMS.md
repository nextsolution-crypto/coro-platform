# Réserves consolidées

| Réserve | Dernier statut | Type | Impact | Condition de levée | Responsable attendu |
| --- | --- | --- | --- | --- | --- |
| Lecteur d’écran réel | OUVERT — `NOT_VERIFIED` dans les lots concernés | accessibilité | la structure DOM est testée, pas la restitution vocale | campagne NVDA/JAWS/VoiceOver documentée sur parcours prioritaires | QA accessibilité |
| PDF balisé / PDF-UA | OUVERT | accessibilité | PDF lisible mais non garanti aux technologies d’assistance | moteur balisé ou alternative HTML, audit PDF/UA | produit documentaire + accessibilité |
| PGC, PRA, PUE | EXCLUS de l’acceptation documentaire | preuve manquante | ne pas les présenter comme parcours documentaires validés | parcours complet génération→PDF par type | produit + QA |
| Signature réelle / valeur juridique | EXCLUE | fournisseur / juridique | aucune promesse juridique ou fournisseur | fournisseur de test autorisé, preuve réelle, revue juridique | Fondateur + juridique |
| Invitations internes Paramètres | FOURNISSEUR RÉEL NON EXERCÉ | fournisseur | outbox et reprise validées avec simulateur seulement | campagne bornée autorisée vers destinataire de test | exploitation + QA |
| Divergences historiques organisationnelles | OUVERTES PAR DONNÉE | décision métier | valeur canonique laissée en attente, sans perte | confirmation explicite auditée par administrateur | administrateur organisation |
| Géocodage public | DÉSACTIVÉ PAR DÉFAUT | restriction d’exploitation | aucune conversion d’adresse par fournisseur public | décision confidentialité/fournisseur et recette | Fondateur + vie privée |
| OSM | FACULTATIF, SANS SLA | dépendance fournisseur | fond de carte peut être indisponible; liste de repli requise | contrat/SLA distinct si nécessaire | exploitation |
| Objets de stockage orphelins | OUVERT / HORS COUVERTURE | preuve manquante | l’inventaire DB ne prouve pas l’absence d’objets non référencés | inventaire stockage autorisé, sans lecture de contenu | sécurité stockage |
| Catalogue Bibliothèque → Knowledge/AI | `NON_CONNECTÉ` | fonction absente | aucune récupération ni citation du catalogue | adaptateur gouverné et tests portée/provenance/retrait | produit Knowledge |
| Rollback ancien | CONDITIONNEL | sécurité exploitation | certaines images réintroduisent des défauts corrigés | matrice par release, image corrigée ou suspension des routes | release manager |
| Progression/qualité Projet | PARTIEL / sémantique non explicitée | décision métier | indicateur technique présent mais message commercial limité | définition métier et libellés approuvés | produit |
| Dashboard multi-rôle actuel | PREUVE HISTORIQUE LIMITÉE | preuve manquante | correctif présent, mais certains scénarios historiques non rejoués sur le SHA actif | campagne ciblée seulement en cas de changement ou indice de régression | QA produit |

## Contradictions réconciliées

- Les FAIL des audits initiaux Clients, Bâtiments, Carte, Conformité, Bibliothèque, Manuel et Paramètres sont remplacés par leurs rapports de correction/livraison plus récents; l’historique n’est pas supprimé.
- « Quatre images disponibles » n’est plus assimilé à « rollback sûr » : la compatibilité de sécurité est une condition distincte.
- Le catalogue Bibliothèque n’est pas une bibliothèque ProjectFile et n’est pas indexé par Knowledge.
- La recherche guidée du Manuel n’est pas une génération IA.
- L’absence d’objet public parmi les références inventoriées ne couvre pas les objets orphelins hors base.
- Une recette historique présente dans Git ne signifie pas qu’elle a été rejouée sur `91c1313c`.
