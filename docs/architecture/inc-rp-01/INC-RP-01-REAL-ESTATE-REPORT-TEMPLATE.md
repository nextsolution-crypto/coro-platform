# INC-RP-01 — Gabarit de rapport immobilier et sécurité

## Objectif

Offrir une saisie rapide pour gestionnaires immobiliers et agents de sécurité,
avec divulgation progressive. Les sections non pertinentes restent masquées.
Ce gabarit est `CORO_PROPOSED`; il ne prétend pas reproduire un formulaire RP.

## Parcours rapide

### 1. Contexte prérempli

- organisation, bâtiment et adresse;
- étage, zone et emplacement si le rapport part d'un contexte bâtiment;
- auteur authentifié et horodatage serveur;
- numéro de rapport généré côté serveur;
- incident CORO lié, lorsqu'il existe, sans dépendance obligatoire.

### 2. Essentiel visible immédiatement

- type et catégorie;
- date/heure de l'événement et de la découverte;
- emplacement précis;
- priorité;
- description factuelle;
- mesures immédiates;
- présence de blessés, dommages, service d'urgence ou risque continu.

### 3. Sections conditionnelles répétables

| Déclencheur | Section | Contenu indicatif |
|---|---|---|
| personne impliquée | personnes | rôle, coordonnées autorisées, état, consentement/confidentialité |
| témoin | témoins | identité, moyen de contact, déclaration, pièces associées |
| véhicule | véhicules | type, plaque, juridiction, conducteur, dommages |
| équipement/bien | équipements | identifiant, propriétaire, état, dommage, valeur estimée |
| intervention | interventions | intervenant, service, arrivée/départ, action, résultat |
| blessure/accident | soins | nature, premiers soins, transport; accès restreint |
| dommage | dommages | objet, description, photos, estimation non probante |
| suivi requis | actions | responsable, échéance, statut, preuve de fermeture |
| preuve | pièces jointes | photo, vidéo, PDF, document externe, empreinte |

### 4. Vérification et soumission

- résumé des informations manquantes avec liens directs;
- aperçu de la portée de confidentialité;
- possibilité de corriger avant soumission;
- confirmation que le récit est factuel;
- soumission idempotente; version soumise immuable.

## Listes normalisées configurables

Catégories, priorités, types de personnes, services intervenants, types de
dommages, résultats, causes et statuts sont configurables par organisation ou
bâtiment. Une valeur retirée reste lisible dans les rapports historiques.

## Confidentialité

Les renseignements médicaux, coordonnées privées, déclarations de témoins et
identifiants gouvernementaux sont séparés et masqués selon l'autorité. La liste
de rapports utilise une projection minimale; les détails exigent l'autorité du
bâtiment et la permission correspondante.

## Exemples de profils

- agent : crée, sauvegarde et soumet;
- gestionnaire : consulte son périmètre, demande une correction;
- réviseur : révise sans modifier la version soumise;
- approbateur distinct : approuve/rejette;
- administrateur de modèles : publie des modèles, sans accès implicite aux
  rapports sensibles.

## Hors périmètre du gabarit

Le gabarit ne remplace ni un rapport de police, ni un dossier médical, ni un
formulaire réglementaire spécialisé. Ces objets sont joints ou référencés avec
leur provenance.
