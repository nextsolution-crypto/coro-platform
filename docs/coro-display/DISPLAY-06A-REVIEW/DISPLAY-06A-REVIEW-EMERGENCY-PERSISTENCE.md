# DISPLAY-06A-REVIEW — Persistance de l'urgence

La priorité en mémoire est correcte : urgence réelle, exercice, permanent, normal. Une baisse exige une autorisation gouvernée et aucun timer ne l'effectue.

Persistance après crash, redémarrage OS ou panne électrique : **NOT_IMPLEMENTED**. Le contrôleur TypeScript en mémoire ne constitue pas une garantie physique. DISPLAY-06B doit journaliser atomiquement le mode et restaurer l'urgence avant tout contenu secondaire.
