# Validation locale — 24 octobre 2026

## Résultats établis

- Backend : 2 072 tests réussis, aucun échec, deux tests ignorés ; 203 suites réussies et une suite ignorée. Exécution finale Jest avec rapport JSON.
- Les nouveaux essais couvrent les droits internes/clients, les délégations, les refus entre clients d'une même organisation, le périmètre bâtiment exact d'une question, les documents privés et l'audit des permissions.
- Extraction réelle DOCX et XLSX dans les workers, références de feuilles/cellules, exclusion des résultats de formules, refus des macros, références externes et entités XML.
- CSV avec en-têtes, champs contenant des sauts de ligne, références de lignes, rejet d'un CSV mal fermé et d'un texte non UTF-8.
- OCR réel d'un PNG synthétique : `CORO-SCAN-2026`, méthode `LOCAL_OCR`.
- Vérification TypeScript backend réussie.
- Builds Next.js de l'application et du portail réussis, avec TypeScript. La page client `/buildings/[id]` figure dans le build.
- Registre des 46 routes du portail et tests de navigation réussis ; contrat de sécurité des documents hors ligne réussi.
- Contrôle de la couche visuelle, des variables CSS et du noyau partagé des deux interfaces réussi.
- Schéma Prisma validé avec une URL synthétique locale. `git diff --check` sans erreur.

## Validations non exécutées

- Exécution réelle de la migration et des intégrations PostgreSQL : pas de serveur PostgreSQL local disponible. Les scénarios sont ajoutés à `test/knowledge-master.postgres-spec.ts` pour la CI existante.
- Publication de la branche, PR, contrôles CI et déploiement gouverné : en attente de l'accès de publication GitHub dans la session.
- Recette navigateur des interfaces finales et du parcours source → approbation → Knowledge → citation en production : en attente du déploiement.
- Vérification des droits et du cycle de vie sur les données de production après migration : en attente.

Aucune de ces validations en attente n'est présentée comme réussie. La production n'a pas été modifiée par ce chantier.
