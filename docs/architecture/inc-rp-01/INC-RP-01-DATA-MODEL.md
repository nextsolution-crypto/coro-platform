# INC-RP-01 — Modèle de données Lot 1

| Modèle | Responsabilité |
|---|---|
| `IncidentReport` | identité, portée, état courant, rétention et lien Incident facultatif |
| `IncidentReportVersion` | contenu structuré, provenance, empreinte, auteur et immutabilité |
| `IncidentReportTemplateVersion` | schéma/formulaire/catalogue versionnés |
| `IncidentReportAttachment` | stockage privé, SHA-256, MIME, taille et antivirus |
| `IncidentReportApproval` | décision et acteur réel idempotents |
| `IncidentReportExport` | rendu serveur, manifeste et empreinte |
| `ExternalSourceReference` | objet source opaque, valeur originale et état de mapping |
| `IncidentReportRetentionPolicy` | conservation configurable par organisation/type |
| `IncidentReportAuditEvent` | journal append-only de l'agrégat |

Chaque modèle porte `organizationId`; les références rapport, version,
bâtiment, modèle, rétention et incident utilisent une clé composite lorsque
possible. Les index de liste imposent un ordre déterministe par date et `id`.

Le Lot 1 ne livre aucune route publique : le feature flag reste désactivé. Le
Lot 2 ajoutera les services transactionnels et projections minimales.
