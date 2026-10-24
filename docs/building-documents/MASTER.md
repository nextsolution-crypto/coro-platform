# Dossier documentaire durable du bâtiment — mandat et livraison

## Objectif accepté

La fiche bâtiment possède une base documentaire permanente, alimentée directement par les utilisateurs autorisés et par les livrables approuvés des projets. Knowledge/CORO AI travaillent dans le contexte de ce bâtiment. Clôturer ou archiver un projet ne retire pas ses références documentaires.

## Autorité documentaire et migration

- Conservation des identifiants `ProjectFile`, du stockage privé, des empreintes SHA-256, des versions, des événements de cycle de vie et des citations.
- Ajout de `ProjectFile.buildingId`, avec reprise depuis le bâtiment du projet existant.
- `projectId` devient facultatif et conserve la provenance des documents produits par un projet.
- Aucun projet artificiel et aucune duplication de l'objet stocké.
- Une contrainte impose un bâtiment ou un projet. Le rattachement au bâtiment empêche sa suppression physique tant que les références existent.
- Un livrable approuvé apparaît automatiquement dans le dossier du bâtiment. Les brouillons de projet restent dans leur espace de travail ; les brouillons déposés directement au bâtiment y sont visibles.
- Remplacement, révocation, échéances, intégrité et confidentialité continuent de gouverner l'admissibilité Knowledge.
- Les nouvelles versions d'une référence de projet peuvent être préparées directement au bâtiment. Le verrou documentaire sérialise la numérotation des versions et les approbations.

## Permissions

- Organisation prestataire : tout utilisateur actif ayant accès à la fiche bâtiment peut déposer.
- Client : responsable affecté au bâtiment, responsable identifié par son courriel, responsable corporatif de ce client ou superviseur régional/portefeuille dans son périmètre actif.
- Délégation explicite par bâtiment pour les autres utilisateurs du même client ; suspension du dépôt possible.
- Le périmètre est relu en base, sans se fier aux anciennes affectations contenues dans un jeton.
- Un corporatif client ne reçoit pas les bâtiments d'un autre client de la même organisation prestataire.
- Les permissions de dépôt ne donnent pas d'autorité d'approbation. Les transitions restent internes, réservées au conseiller du projet ou, pour un dépôt direct, à son auteur interne ou à l'administration.
- Les changements de permissions sont enregistrés transactionnellement dans `AuditLog` avec auteur, destinataire, ancienne et nouvelle valeurs.
- Les fichiers clients sont partagés ; aucune permission de dépôt ne permet d'exposer une racine de version interne.

## Interface

Application interne : espace documentaire au-dessus des projets dans `/buildings/[id]`.
Portail : `/buildings/[id]`, depuis Documents dans Mes bâtiments.

Recherche au serveur, catégories, pagination par 200, historique, origine du fichier, version, état documentaire, échéance et état Knowledge. Dépôt privé (50 Mo maximum), nouvelle version, téléchargement authentifié, révision/approbation/révocation internes et gestion des permissions de dépôt client. L'assistant intégré transmet explicitement `buildingId` et présente les références documentaires de sa réponse.

Le manuel commun explique le dépôt, l'approbation, les formats et leurs limites. Il reste distinct de la connaissance opérationnelle des clients.

## Formats et limites exactes

| Format | Conservation | Extraction Knowledge |
| --- | --- | --- |
| PDF texte / numérisé | Oui | Texte natif / OCR local français-anglais existant |
| TXT / Markdown UTF-8 | Oui | Texte, dans les limites de taille |
| CSV / TSV UTF-8 | Oui | En-têtes répétés, lignes identifiées, champs cités et lignes multiples |
| DOCX | Oui | Texte et tableaux par blocs logiques ; aucune pagination physique inventée |
| XLSX | Oui | Feuilles et références de cellules ; valeurs brutes sans formats Excel appliqués |
| PNG / JPEG / TIFF | Oui | OCR local soumis au seuil de confiance ; TIFF multipage à exporter en PDF |
| DOC / XLS / WebP / DWG / DXF / IFC | Oui | Non ; export exploitable nécessaire |

Les formules Excel ne sont pas exécutées et leurs valeurs mises en cache ne sont pas utilisées comme preuves. Les macros, liens Excel externes, objets incorporés et entités XML sont refusés par l'extraction. Le texte d'un plan ne constitue pas une interprétation fiable de ses symboles, connexions, cotes ou équipements. Les références de DOCX, CSV et Excel sont logiques et explicitement nommées dans la citation.

Extraction Office dans un processus séparé, délai et sortie bornés, nettoyage des fichiers temporaires et concurrence globale existante de deux extractions. Le réconciliateur filtre les formats pris en charge avant sa limite de lot pour éviter qu'un groupe de formats non indexables bloque les autres documents. Nouvelle version de pipeline : `BUILDING_KNOWLEDGE_V3`.

## Vérifications et conditions de livraison

Les preuves locales sont consignées dans `VALIDATION.md`. La CI PostgreSQL contient des scénarios réels d'archivage de projet, dépôt direct, remplacement depuis le bâtiment, citations, périmètre corporatif de deux clients d'une même organisation et délégation/révocation des permissions.

Ne pas confondre tests locaux réussis et recette déployée. Exécuter les intégrations PostgreSQL, la CI complète, la sauvegarde préalable et le déploiement gouverné, puis vérifier dans les deux interfaces : dépôt → révision → approbation → indexation → question → citation → téléchargement. Vérifier ensuite l'archivage du projet d'origine et le remplacement de sa référence.

## Compatibilité et retour arrière

La migration est additive et laisse le champ bâtiment facultatif pour les anciennes écritures qui renseignent uniquement un projet. Les nouvelles lectures gardent un repli explicite vers le projet pour ces lignes. Aucun fichier existant n'est déplacé.

Après le premier dépôt **sans projet**, un ancien backend qui suppose `file.project` non nul ne constitue plus une cible de retour arrière sûre. Utiliser une image corrective compatible avec les deux propriétaires, ou restaurer un point de sauvegarde cohérent après décision explicite sur les données créées depuis ce point. Ne jamais supprimer les nouveaux documents pour forcer un ancien backend à fonctionner. Cette contrainte doit être revue avant l'approbation de compatibilité de la release.
