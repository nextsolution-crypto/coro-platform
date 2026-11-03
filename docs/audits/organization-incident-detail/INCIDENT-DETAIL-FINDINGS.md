# Constats — fiche Incident

| ID | Gravité | Classe | Scénario / observé | Attendu / impact | Preuve | Correction proposée |
|---|---|---|---|---|---|---|
| ID-01 | Critique | Défaut reproduit | `GET detail` renvoie `publicAccessToken`, snapshots occupants/équipe et fiche d'intervention complète. | Projection minimale après autorisation; un lecteur ne doit pas recevoir de secret ou données opérationnelles inutiles. | `detail-minimal-projection` FAIL | DTO de détail explicite, sous-projections selon permission, jamais de jeton public. |
| ID-02 | Critique | Défaut reproduit | `POST logs` accepte `actor` fourni par le navigateur; « Présidente usurpée » est persisté. | Acteur, type, identifiant et date attribués par le serveur et audités. | `server-owned-log-author` FAIL | DTO strict; ignorer les champs techniques client; transaction log + audit canonique. |
| ID-03 | Élevée | Défaut reproduit | Deux appels `contain` réussissent et créent deux journaux. | Transition source validée, verrou optimiste/idempotence, un seul effet. | `contain-idempotency` FAIL | Machine d'états partagée, `lockVersion`/clé d'idempotence et écriture conditionnelle. |
| ID-04 | Élevée | Défaut reproduit | `resolve` sans motif réussit et clôt l'incident. | Motif obligatoire et état source autorisé; refus sans effet. | `resolution-reason-required` FAIL | DTO validé et transaction conditionnelle statut+audit+tâches+outbox. |
| ID-05 | Élevée | Défaut reproduit | REX accepte `rexCompletedAt=2001-01-01` fourni par le navigateur. | Date de complétion détenue par le serveur; état et version requis. | `server-owned-rex-date` FAIL | DTO métier sans date technique, provenance et verrou. |
| ID-06 | Élevée | Risque statique | Contrôleur Organisation `detail` applique seulement organisation+permission, sans autorité bâtiment explicite. | Même portée bâtiment pour liste et lecture directe. | Code `IncidentController.detail` | Résoudre le parent serveur puis appliquer l'autorité canonique INCIDENT_READ. |
| ID-07 | Élevée | Défaut reproduit | Une 503 devient « Incident introuvable », sans alerte ni réessai. | États 403/404/503 distincts, reprise et aucune fausse absence. | Capture `503-state.png` | État d'erreur typé, `role=alert`, bouton réessayer et conservation du contexte. |
| ID-08 | Élevée | Risque statique + panne QA | Les snapshots sont des `Json`; un objet `teamSnapshot` fait tomber toute la fiche (`.map` non protégé). | Validation/normalisation serveur et garde UI. | Page Next « This page couldn't load » | Schéma de snapshot versionné et parsing défensif. |
| ID-09 | Élevée | Risque statique | Export « PDF » interpole sans échappement description, logs, REX et tâches dans un HTML, puis imprime localement. | Échappement systématique, génération gouvernée; aucune exécution de contenu stocké. | `handleExportPdf` | Générateur sûr, tests XSS; renommer tant qu'il ne produit pas un PDF gouverné. |
| ID-10 | Moyenne | Défaut reproduit | Un exercice s'affiche comme un incident ordinaire; aucun statut, responsable ou fraîcheur visibles. | Mode réel/exercice, état actuel, responsabilité et dernière mise à jour explicites. | 12 captures, champs `has* = false` | Bandeau canonique et données de provenance. |
| ID-11 | Moyenne | Défaut reproduit | Cibles tactiles à 20/40 px; 12/12 configurations échouent. | Minimum Design System 44 px. | Mesures Chrome | Styles partagés, focus et cibles 44 px. |
| ID-12 | Moyenne | Défaut reproduit | Glass Light/Dark conservent `data-ui=legacy`; la fiche reste visuellement classique. | Thèmes appliqués ou portée explicitement déclarée. | Rapport navigateur | Migrer la fiche vers les tokens V2 ou documenter l'exclusion. |
| ID-13 | Moyenne | Risque statique | Chronologie triée seulement par `timestamp`; deux événements au même instant n'ont pas de départage contractuel. | Ordre déterministe (`timestamp`, séquence/id) et distinction survenue/enregistrement. | `timeline-deterministic-tie-break` | Ajouter séquence/occurredAt/recordedAt et ordre stable. |
| ID-14 | Moyenne | Risque statique | Libellés PDF réduisent les statuts non RESOLVED/CONTAINED à « EN COURS » et affichent des claims de conformité non gouvernés. | Chaque statut canonique propre; claims seulement démontrés. | Inspection `handleExportPdf` | Map exhaustive et registre de claims. |

## Limites

- Notifications/fournisseurs : frontière inspectée, aucun envoi réel; la reprise worker n'est pas revendiquée.
- Lecteur d'écran réel : `NOT_VERIFIED`.
- Observation production : `NOT_VERIFIED`.
