# DISPLAY-04A — Architecture worker

Flux : API authentifiée → autorité bâtiment/ProjectFile → `DisplayPdfRenderJob` → claim PostgreSQL `FOR UPDATE SKIP LOCKED` → worker Nest sans HTTP → stockage privé → mise à jour atomique du brouillon DISPLAY-03.

La file conserve état, tentatives (maximum 3), lease/heartbeat, prochaine tentative, erreurs bornées, moteur/version, paramètres, dimensions et empreintes. `recoverAbandoned` remet seulement les travaux expirés et encore admissibles en attente. L'unicité `(publicationId, requestId)` assure l'idempotence.

Le worker revalide au dernier moment le statut DRAFT, la version et le SHA du ProjectFile approuvé, l'absence de révocation/remplacement et l'intégrité des octets. Une concurrence sur le brouillon fait échouer le commit final.
