# DISPLAY-06B — Urgence persistante

Mode, événement, source, priorité, date, version et autorisation sont persistés atomiquement avec HMAC-SHA-256. Une modification est détectée et produit `EMERGENCY_STATE_CORRUPT`; elle ne devient jamais un faux état normal.

La clé d'intégrité doit provenir du stockage OS. La reprise dans un processus kiosque réel reste à vérifier.
