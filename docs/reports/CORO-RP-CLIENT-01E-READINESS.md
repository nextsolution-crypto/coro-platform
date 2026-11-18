# CORO Report — CLIENT-01E

## Portée livrée

Le portail client expose un poste de sécurité natif à `/security-workstation`.
La navigation n'est proposée que lorsqu'au moins une capacité opérationnelle est
retournée `AVAILABLE` pour un bâtiment effectivement accessible au ClientUser.
Chaque lecture et mutation reste contrôlée par `ClientJwtGuard`, les feature
flags, l'entitlement `SITE`, la permission individuelle, l'affectation active et
l'autorité incident du bâtiment.

| Capacité | Interface | Contrat ClientUser |
| --- | --- | --- |
| Découverte | Cartes disponibles par bâtiment | `GET operational-capabilities` |
| Main courante | Liste, recherche, création, auteurs, actualisation | `operational-log/entries` |
| Quarts | Liste, création, ouverture, préparation de relève | `operational-shifts` |
| Consignes | Liste, création et confirmation | `operations/directives` |
| Suivis | Liste, création, démarrage et complétion avec preuve | `operations/follow-ups` |
| Rapports | Formulaires dynamiques, répétitions, brouillon, pièce jointe, soumission, affectation, révision, correction, approbation, publication et PDF | `incident-reports` |

## Correctif de provenance

Le contrôleur ClientUser d'affectation d'un réviseur utilisait le contrat
interne `reviewerUserId`. CLIENT-01E introduit un contrat portail séparé
`reviewerClientUserId`. La résolution est exclusivement serveur et exige :

- une identité `CLIENT_USER` active;
- la même organisation et le même client;
- une affectation opérationnelle active au bâtiment;
- `INCIDENT_REPORT_REVIEW`;
- l'autorité incident du bâtiment;
- la capacité commerciale `INCIDENT_REPORTS` disponible.

La provenance persistée est `CLIENT_USER`; aucun repli vers `USER` n'est
possible. L'auto-approbation du soumissionnaire demeure refusée.

## UX et responsive

- Desktop : barre d'actions, liste et contexte bâtiment en une vue.
- Tablette/téléphone : panneaux et lignes empilés, onglets défilants, actions
  tactiles.
- Clavier : éléments natifs `button`, `select`, `input`, `textarea` et labels.
- États : chargement, vide, erreur récupérable, succès, capacité indisponible,
  double soumission bloquée localement et idempotence serveur.
- Conflits : message serveur conservé et action d'actualisation offerte.

## Matrice de recette multirôle

| Parcours | Agent | Superviseur/réviseur | Gestionnaire | Non autorisé |
| --- | --- | --- | --- | --- |
| Sélection bâtiment | autorisé si affecté | autorisé si affecté | autorisé si affecté | refus/absence |
| Main courante | lire/créer selon permission | lire/corriger selon permission | consulter | refus serveur |
| Quart/relève | ouvrir/préparer | décider selon permission | consulter | refus serveur |
| Consigne | consulter/confirmer | publier selon permission | consulter | refus serveur |
| Suivi | créer/exécuter | vérifier/clore | consulter | refus serveur |
| Rapport | créer/corriger/soumettre | réviser/approuver | publier/consulter | refus serveur |

Cette matrice doit être rejouée avec des identités ClientUser distinctes et MFA
normal après activation gouvernée du tenant Démo. Aucun PASS navigateur n'est
revendiqué par cette livraison.

## Validation exécutée

- Build NestJS : PASS.
- Build Next.js 16.4.6 : PASS.
- TypeScript portail : PASS.
- Contrat portail CLIENT-01E : PASS.
- 25 tests ciblés backend : PASS (contrôleurs ClientUser, entitlements,
  accès Report, workflow Report, accès main courante et acteurs de quart).
- Aucun schéma Prisma ou migration ajouté.
- Aucune fixture, permission, affectation, entitlement ou notification créée.

## Conditions d'activation Démo

1. Autorisation distincte de créer les six entitlements `SITE` uniquement pour
   les bâtiments Démo canoniques.
2. Activation explicite des cinq feature flags pour ce runtime gouverné.
3. Affectations et permissions minimales de quatre ClientUsers Démo avec MFA.
4. Provisionnement de formulaires et données strictement synthétiques.
5. Recette navigateur multirôle authentifiée complète.
6. Nettoyage limité aux fixtures CLIENT-01E et preuve de refus inter-tenant.

La fusion ou la livraison de cette PR n'autorise aucune de ces opérations.
