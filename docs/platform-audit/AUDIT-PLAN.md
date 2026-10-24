# Audit transversal CORO — registre de vérité

## Mandat et périmètre

Inventorier toutes les fonctions déclarées du backend, de l’application interne,
du portail et du site public, puis attacher des preuves de bout en bout avant
toute décision commerciale. Le code source, les tests exécutés, la recette et
la disponibilité commerciale sont quatre niveaux distincts.

Ce premier lot livre un inventaire reproductible, une matrice exhaustive des
routes déclarées, un plan de parcours et le manuel V1. **Ce n’est pas une
certification E2E de 843 endpoints.** Les lignes sans preuve restent ouvertes.
Le nombre exact est recalculé par `node ops/platform-audit/inventory.mjs`.

## Livrables

- MODULE-MATRIX.md : modules techniques et tests associés présents.
- FUNCTION-MATRIX.md : chaque endpoint et chaque page inventoriés.
- inventory.json : détails, sources, guards déclarés, limites et état par ligne.
- JOURNEYS.md : campagnes métier et critères d’acceptation.
- evidence.json : résultats réellement exécutés, lorsqu’il existe ; aucun résultat implicite.
- Le manuel dans `/manual`, pour l’application interne et le portail.

## Catégories produit

1. Socle : identités, organisations, droits, MFA, audit, stockage et exploitation.
2. Portefeuille : clients, bâtiments, cartes et projets.
3. Production documentaire : configurateurs, bibliothèques, procédures, génération,
   révision, approbation, versions, export et consultation.
4. Planification et performance : mandats, activités, réservations, planning,
   temps, rendement et indicateurs.
5. Opérations : Sentinelle, présence, évacuation, incidents, résilience.
6. Apprentissage : exercices, rapports, REX et actions correctives.
7. Population : programme, inscription, localisation, consentement, préparation,
   diffusion, réception, suppression, réconciliation et fin d’alerte.
8. Knowledge, CORO AI et aide à l’utilisation.
9. Commercial : catalogue, tarifs, offre, contrat, abonnement, facturation et droits.
10. Extensions : Network, Campus et intégrations externes, selon leur autorité actuelle.
11. Site public : navigation, contenu, formulaires, liens et promesses produit.

Le regroupement automatique des modules est indicatif. Un module technique
NestJS n’est pas nécessairement un module commercial autonome.

## Décisions et conditions

| Décision | Signification | Preuve obligatoire |
|---|---|---|
| COMMERCIALISABLE | Usage cible défini et parcours complet validé sur une release identifiée | E2E positif et négatif, accès, persistance, reprise, exploitation, documentation et autorité commerciale/juridique approuvées |
| COMMERCIALISABLE_SOUS_CONDITIONS | Périmètre vendable explicitement réduit | mêmes preuves sur ce périmètre, exclusions et conditions de service écrites |
| AMELIORABLE | Fonction utilisable avec limites non bloquantes démontrées | E2E du périmètre courant et backlog d’amélioration |
| A_CORRIGER | Défaut reproduit empêchant un critère requis | reproduction, gravité, impact et correction à vérifier |
| A_DEVELOPPER | Capacité souhaitée absente ou incomplète | écart fonctionnel décrit et critères futurs |
| FUTUR_NON_VENDABLE | Registre ou décision produit exclut la vente actuelle | référence à l’autorité commerciale |
| A_VALIDER | Preuve insuffisante | aucune supposition de réussite ni d’échec |
| HORS_PERIMETRE | Exclusion explicite décidée | décision, propriétaire et raison |

Le statut technique n’active aucun Entitlement et ne modifie aucun prix,
contrat, permission ou registre commercial. `CURRENT/AVAILABLE` n’est pas
équivalent à `COMMERCIALISABLE`. Les registres existants de capacités et de
packaging restent les autorités : Network et Campus sont encore `FUTURE` et
`NOT_AVAILABLE` dans la base auditée ; plusieurs familles ont une politique
de packaging incomplète. La validité juridique d’une clause reste une décision humaine.

## Fiche obligatoire pour chaque fonction/parcours

ID stable ; catégorie ; module ; utilisateur cible ; besoin ; préconditions ;
écrans et API ; données d’entrée ; actions ; résultat attendu ; état en base ;
traces ; permissions ; refus inter-organisation/inter-bâtiment ; échec fournisseur ;
reprise/idempotence ; mobile/clavier ; dépendances ; preuve horodatée ; release ;
état technique ; état commercial ; limites ; priorité ; responsable ; prochaine action.

Les champs absents sont `NOT_VERIFIED` ou `NOT_ASSESSED`, jamais PASS.
Un test unitaire valide son assertion, pas automatiquement toutes les fonctions
du dossier voisin. Les preuves d’une ancienne release sont historiques tant
que leur portée et leur non-régression n’ont pas été rapprochées du code courant.

## Exécution sans perturber l’exploitation

Commencer par les tests isolés existants et les contrôles de lecture seule.
Les campagnes multi-acteurs utilisent les identités synthétiques et la base
jetable de `qa/global-e2e`, jamais de JWT forgé pour la production. Pour les
communications, utiliser les fournisseurs simulés. Tout essai LIVE reste une
campagne distincte sur destinataires contrôlés et avec les autorisations d’envoi
appropriées. Ne pas provoquer une urgence, accepter un contrat, accorder des
droits ni modifier un dossier client réel pour fabriquer une preuve d’audit.

La recette Knowledge de la release 722 (17 cas + 2 contrôles finaux) constitue
une preuve historique précise de ce chantier, pas celle des autres modules.

## Manuel et gouvernance

Le catalogue `user-manual.catalog.ts` contient uniquement des instructions produit
versionnées et reliées à des fichiers source. Le serveur filtre le public interne
ou client avant liste, lecture directe et recherche. Les contrôles d’accès métier
restent appliqués par la destination et ne sont jamais contournés par le manuel.

L’aide CORO AI du manuel est volontairement extractive : elle restitue des
articles existants avec version et empreinte, sans génération libre, sans appel
AWS et sans recherche dans les documents clients. Elle n’invente pas de procédure
pour une fonction absente. Les ProjectFile restent l’unique autorité des documents
opérationnels clients. La recherche documentaire Knowledge conserve son flux séparé.

Le manuel V1 couvre les principaux parcours de repérage et les transitions
documentaires validées. Il ne prétend pas décrire les 843 endpoints un par un.
Chaque nouvelle fonction doit ajouter son article, ses préconditions, ses limites
et sa preuve de recette. Une modification du comportement impose la révision de
l’article et de sa version avant publication.
