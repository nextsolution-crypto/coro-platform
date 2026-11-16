# INC-RP-01 — Architecture du moteur de rapports Incident gouvernés

## Décision

Créer un agrégat documentaire distinct de `IncidentEvent`. Un rapport peut
référencer un incident, mais reste utilisable sans Sentinelle. Le journal
opérationnel demeure une source; il n’est jamais réécrit par le rapport.

## Modèle conceptuel

- `IncidentReport` : organisation, bâtiment, incident facultatif, type,
  statut, modèle courant et politique de conservation.
- `IncidentReportVersion` : numéro monotone, contenu structuré, auteur typé,
  empreinte, date serveur et statut immuable après soumission.
- `IncidentReportTemplateVersion` : modèle versionné et publié; aucune mutation
  rétroactive des rapports.
- `IncidentReportAttachment` : stockage privé, provenance, MIME, taille,
  SHA-256, état antivirus et version de rapport.
- `IncidentReportApproval` : décision, acteur réel, rôle, commentaire,
  version et horodatage serveur.
- `IncidentReportExport` : export serveur immuable, format, empreinte, objet de
  stockage, moteur/révision et manifeste de sources.
- `ExternalSourceReference` : système source (dont Reportperfect), identifiant
  opaque, date d’import, empreinte et métadonnées minimales.

Chaque relation porte `organizationId`; bâtiment et incident sont vérifiés dans
la même organisation. Les contraintes composites empêchent les références
inter-tenant. Les pièces jointes et exports utilisent le stockage privé existant
avec URLs temporaires autorisées.

## Cycle de vie

`DRAFT → SUBMITTED → IN_REVIEW → APPROVED → PUBLISHED → SUPERSEDED/ARCHIVED`.
Un rejet retourne une nouvelle version en brouillon; il ne modifie pas la
version soumise. La séparation créateur/approbateur est configurable mais
imposée par défaut. Toute décision est transactionnelle et auditée.

## API proposée

- `POST /incident-reports`
- `GET /incident-reports` et `GET /incident-reports/:id`
- `POST /incident-reports/:id/versions`
- `POST /incident-reports/:id/submit`
- `POST /incident-reports/:id/review`
- `POST /incident-reports/:id/approve`
- `POST /incident-reports/:id/reject`
- `POST /incident-reports/:id/attachments`
- `POST /incident-reports/:id/exports`
- `GET /incident-reports/:id/exports/:exportId`

Tous les corps utilisent des DTO stricts, des clés d’idempotence et une version
attendue. Les listes sont paginées, déterministes et filtrées avant pagination.

## Permissions proposées

- `INCIDENT_REPORT_READ`
- `INCIDENT_REPORT_CREATE`
- `INCIDENT_REPORT_EDIT`
- `INCIDENT_REPORT_REVIEW`
- `INCIDENT_REPORT_APPROVE`
- `INCIDENT_REPORT_EXPORT`
- `INCIDENT_REPORT_ADMIN`

Elles complètent l’autorité plateforme et une affectation active au bâtiment;
elles ne sont pas dérivées automatiquement de droits Sentinelle.

## Knowledge, historique et exports

Seules les versions publiées, admissibles et non retirées sont projetées dans
Knowledge. Les citations pointent vers la version et la pièce source exactes.
Les imports Reportperfect conservent la provenance et ne deviennent jamais
« natifs CORO » silencieusement. Les exports sont produits côté serveur; une
impression navigateur reste une commodité non probante.

## Ordre de développement

1. Modèles, contraintes composites, permissions et audit.
2. Brouillons/versioning et import historique.
3. Pièces jointes privées et antivirus.
4. Soumission, revue et approbation.
5. Export serveur et manifestes d’intégrité.
6. Projection Knowledge et citations.
7. UX portail et reprise contrôlée.

Estimation : 4 à 6 semaines de développement et QA intégrée, hors migration de
données historiques. Les migrations sont à préparer sur une branche dédiée et
ne font pas partie d’INC-SEC-01.
