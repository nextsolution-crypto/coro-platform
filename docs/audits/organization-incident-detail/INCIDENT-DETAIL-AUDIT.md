# Audit ciblé — fiche Incident et cycle de vie

## Références et environnement

- Branche : `audit/organization-incident-detail`
- Produit et documentation audités : `08e64862b42c5d4f45a86c2a35e17cc077fc1be5`
- Produit actif communiqué : `082f396bf3d6e9ae85c5d47e980d09bac0df13fc` (observation de production non rejouée dans ce lot)
- PostgreSQL 16 jetable : 167 migrations, tête `20261120010000_permanent_qr_codes`
- Images QA construites depuis le HEAD exact : backend et Client Portal
- Réseau : deny-by-default; stockage et fournisseurs simulés; aucune communication externe
- Preuves : `D:\CORO-QA\tracking\organization-incident-detail`

## Périmètre réellement présent

Le Portail Client expose la fiche `/sentinelle/[buildingId]/incidents/[incidentId]`. L'application Organisation expose les API Incident, mais aucune fiche Organisation équivalente n'a été trouvée. La fiche présente l'identification, une procédure figée, l'équipe mobilisée, la chronologie, les tâches gouvernées en lecture, le REX et un export HTML imprimable intitulé PDF.

Les transitions `PRE_ALERT -> ACTIVE`, `PRE_ALERT -> CANCELLED`, `ACTIVE/CONTAINED -> CONTAINED` et `ACTIVE/CONTAINED -> RESOLVED` existent côté API. La réouverture, la création/suppression de tâche depuis la fiche et les pièces jointes Incident sont absentes : `NON_APPLICABLE` dans ce lot. Les opérations de tâches présentes sont accusé, complétion, réaffectation et escalade; elles disposent de gardes plus stricts et leurs 28 tests existants passent.

## Résultat

Les contrôles d'accès Portail sur la lecture directe passent pour l'acteur autorisé, l'acteur sans bâtiment, l'autre tenant et l'anonyme. En revanche, le contrat de détail, la provenance de la chronologie et plusieurs transitions ne satisfont pas les invariants d'intégrité. Le navigateur confirme aussi que la fiche ne communique ni le mode exercice, ni le responsable, ni la fraîcheur, et traite une panne 503 comme une absence.

Le DOM React n'exécute pas les charges HTML synthétiques. L'export construit toutefois un document HTML par interpolation directe des valeurs persistées : ce chemin reste un risque d'injection reproduisible par inspection et doit être sécurisé avant usage.

## Validations exécutées

- API/PostgreSQL réels : 10 scénarios, 4 PASS et 6 défauts/risques démontrés.
- Jest ciblé : 3 suites, 28 tests PASS.
- Chrome : 12/12 configurations exécutées et capturées; 12 FAIL pour critères communs documentés.
- F5, clavier/focus, zoom 200 %, absence de débordement et absence d'erreur console critique : PASS.
- Lecteur d'écran réel : `NOT_VERIFIED`.
- Production authentifiée : `NOT_VERIFIED` (aucune session légitime INCIDENT_READ fournie à ce lot).

## Verdict

`CORRECTION_REQUISE` pour la fiche Incident. La liste Incident livrée antérieurement n'est pas remise en cause.
