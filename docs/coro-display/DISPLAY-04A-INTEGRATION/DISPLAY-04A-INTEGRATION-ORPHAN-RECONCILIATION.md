# DISPLAY-04A-INTEGRATION — Réconciliation des objets orphelins

Le prévisualiseur compare un inventaire privé `{key,sizeBytes,lastModified}` aux clés de jobs et variantes. Il exige : préfixe Display canonique, âge supérieur à la grâce, absence de référence DB et absence de publication protégée sous le même préfixe.

Il couvre les interruptions entre upload/transaction, annulation et crash. Le rapport fournit nombre et octets candidats. Les objets sans forme canonique sont ignorés; les publications REVIEW/APPROVED/PUBLISHED/SUSPENDED sont protégées même si une référence paraît absente.

Mode unique : `DRY_RUN`. Aucune API de suppression n’est appelée. Le test synthétique démontre un candidat, un objet référencé, un objet protégé et un objet hors périmètre.
