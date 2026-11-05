# SP-OPS-02 — Acceptation sécurité

## Contrôles démontrés

- organisation, bâtiment et profil résolus côté serveur;
- liste des établissements relue depuis les données serveur;
- identifiants sélectionnés revalidés contre le résultat autorisé;
- refus inter-tenant et hors périmètre avant écriture;
- auteur et approbateur issus de l’identité authentifiée;
- double contrôle : auto-approbation refusée;
- gel transactionnel, concurrent et idempotent;
- snapshots de provenance/version et de sélection immuables;
- aperçu sans coordonnées de contact;
- SANDBOX sans adresse, numéro ou identifiant fournisseur persisté dans les livraisons institutionnelles;
- rapport stocké dans le namespace privé du tenant;
- aucun appel SMS, courriel, webhook ou modèle réel.

## Refus sans effet

Une sélection invalide, une autre organisation, une source obsolète ou l’absence d’approbation bloque le parcours avant création des livraisons. LIVE avec une cible institutionnelle échoue fermé tant qu’une politique institutionnelle approuvée n’existe pas.

## Risques résiduels

- allowlist serveur du futur essai réel non encore activée;
- validation réelle TFN/Brevo non exécutée;
- restitution vocale par lecteur d’écran non observée;
- météo temps réel et décision de protection restent humaines et hors moteur.

## Verdict

**GO** pour la simulation isolée. **NO-GO** pour toute diffusion réelle ou activation publique.
