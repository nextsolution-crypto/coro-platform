# Lot correctif proposé — fiche Incident

## Lot unique recommandé

1. **Autorité et contrats**
   - DTO de détail minimal et projections permissionnées;
   - garde parent Incident partagée par toutes les sous-ressources et par les deux contrôleurs;
   - acteur/date/organisation/bâtiment attribués exclusivement côté serveur.
2. **Machine d'états et concurrence**
   - transitions explicites approuvées;
   - motifs obligatoires;
   - `lockVersion`, idempotency key et mises à jour conditionnelles;
   - transaction statut + audit + journal + tâches + outbox.
3. **Chronologie et REX**
   - provenance typée, `occurredAt`/`recordedAt`, ordre stable;
   - REX versionné, date serveur et audit;
   - rendu et export avec échappement.
4. **Fiche opérationnelle**
   - marqueur exercice, statut, responsable, dernière mise à jour et conséquences des actions;
   - erreurs 403/404/503 distinctes, reprise et conservation de saisie;
   - validation défensive des snapshots;
   - cibles 44 px et tokens Glass.
5. **Export**
   - qualifier le besoin PDF séparément; en attendant, ne pas présenter l'impression HTML comme PDF officiel;
   - supprimer les claims non gouvernés et couvrir XSS/statuts.

## Critères d'acceptation

- zéro champ secret dans le contrat de détail;
- aucune usurpation d'acteur/date;
- transitions répétées/concurrentes : un effet au plus;
- panne injectée : aucune écriture partielle;
- refus enfant/parent inter-tenant et hors bâtiment sans effet;
- 503 visible et récupérable, aucune fausse absence;
- 12/12 Chrome, cibles 44 px, thèmes effectifs;
- régressions tâches/historique et liste Incident conservées;
- lecteur d'écran réel suivi séparément.

## Décisions métier nécessaires

- machine d'états terminale et éventuelle réouverture;
- motif requis pour containment;
- statut des tâches incomplètes à la résolution;
- portée contractuelle de l'export et des claims de conformité.

Verdict du lot d'audit : `CORRECTION_REQUISE`; aucun correctif produit, push, PR, fusion ou déploiement n'a été effectué.
