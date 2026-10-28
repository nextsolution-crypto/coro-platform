# Matrice d'acceptation — candidat de correction

| Domaine | Scénario | Statut | Preuve / limite |
|---|---|---|---|
| Base | PostgreSQL 16 depuis zéro | PASS | 160 migrations, tête `20261113010000_document_review_integrity` |
| Types | PMU, PSI, PCA | PASS_SERVEUR | Trois parcours synthétiques sur service et PostgreSQL réels |
| Soumission | active, affectée, document existant | PASS | demande immuable + hash + audit + outbox atomiques |
| Soumission | répétition | PASS | réponse idempotente, aucune demande supplémentaire |
| Soumission | archive/inactif/hors périmètre | PASS | refus sans demande, audit métier, outbox ou version |
| Révision | observation autorisée | PASS | CRUD limité au projet et à `REVIEW` |
| Révision | non affecté/inter-tenant | PASS | refus sans fuite ni écriture |
| Décision | séparation auteur/approbateur | PASS | auto-approbation refusée |
| Décision | contenu inchangé/changé | PASS | version liée au hash; conflit si contenu changé |
| Décision | retour motivé | PASS | motif non vide exigé côté serveur |
| Concurrence | deux approbations | PASS | une version, une décision, seconde réponse idempotente |
| Audit | routes dédiées/historiques | PASS | une seule trace transactionnelle corrélée |
| Notifications | panne fournisseur | PASS_MÉTIER | décision conservée; événement `FAILED` récupérable |
| Génération → édition → sauvegarde | dépendances existantes | PARTIAL | compilations/régressions PASS; UI intégrée non exécutée |
| Soumission → révision → décision → relecture | service/PostgreSQL | PASS_SERVEUR | PMU/PSI/PCA, snapshot et historique persistés |
| Chrome 390/768/1440/2560 et thèmes | parcours authentifié | NOT_VERIFIED | runtime navigateur complet non exécuté |
| Accessibilité | clavier/zoom/lecteur écran | NOT_VERIFIED | aucune preuve réelle sur le candidat |
| PDF officiel et signature | étapes distinctes | NOT_APPLICABLE | hors mandat |

Verdict : `SERVER_ACCEPTANCE_PASS_BROWSER_ACCEPTANCE_PENDING`.
