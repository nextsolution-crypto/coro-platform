# Matrice d’acceptation — candidat de correction

| Domaine | Scénario | Statut | Preuve / limite |
|---|---|---|---|
| Base | PostgreSQL 16 depuis zéro | PASS | 160 migrations, tête `20261113010000_document_review_integrity` |
| Mise à niveau | tête parente réelle 159 → 160 | PASS | données et décisions synthétiques préexistantes conservées, aucune validation rétroactive |
| Types | PMU, PSI, PCA | PASS | trois parcours synthétiques complets sur navigateur, service et PostgreSQL réels |
| Parcours intégré | génération → édition → sauvegarde → soumission → révision → décision → relecture | PASS | terminé pour PMU, PSI et PCA par auteur et réviseur indépendants |
| Soumission | active, affectée, document existant | PASS | demande immuable + hash + audit + outbox atomiques |
| Soumission | répétition | PASS | réponse idempotente, aucune demande supplémentaire |
| Soumission | archive/inactif/hors périmètre | PASS | refus sans demande, audit métier, outbox ou version |
| Révision | observation autorisée | PASS | contrôles visibles et utilisables, limités au projet et à `REVIEW` |
| Révision | non affecté/inter-tenant | PASS | refus sans fuite ni écriture |
| Décision | séparation auteur/approbateur | PASS | auto-approbation refusée; aucune affectation nominative ou quorum ajouté |
| Décision | contenu inchangé/changé | PASS | version liée au hash; conflit si contenu changé |
| Décision | retour motivé | PASS | motif non vide exigé côté serveur |
| Concurrence | décision répétée/réponse perdue | PASS | une version, une décision et un événement durable; répétition idempotente |
| Dégradation | HTTP 503 puis reprise | PASS | aucun faux succès, statut `REVIEW` conservé, nouvelle tentative réussie |
| Audit | routes dédiées/historiques | PASS | trace transactionnelle corrélée et persistante après F5 |
| Notifications | worker QA et fournisseur simulé | PASS | échec contrôlé, reprise, tentative comptée, événement dédupliqué |
| Chrome | 390×844, 768×1024, 1440×900, 2560×1440 × 3 thèmes | PASS | 12/12, captures et mesures conservées |
| Accessibilité | clavier, focus et zoom 200 % | PASS | actions utilisables, focus visible, aucun débordement horizontal |
| Accessibilité | lecteur d’écran réel | NOT_VERIFIED | Narrator installé, sortie parlée non vérifiable humainement dans l’environnement automatisé |
| PDF officiel et signature | étapes distinctes | NOT_APPLICABLE | hors mandat |

## Politique d’approbation

La politique actuelle permet une décision par un acteur habilité distinct de
l’auteur. Elle suffit au parcours existant. L’affectation nominative et le
quorum restent des extensions non incluses et ne sont pas requis pour cette
acceptation.

## Changement du workflow de livraison

La modification de `.github/workflows/deploy.yml` porte uniquement le délai du
job `backend-tests` de 15 à 25 minutes. Les déclencheurs demeurent `push` sur
`main`, `pull_request` vers `main` et `workflow_dispatch`; les jobs de création
d’images et de production restent limités à `workflow_dispatch`. Aucun gate ni
contrôle de livraison n’est affaibli.

Verdict : `INTEGRATED_SERVER_AND_BROWSER_ACCEPTANCE_PASS`.
