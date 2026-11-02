# Réserves consolidées

| Réserve | Dernier statut | Type | Impact | Condition de levée | Responsable attendu |
| --- | --- | --- | --- | --- | --- |
| Lecteur d’écran réel | OUVERT — `NOT_VERIFIED` dans les lots concernés | accessibilité | la structure DOM est testée, pas la restitution vocale | campagne NVDA/JAWS/VoiceOver documentée sur parcours prioritaires | QA accessibilité |
| PDF balisé / PDF-UA | EXCLU V1 — `PDF_UA_EXCLU_V1` | décision contractuelle | aucune certification PDF/UA revendiquée; HTML accessible, métadonnées et texte extractible conservés | chantier futur distinct seulement si le périmètre contractuel évolue | produit documentaire + accessibilité |
| PGC, PRA, PUE | EXCLUS de l’acceptation documentaire | preuve manquante | ne pas les présenter comme parcours documentaires validés | parcours complet génération→PDF par type | produit + QA |
| Signature réelle / valeur juridique | EXCLUE | fournisseur / juridique | aucune promesse juridique ou fournisseur | fournisseur de test autorisé, preuve réelle, revue juridique | Fondateur + juridique |
| Invitations internes Paramètres | BLOQUÉ — COLLISION `info@getcoro.io` | fournisseur / identité | création QA refusée avant mutation et outbox; liste inchangée; aucune réception attendue | autoriser un destinataire QA distinct ou un alias; préserver le compte existant | Mathieu + exploitation + QA |
| Divergences historiques organisationnelles | OUVERTES PAR DONNÉE | décision métier | valeur canonique laissée en attente, sans perte | confirmation explicite auditée par administrateur | administrateur organisation |
| Géocodage public | DÉSACTIVÉ PAR DÉFAUT | restriction d’exploitation | aucune conversion d’adresse par fournisseur public | décision confidentialité/fournisseur et recette | Fondateur + vie privée |
| OSM | FACULTATIF, SANS SLA | dépendance fournisseur | fond de carte peut être indisponible; liste de repli requise | contrat/SLA distinct si nécessaire | exploitation |
| Objets de stockage candidats | SUIVI DISTINCT — 116 CANDIDATS, AUCUN ORPHELIN DÉMONTRÉ | preuve manquante | aucune suppression autorisée; rapprochement historique individuel requis | critères de `STORAGE-CANDIDATE-QUALIFICATION-PLAN.md` satisfaits et décision distincte | responsable : sécurité stockage; contributeurs : propriétaire applicatif et exploitation |
| Catalogue Bibliothèque → Knowledge/AI | DÉPLOYÉ / RÉCONCILIÉ / CITATION CHROME PASS | capacité livrée | source PC014 ouvrable, portée/version/SHA vérifiés après F5; AWS déjà affiché actif, sans activation dans ce mandat | aucune pour la citation; génération réelle, coût et disponibilité restent distincts | produit Knowledge |
| Rollback ancien | CONDITIONNEL | sécurité exploitation | certaines images réintroduisent des défauts corrigés | matrice par release, image corrigée ou suspension des routes | release manager |
| Progression/qualité Projet | CLOS — `PROGRESSION_DÉCLARÉE` DÉPLOYÉE | décision métier | valeur manuelle persistée, explicitement distincte du score qualité | aucune; SHA actif `b0183e56`, inspection `41366771019` | produit |
| Dashboard multi-rôle actuel | PREUVE HISTORIQUE LIMITÉE | preuve manquante | correctif présent, mais certains scénarios historiques non rejoués sur le SHA actif | campagne ciblée seulement en cas de changement ou indice de régression | QA produit |

## Contradictions réconciliées

- Les FAIL des audits initiaux Clients, Bâtiments, Carte, Conformité, Bibliothèque, Manuel et Paramètres sont remplacés par leurs rapports de correction/livraison plus récents; l’historique n’est pas supprimé.
- « Quatre images disponibles » n’est plus assimilé à « rollback sûr » : la compatibilité de sécurité est une condition distincte.
- Le catalogue Bibliothèque demeure une autorité distincte de ProjectFile; il est récupéré par l'autorité de source typée Knowledge sans devenir une bibliothèque ProjectFile.
- La recherche guidée du Manuel n’est pas une génération IA.
- L’absence d’objet public parmi les références inventoriées ne couvre pas les objets orphelins hors base.
- Une recette historique présente dans Git ne signifie pas qu’elle a été rejouée sur `91c1313c`.
