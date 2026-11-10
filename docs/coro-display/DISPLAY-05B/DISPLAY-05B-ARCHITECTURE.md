# DISPLAY-05B — Architecture

Le module réutilise `ClientPortalModule`, `DisplayPlanPublication`, la structure spatiale DISPLAY-05A et `StorageService`. `ClientDisplayController` expose une façade client distincte des routes Manager. `ClientDisplayService` applique toutes les portées côté serveur.

`DisplayCorrectionObservation` conserve l’organisation, le client, le bâtiment, l’étage, l’emplacement, la publication, les versions publication/variante et le SHA-256 de la variante. `DisplayCorrectionObservationEvent` trace la soumission initiale. Le modèle est additif; aucun moteur documentaire concurrent n’est créé.
