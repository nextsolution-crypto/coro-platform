# DISPLAY-04A-INTEGRATION — Rétention

Politique initiale configurable : SUCCEEDED 90 jours, FAILED 30 jours, CANCELLED 30 jours, grâce objet orphelin 7 jours. PENDING/PROCESSING ne sont jamais candidats. REVIEW/APPROVED/PUBLISHED/SUSPENDED protègent toujours jobs, rendus et preuves.

`DisplayPdfMaintenanceService.previewJobRetention()` retourne exclusivement un rapport `dryRun: true`. Il ne possède aucune méthode de suppression. Les métadonnées d’audit et les rendus liés à une publication protégée sont exclus. Les temporaires du rasteriseur sont supprimés dans un `finally` après chaque exécution.

La purge réelle, sa planification et toute réduction de délai restent hors périmètre et exigent une autorisation distincte.
