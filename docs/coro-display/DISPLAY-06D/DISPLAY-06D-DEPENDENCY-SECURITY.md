# Sécurité des dépendances

Installation verrouillée : 924 paquets. Audit complet backend : 30 occurrences (4 faibles, 23 modérées, 3 élevées, 0 critique), identique à 06C; chaînes principales `deepmerge`, `deepmerge-ts`, `glob`, `minimatch` via CLI Prisma/Nest/Jest/ESLint.

Audits runtime 06D : backend 0, frontend 0, portail 0. Les audits complets frontend et portail signalent chacun 8 occurrences modérées dans l’outillage. Aucun nouveau paquet runtime n’est ajouté en 06D. Les correctifs proposés impliquent des versions majeures. Aucun `npm audit fix --force` n’a été exécuté.

Poppler/`pdftoppm` n’est pas installé sur l’hôte Windows; le contrôle OCR PNG local reste `NOT_VERIFIED`. La CI Linux 06C avait validé Poppler/Tesseract, mais cette preuve n’est pas réétiquetée comme exécution 06D.
