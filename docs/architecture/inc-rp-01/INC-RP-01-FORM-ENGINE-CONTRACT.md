# INC-RP-01 — Contrat du moteur de formulaires

## Objets versionnés

- `FormTemplateVersion` : schéma, présentation, règles, listes et empreinte;
- `FieldDefinitionVersion` : définition canonique ou personnalisée;
- `ReportVersion` : valeurs, modèle figé, contexte prérempli et empreinte;
- `LegacyEnvelope` : source brute, libellés originaux et valeurs non mappées.

Une version de modèle publiée et une version de rapport soumise sont immuables.

## Contrat de schéma

Le schéma est JSON déclaratif, validé à la publication. Il contient des
sections ordonnées, des références de champs et des règles de visibilité. Il
n'accepte ni JavaScript, ni HTML, ni expression réseau. Une règle conditionnelle
est un arbre borné (`all`, `any`, `equals`, `in`, `exists`, comparaisons
numériques/date) évalué de manière identique au client et au serveur.

## Validation

1. Le client montre les erreurs immédiatement.
2. Le serveur recharge la version canonique du modèle.
3. Le serveur recalcule visibilité, obligation et valeurs calculées.
4. Les champs inconnus sont refusés en saisie native.
5. Les champs masqués non autorisés sont retirés, jamais acceptés aveuglément.
6. Chaque section répétable impose bornes, identifiants de ligne stables et
   ordre déterministe.
7. Une soumission crée une version et son empreinte dans une transaction.

## Brouillons et concurrence

- sauvegarde explicite et autosauvegarde temporisée avec `expectedRevision`;
- clé d'idempotence pour création et soumission;
- conflit `409` en cas de révision obsolète;
- brouillon local temporaire chiffré ou non sensible seulement;
- aucune donnée sensible durable hors du stockage serveur autorisé;
- réponse obsolète ignorée par identifiant de requête/révision.

## Préremplissage

Le préremplissage provient de références autorisées : acteur, organisation,
bâtiment, emplacement et incident lié. Le serveur consigne la source et décide
si la valeur est éditable. Un client ne peut pas changer l'organisation ou le
bâtiment par simple modification du corps HTTP.

## Personnalisation

Une organisation peut dériver un modèle publié en nouvelle version, ajouter
des champs `custom.<organizationId>.*`, configurer listes et exigences, puis le
publier après validation. Un bâtiment peut sélectionner un modèle autorisé ou
une variante explicitement portée au bâtiment. Aucun changement n'est
rétroactif.

## Accessibilité et responsive

- navigation clavier et ordre de focus prévisible;
- erreurs liées au champ et résumé accessible;
- libellés persistants, aides et unités;
- sections repliables sans masquer les erreurs;
- cibles tactiles adaptées;
- fonctionnement à 200 % de zoom;
- bureau, tablette et téléphone sans défilement horizontal structurel;
- lecteur d'écran réel reste `NOT_VERIFIED` jusqu'à recette humaine.

## Sécurité

Les chaînes sont traitées comme données, échappées au rendu. Les pièces jointes
suivent quarantaine et antivirus. Les règles de champ ne donnent jamais une
permission. Toute lecture/écriture combine permission individuelle, affectation
active au bâtiment, organisation et sensibilité.
