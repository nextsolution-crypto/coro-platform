# Constats — Conformité

## COMP-001 — Un brouillon récent est déclaré conforme

- Sévérité : critique
- Statut : `FAIL`
- Attendu : distinguer présence, approbation, fraîcheur interne et conformité vérifiée.
- Observé : tout `Document`, y compris `DRAFT`, devient `CONFORME` si son
  `updatedAt` a moins de dix mois.
- Reproduction : fixture `Audit Draft Recent`, API 200, statut `CONFORME`.
- Impact : assurance réglementaire non démontrée; décision commerciale ou
  opérationnelle potentiellement trompeuse.
- Cause : statut du document et modèles de preuve ignorés.
- Preuve : `compliance-audit.json`, capture `390x844-glass-dark.png`.
- Correction proposée : renommer d'abord l'indicateur de fraîcheur, puis définir
  une autorité d'exigence et d'évidence avant tout statut de conformité.
- Acceptation : un brouillon n'est jamais présenté comme conforme.

## COMP-002 — Le périmètre opérateur canonique n'est pas appliqué

- Sévérité : haute
- Statut : `FAIL`
- Attendu : `projectAccessWhere(actor)` ou politique canonique équivalente.
- Observé : le contrôleur transmet seulement `organizationId`; l'opérateur voit
  aussi le bâtiment d'un projet porté par un autre utilisateur.
- Reproduction : acteur `advisor`, fixture `Audit Other Owner`.
- Impact : divulgation interne au-delà des affectations autorisées.
- Cause : signature `getBuildingsCompliance(organizationId)`.
- Preuve : réponse API synthétique dans `compliance-audit.json`.
- Correction proposée : transmettre l'acteur typé et appliquer la portée projet
  avant toute agrégation.
- Acceptation : liste, compteurs et liens ne contiennent aucun bâtiment hors portée.

## COMP-003 — Le projet le plus récent peut masquer une preuve existante

- Sévérité : haute
- Statut : `FAIL`
- Attendu : sélection déterministe d'une preuve éligible avec provenance.
- Observé : le service choisit d'abord un seul projet par `Project.updatedAt`,
  puis un seul document de ce projet. Un projet plus récent sans document masque
  le document validé d'un projet actif antérieur.
- Impact : faux « Aucun document » et compteurs incohérents.
- Cause : `projects.take=1` avant la sélection documentaire.
- Acceptation : la règle de sélection est définie, traçable et indépendante
  d'une modification technique non pertinente.

## COMP-004 — Une panne 503 devient silencieusement un état vide rassurant

- Sévérité : haute
- Statut : `FAIL`
- Attendu : erreur accessible, données inconnues, reprise explicite.
- Observé : quatre compteurs à zéro et « Aucun bâtiment trouvé »; aucun message
  d'erreur, alerte ou bouton Réessayer.
- Impact : panne interprétable comme absence de risque ou de données.
- Cause : `catch` limité à `console.error`, état initial conservé.
- Preuve : `controlled-503.png`.
- Acceptation : panne distincte du vide, aucune donnée obsolète présentée sans
  indication, reprise déterministe.

## COMP-005 — L'échéance est un âge technique sans autorité métier

- Sévérité : haute
- Statut : `FAIL`
- Attendu : source, périodicité, déclencheur, fuseau et renouvellement définis.
- Observé : mois = différence UTC / `30.44`, arrondie vers le bas; seuils 10/12;
  source = `Document.updatedAt`.
- Impact : une édition technique peut rajeunir l'indicateur; les mois calendaires,
  années bissextiles et fuseaux ne sont pas gouvernés.
- Correction proposée : décision métier avant implémentation d'une échéance.
- Acceptation : horloge contrôlable et cas frontière documentés.

## COMP-006 — Les autorités Compliance du schéma ne pilotent pas l'écran

- Sévérité : moyenne
- Statut : `PARTIAL`
- Observé : `ComplianceRequirement`, `BuildingRequirement` et
  `ComplianceEvidence` existent, mais l'écran lit `Project/Document` uniquement.
- Impact : exigences applicables, statut de preuve, expiration, révocation et
  provenance ne peuvent expliquer les badges.
- Acceptation : choix explicite entre une vue de fraîcheur documentaire honnête
  et une vue de conformité gouvernée.

## COMP-007 — Archives et historique ne sont pas expliqués

- Sévérité : moyenne
- Statut : `PARTIAL`
- Observé : un projet archivé est exclu et le bâtiment devient « Aucun document ».
- Impact : la preuve historique peut sembler absente sans être supprimée.
- Acceptation : distinguer preuve actuelle, historique conservé et non-applicabilité.

## COMP-008 — L'écran ne fournit aucune provenance explicative

- Sévérité : moyenne
- Statut : `FAIL`
- Observé : document et projet sont nommés, mais aucune formule, règle, date
  d'effet, exigence, portée ou raison du statut n'est consultable.
- Impact : résultat non vérifiable par l'utilisateur.
- Acceptation : chaque badge expose sa définition, sa source et sa date de référence.

## COMP-009 — Limites UX et accessibilité restantes

- Sévérité : faible
- Statut : `PARTIAL`
- Observé : 12/12 sans débordement critique; texte/symbole/couleur présents.
  Lecteur d'écran réel non exécuté; le tableau exige un défilement horizontal
  sur tablette.
- Acceptation : contrôle clavier, zoom 200 % et lecteur d'écran réel documentés.

