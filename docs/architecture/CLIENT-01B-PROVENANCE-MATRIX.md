# CLIENT-01B — Matrice de provenance typée

Référence applicative initiale : `2be902e3b8bda40504b0f8ebd6c96723008ed468`.

Cette matrice précède toute évolution du schéma. CLIENT-01B utilise une stratégie
expand-and-contract : les colonnes historiques restent intactes, tandis que les
nouvelles références typées ajoutent deux clés étrangères exclusives et
vérifiables (`User` ou `ClientUser`). Le type et l'identifiant sont toujours
issus du contexte d'authentification serveur.

| Domaine | Modèle | Rôle de provenance | État initial | Cible CLIENT-01B |
|---|---|---|---|---|
| Report | `IncidentReport` | créateur, soumissionnaire, réviseur assigné | créateur/soumissionnaire polymorphes non vérifiables; réviseur `User` | références exclusives `User`/`ClientUser`, organisation et bâtiment figés |
| Report | `IncidentReportVersion` | créateur, dernier modificateur/correcteur | polymorphe non vérifiable | acteur typé avec FK composite tenant |
| Report | `IncidentReportAttachment` | auteur, auteur de révocation | auteur polymorphe; révocation sans type | deux provenances typées distinctes |
| Report | `IncidentReportApproval` | réviseur/approbateur | polymorphe non vérifiable | acteur typé avec FK; séparation avec le créateur de version |
| Report | `IncidentReportExport` | demandeur | polymorphe non vérifiable | demandeur typé avec FK composite |
| Report | `IncidentReportAuditEvent` | acteur de l'action | polymorphe non vérifiable | audit append-only avec acteur typé et FK |
| Main courante | `OperationalLogEntry` | auteur | `User` obligatoire | acteur typé; ancienne FK conservée pendant la transition |
| Main courante | `OperationalLogEntryRevision` | auteur de correction | `User` obligatoire | acteur typé et immuable |
| Main courante | `OperationalLogAuditEvent` | acteur d'association/audit | `User` obligatoire | audit append-only typé |
| Quarts | `OperationalShift` | responsable, créateur, fermeture, annulation | `User` | provenance typée pour les actions; responsables typés |
| Quarts | `OperationalShiftParticipant` | participant | `User` | sujet typé exclusif |
| Quarts | `OperationalShiftHistory` | auteur d'état | `User` | acteur typé append-only |
| Relève | `OperationalHandover` | sortant, entrant | `User` | sujets typés exclusifs |
| Relève | `OperationalHandoverAction` | soumission, accusé, réserve, refus | `User` | acteur typé append-only |
| Consignes | `OperationalDirective` | créateur, approbateur, publieur, révocateur | créateur/approbateur `User`; autres implicites | provenances typées distinctes |
| Consignes | `OperationalDirectiveVersion` | auteur/réviseur | `User` | acteur typé avec référence de version |
| Consignes | `OperationalDirectiveReceipt` | destinataire, auteur de confirmation | destinataire `User`; confirmation implicite | destinataire typé et confirmation typée |
| Suivis | `OperationalFollowUp` | créateur, responsable, exécutant, vérificateur, fermeture, réouverture | créateur/responsable/vérificateur `User`; autres implicites | sujets et actions typés distincts |
| Suivis | `OperationalFollowUpEvent` | acteur de transition | `User` | acteur typé append-only |

## Invariants communs

- Types autorisés : `USER`, `CLIENT_USER`.
- Exactement une FK d'identité doit être renseignée et correspondre au type.
- La FK inclut `organizationId`; une identité d'un autre tenant est impossible.
- Les modèles rattachés à un bâtiment conservent leurs FK composites bâtiment/organisation.
- Les versions, décisions et événements figés ne permettent aucune modification de provenance.
- Les colonnes historiques ne sont ni supprimées ni réattribuées dans CLIENT-01B.
- Le code métier reçoit un `CoroAuthority` construit par les stratégies/guards serveur;
  aucun DTO navigateur ne contient de type ou d'identifiant d'acteur.

## Compatibilité historique

Les lignes historiques `USER` sont reliées à leur `User` existant par une mise à
jour additive déterministe. Les identifiants, dates, auteurs et décisions
originaux ne changent pas. Les contraintes strictes s'appliquent aux nouvelles
écritures; les triggers d'immuabilité protègent ensuite les provenances figées.
Les anciennes colonnes seront retirées uniquement dans un futur lot contract,
après vérification de l'absence de lecteurs historiques.
