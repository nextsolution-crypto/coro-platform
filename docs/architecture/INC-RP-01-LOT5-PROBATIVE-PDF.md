# INC-RP-01 - Lot 5 - PDF serveur probant

## Autorite et portee

Le PDF est construit exclusivement a partir d'une `IncidentReportVersion` approuvee ou publiee et devenue immuable. Le navigateur ne fournit ni HTML arbitraire, ni texte de substitution. Le serveur relit la version, le schema de formulaire, le batiment et les decisions d'approbation dans le meme tenant.

Le feature flag `INCIDENT_REPORTS_ENABLED` conserve son comportement fail-closed. Cette livraison n'active pas CORO Report en production.

## Identite de l'export

Chaque export conserve :

- l'organisation, le rapport et la version source;
- le format de page et la langue;
- la version du moteur `coro-incident-report-pdf/1.0.0`;
- un manifeste des empreintes de contenu et de modele ainsi que les approbations;
- l'empreinte SHA-256 du PDF final;
- la cle d'idempotence de la demande;
- l'acteur demandeur et les horodatages.

Le fichier est ecrit dans le stockage prive immuable sous un chemin propre au tenant. Une relecture recalcule l'empreinte avant chaque telechargement. Les telechargements autorises produisent un evenement d'audit distinct. Aucune URL publique n'est emise.

## Concurrence et reprise

La contrainte unique `(organizationId, requestIdempotencyKey)` rend une reprise idempotente. Un export en cours est cree avant le rendu. Un echec est marque `FAILED` sans presenter le fichier comme probant. Un objet ecrit mais non rattache a la suite d'une panne est detecte par le reconciliateur d'objets prives apres la periode de grace.

## Validation des pieces jointes

Avant ClamAV, CORO valide conjointement le MIME autorise, l'extension et une structure binaire minimale : signatures et terminaisons JPEG/PNG, en-tete PDF, `startxref` et `%%EOF`. ClamAV demeure obligatoire et fail-closed. Ces controles ne remplacent pas l'analyse antivirus; ils empechent les fichiers deguises ou manifestement tronques d'atteindre le stockage.

## Reconciliation des objets prives

`ops/maintenance/incident-report-private-object-reconciliation.cjs` fournit un dry-run borne a une organisation. Il compare les objets sous les prefixes Report aux references PostgreSQL, protege les exports `PENDING/PROCESSING`, applique une periode de grace et ne publie que des empreintes de cles. Le mode destructif n'est pas expose dans ce lot : toute suppression future exigera un workflow protege et une autorisation distincte.

## Permissions

- generation : `INCIDENT_REPORT_EXPORT` et affectation Incident active au batiment;
- historique et telechargement : `INCIDENT_REPORT_READ` et meme affectation;
- administration des modeles : `INCIDENT_REPORT_ADMIN` (inchangee).

Les controles organisation, batiment et Incident restent executes cote serveur. Les statuts, la confidentialite et l'immuabilite sont controles avant rendu.

## Exploitation

Le moteur accepte Letter et A4, `fr-CA` et `en-CA`. Les sections sans valeur sont omises, les sections repetables sont rendues comme des entrees numerotees et les valeurs sont neutralisees avant dessin. Le pied de page contient la pagination; la fin du document porte les identifiants, l'empreinte source et la version du moteur.

## Limites intentionnelles

- aucune signature cryptographique qualifiee ou horodatage tiers;
- aucune URL publique de verification;
- pas d'import Reportperfect complet;
- pas de suppression automatique d'objet orphelin;
- la recette navigateur authentifiee reste requise avant activation commerciale.
