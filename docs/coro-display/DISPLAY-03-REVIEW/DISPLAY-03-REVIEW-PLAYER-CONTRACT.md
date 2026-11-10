# DISPLAY-03-REVIEW — Contrat Player

Le backend retourne une publication unique à partir de l’organisation, du bâtiment et de l’emplacement autorisés. Le Player ne choisit jamais une version.

Le contrat contient publication/version/statut, version et SHA source, version et SHA variante, MIME, dimensions, langue, validité, publication, révocation, étage, zone, emplacement et paramètres du repère.

Correction critique : le téléchargement Player utilise désormais une route dédiée contenant emplacement et publication. Chaque requête recalcule l’autorité active; une URL conservée cesse donc de fonctionner après suspension, remplacement, révocation, expiration ou désactivation spatiale.

Le téléchargement d’aperçu administratif demeure distinct pour la revue historique. DISPLAY-04 devra ajouter identité d’appareil, jeton court, ETag, cache signé et politique hors ligne explicite.
