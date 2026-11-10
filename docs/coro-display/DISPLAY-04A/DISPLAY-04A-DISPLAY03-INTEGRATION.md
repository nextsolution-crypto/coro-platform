# DISPLAY-04A — Intégration DISPLAY-03

L'endpoint `POST .../:id/pdf-render-jobs` exige `DISPLAY_PLAN_CREATE`; la lecture du job exige `DISPLAY_PLAN_READ`. Le worker ne change ni les transitions DRAFT/REVIEW/APPROVED/PUBLISHED ni la séparation créateur/réviseur/approbateur.

Un job ne peut traiter qu'un brouillon et revalide l'autorité documentaire. La génération d'une nouvelle variante annule les marqueurs de revue/approbation. La publication, la suspension, la révocation et le contrat Player continuent d'utiliser les contrôles DISPLAY-03 existants.

Le chemin synchrone PNG/JPEG demeure compatible. Le PDF passe exclusivement par la file.
