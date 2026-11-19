# CORO Report 2.0 — Audit de l’existant

Date de référence : 2026-11-19. Code audité : `2b96176ce94310290b10d25e3a0b64239d0922b6`.

## Méthode de preuve

- **CONFIRMÉ PAR CODE CORO** : contrat, contrainte ou test présent dans le dépôt.
- **CONFIRMÉ PAR SOURCE** : capacité publiée par ControlPerfect ou une brochure historique.
- **À VÉRIFIER SUR EXPORT CLIENT** : format, libellé ou sémantique non démontré publiquement.
- **FONCTION PROPOSÉE** : cible CORO, sans revendication de parité.

## Capacités CORO observées

| Domaine | État réel | Preuve code | Verdict |
|---|---|---|---|
| Modèles versionnés | Versions DRAFT/PUBLISHED/RETIRED, schéma JSON et empreinte | `IncidentReportTemplateVersion` | Opérationnel |
| Types de champs | 21 types, dont personnes, témoins, véhicules, emplacements, équipements et groupes répétables | `incident-report-form-engine.ts` | Opérationnel, rendu UI partiel |
| Conditions | EQ, NEQ, IN, PRESENT, recalcul serveur | moteur de formulaire et tests | Opérationnel, expressivité limitée |
| Validation | Champs requis, nombres, listes, limites des groupes | moteur de formulaire | Opérationnel, contraintes métier avancées absentes |
| Brouillons/versioning | verrou optimiste, idempotence, versions immuables après soumission | services, contraintes PostgreSQL | Opérationnel |
| Pièces jointes | stockage privé, SHA-256, validation binaire, quarantaine/ClamAV, révocation | services de pièces jointes | Opérationnel |
| Workflow | soumission, affectation, révision, correction, approbation, publication | workflow et tests | Opérationnel |
| PDF | export serveur immuable, idempotent, police Unicode incorporée, fuseau vérifié | renderer/export service 1.1.0 | Opérationnel |
| Recherche | pagination et filtres organisation/bâtiment/statut | service rapports | Partiel : recherche plein texte/analytique absente |
| Permissions | 7 permissions, autorité USER/CLIENT_USER, affectation bâtiment | access service, contrôleurs | Opérationnel |
| Conservation | politiques par type, legal hold | modèle Prisma | Fondations présentes |
| Audit/provenance | acteur typé, événements, empreintes, manifeste | modèles et services | Opérationnel |
| Historique externe | référence source et enveloppe non mappée | `ExternalSourceReference`, `legacyPayload` | Fondations seulement |
| Import Reportperfect | aucun téléversement, parseur, staging, batch, reprise ou rollback | absence de service/route/import job | Non développé |
| UX progressive | formulaire dynamique et groupes répétables | portail `security-workstation` | Partiel : page monolithique, pas d’étapes ni autosauvegarde |
| Bibliothèque | 8 modèles partageant seulement identification + personnes | `INITIAL_INCIDENT_REPORT_TEMPLATES` | Insuffisant pour commercialisation |

## Capacités Reportperfect publiquement documentées

La page officielle ControlPerfect confirme les modèles configurables, champs
obligatoires/facultatifs, listes normalisées, champs conditionnels,
horodatage/auteur, pièces jointes, actions correctives, statuts, commentaires,
audit, rétention, recherche, statistiques et accès par rôle/emplacement. Une
brochure historique annonce plus de 200 champs et une main courante. Ces
capacités ne prouvent ni les noms de colonnes, ni les formats d’export.

Sources :

- https://www.controlperfect.com/fr/produits/reportperfect
- https://www.controlperfect.com/en/products/reportperfect
- https://www.hellopro.fr/documentation/pdf_prod/3/2/1/1011832_cc953e6cf5dc93492ed0d2eed23a17b7.pdf

## Écarts prioritaires

| Priorité | Écart | Décision |
|---|---|---|
| P0 | Import gouverné absent | Construire staging, mapping, preview, batch, reprise, réconciliation et rollback borné |
| P0 | Bibliothèque métier trop générique | Publier 12 modèles détaillés, versionnés et testés |
| P0 | UI non progressive et répétables réduits à du texte | Assistant par sections, autosauvegarde et renderer récursif typé |
| P0 | Aucun export client représentatif | Interdire toute déclaration de parité exacte |
| P1 | Recherche historique limitée | Index contrôlé des champs canoniques, filtres et provenance |
| P1 | Actions correctives non reliées au rapport dans l’UX | Réutiliser suivis/Ops par référence, sans copie |
| P1 | Statistiques/tableaux de bord non couverts | Lot analytique séparé, après qualité des données |
| P2 | Notifications automatiques | Hors activation initiale; gouvernance externe distincte |

## Conclusion

Le socle de preuve et de gouvernance est réutilisable. La parité Reportperfect
est **NOT_VERIFIED**. Le chemin recommandé ajoute les modèles et l’expérience de
saisie avant l’import, puis valide le moteur d’import sur des archives
synthétiques et enfin sur un échantillon client anonymisé autorisé.
