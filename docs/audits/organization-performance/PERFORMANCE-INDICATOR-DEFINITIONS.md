# Définitions des indicateurs Rendement

Audit du candidat documentaire `98eedfdd4adcb3aa1f4614f17bf25a6d0beb525d`, dont le code applicatif est identique au SHA production `c41e05b891cdcfcc23a1a64e27278ca942d417fe`.

## Autorités de données

| Indicateur | Autorité | Formule | Période et fuseau | Données manquantes |
|---|---|---|---|---|
| Heures opérationnelles | `TaskTimeEntry.heures` relié à `ProjectTask` puis `Project` | somme des heures par `User` | dates civiles inclusives `from` et `to`, converties en intervalle `[début, lendemain de to[` dans `America/Toronto` | aucun conseiller retourné si aucune entrée |
| Activités | `ProjectTask.activity` | nombre d’identifiants d’activité distincts | même période que les heures | une tâche sans activité n’ajoute rien |
| Mandats avec participation | `Project.mandate`, repli sur `Project.id` | nombre de mandats/projets distincts ayant au moins une entrée | même période que les heures | un projet sans mandat compte comme participation projet |
| Montant vendu validé | `ProjectMandate.soldAmountDecimal`, devise et dates gouvernées | somme par devise | cumulative, portefeuille vendu, ou filtre `asOf` selon l’API | incomplet si montant, devise ou validation absents |
| Coût de main-d’œuvre connu | `TaskTimeEntry.heures × AdvisorInternalCostRate.hourlyCost` | somme par entrée avec taux approuvé/supplanté applicable à sa date | date civile Toronto; intervalle de taux semi-ouvert | entrée sans taux : raison explicite et mandat incomplet |
| Marge contributive | montant vendu validé − coût connu | calculée uniquement pour un mandat complet et hors vue `work-period` | cumulative | `null` si incomplet; aucun zéro inventé |
| Pourcentage de marge | marge ÷ montant vendu × 100 | arrondi `ROUND_HALF_UP` à 2 décimales | cumulative | `null` si montant nul, manquant ou mandat incomplet |
| Mandat déficitaire | marge strictement négative | décompte unique de mandats complets | cumulative | `null` si marge non calculable |

Les montants utilisent `Prisma.Decimal` et sont transmis sous forme de chaînes à deux décimales. Les heures restent des `Float` et l’interface les présente à une décimale.

## Contrat TaskTimeEntry / TimelogEntry

`TaskTimeEntry` est l’unique source actuelle de Rendement. `TimelogEntry` est le registre autonome du module Timelog et n’est ni joint ni additionné. Le test synthétique place 99 heures dans `TimelogEntry` et 8 heures dans `TaskTimeEntry`; Rendement retourne 8 heures. Il n’y a donc pas de double comptage technique entre les deux tables. En revanche, une saisie métier parallèle dans les deux modules reste possible et le produit doit continuer d’expliquer que Timelog n’alimente pas Rendement.

## Limites temporelles

- `to` est inclus par conversion vers le début du lendemain, ce qui couvre correctement les changements d’heure de Toronto.
- `asOf` limite les entrées de temps, mais ne reconstruit pas un état historique immuable du montant vendu ni des taux tels qu’ils étaient connus à cette date.
- Le filtre `userId` financier sélectionne les mandats auxquels l’utilisateur a participé; le coût du mandat conserve ensuite toutes les entrées de tous les conseillers. Ce n’est pas une marge individuelle.

