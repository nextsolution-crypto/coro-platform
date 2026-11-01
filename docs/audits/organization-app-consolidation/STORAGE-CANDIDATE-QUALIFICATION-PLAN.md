# Qualification des candidats stockage — sans suppression

L’inventaire réconcilie onze autorités applicatives. Un objet absent de l’une d’elles n’est jamais qualifié d’orphelin par ce seul fait.

L’extension prépare, sans lire les corps ni exposer les clés:

- catégories par usage probable (documents projet/bâtiment, PDF officiels/exports, preuves/rapports gouvernés, contrats/propositions, Population/Sentinelle, temporaires/staging, historique non classé);
- compte et octets par catégorie;
- ancienneté par plages `<30`, `30–89`, `90–364`, `≥365 jours` ou inconnue;
- énumération distincte des versions courantes et non courantes, avec octets agrégés;
- maintien du statut `CANDIDATE_REQUIRES_INDIVIDUAL_REVIEW`.

Une future remédiation exige, objet par objet ou groupe démontré homogène: autorité historique retrouvée, politique de rétention applicable, copie distante ou remplacement vérifié, absence d’usage applicatif, retour arrière sans exposition publique, puis autorisation de suppression distincte. Aucune suppression d’objet, version ou sauvegarde n’est contenue dans l’outil.
