# CORO WEB-AI-03 — Release acceptance

## Identification

- Branche source : `feature/web-ai-03-intelligent-assistant`
- Commit fonctionnel : `98c3c16e18980e0cf1922a5c63751e39af9c0359`
- Pull Request : [#111](https://github.com/nextsolution-crypto/coro-platform/pull/111)
- SHA fusionné et actif : `0654faeb6ad92e0f6f2a7cfbec1d9fc689fd90f4`
- Release : [GitHub Actions 40597849821](https://github.com/nextsolution-crypto/coro-platform/actions/runs/40597849821) — `SUCCESS`
- Inspection : [GitHub Actions 40599305613](https://github.com/nextsolution-crypto/coro-platform/actions/runs/40599305613) — `PASS / GO`
- Date : 2026-10-27

## CI et tests

Tous les contrôles de la PR et de `main` ont réussi : sécurité backend, tests backend, tests PostgreSQL, OCR local, extraction Knowledge compilée, quatre typechecks, build backend, build portail et build Docker du site. Les validations locales conservées sont 38/38 tests WEB-AI ciblés, 716/716 tests site, 7/7 tests sécurité widget et 4/4 parcours Chrome FR/EN desktop/mobile.

La réserve locale `pdftoppm` est levée par la CI, qui installe l'environnement OCR et valide le test concerné.

## Déploiement gouverné

Le pipeline a construit et déployé quatre images immuables :

- backend : `sha256:435ab1c2ca1f1a45ba2427ae9b7fc336f0a17d08ee6a269e900b8faa502798f5`
- frontend : `sha256:a447064a7fe8fdde9adfab947b66b2ed1af75a23f1cd47e6eca71a7fc9f13ce0`
- portail client : `sha256:c3da1a7b370c41abce6db550c1a935b24b7ce22cf636a265d457ac5c641d9ef4`
- site : `sha256:2e0be83525310c0ba88a821d4b4365ad7c2e65eabc835047a55f98cc24ebbe4d`

Les quatre conteneurs applicatifs sont actifs avec zéro redémarrage. Le verrou de déploiement est libéré.

## Feature flags et fournisseur

Les noms réels sont :

- `WEB_AI_PUBLIC_KNOWLEDGE_ENABLED`
- `WEB_AI_INTELLIGENT_ASSISTANT_ENABLED`
- `NEXT_PUBLIC_WEB_AI_INTELLIGENT_ASSISTANT_ENABLED`
- `WEB_AI_PROVIDER`, limité à `simulated` par le nouveau parcours

Les trois capacités publiques demeurent fermées par défaut. Les contrôles post-release correctement encodés retournent HTTP 503 pour `/api/public-knowledge/v1/search` et `/api/chat/v1/public-assistant`. Le site a été construit sans activation du flag frontend. Aucun secret fournisseur n'a été modifié et aucun appel Anthropic ou Bedrock réel n'a été effectué.

## SQL et migrations

- PostgreSQL : 16.15, sain.
- Migrations : 156; tête `20261110010000_public_knowledge_foundation`.
- Migration WEB-AI-03 : aucune.
- Migration échouée : aucune.
- Identité SQL publique de production : non requise tant que Public Knowledge est inactif; son provisionnement minimal demeure un préalable obligatoire à toute activation.

## Inspection post-release

- `https://getcoro.io` : HTTP 200.
- `https://app.getcoro.io` : HTTP 200.
- `https://client.getcoro.io` : HTTP 200.
- Production : SHA exact attendu.
- Sauvegarde : `REMOTE_VERIFIED`, empreinte distante vérifiée.
- Restauration : `RESTORE_VERIFIED`.
- Rollback : quatre images précédentes disponibles et métadonnées complètes.
- Capacité disque : 80 % utilisé lors de l'inspection.
- PostgreSQL et services : sains; aucune anomalie d'inspection.

## Rollback

Le rollback gouverné utilise le manifeste de release, les quatre images précédentes, la composition précédente et la tête de migration précédente. L'arrêt immédiat du nouveau parcours est également assuré par les flags, sans migration ni suppression de donnée.

## Réserves

- Fournisseur réel non activé et non validé.
- Identité SQL publique minimale à provisionner avant activation.
- Compatibilité Alpine/IAM Roles Anywhere et disponibilité exacte du modèle canadien à valider.
- Tarifs réels et budget à approuver.
- Dette historique `html[lang]` sur les pages anglaises.
- Lecteur d'écran réel et performance avec fournisseur réel non vérifiés.

## Live provider acceptance — préparation

- Fournisseur recommandé : AWS Bedrock, sous décision distincte.
- Modèle candidat : Amazon Nova Lite; identifiant exact canadien à confirmer dans le compte AWS.
- Région candidate : `ca-central-1`, résidence et inférence interrégionale canadienne à confirmer.
- Permissions : IAM Roles Anywhere, sessions temporaires, rôle minimal et aucune clé privée dans Git ou l'image.
- Compatibilité : intégration Alpine/musl ou composant d'identité isolé à valider.
- Coûts : `NOT_VERIFIED`; appliquer les formules du rapport WEB-AI-03D aux tarifs officiels courants.
- Tests futurs : exactitude, citations, abstention, FR/EN, injection, isolation, latence, quotas, coût et coupe-circuit.
- Prêt pour validation réelle : `NON`, tant que les préalables SQL, modèle, région, identité, budget et autorisation explicite ne sont pas réunis.

## Verdict

`RELEASED_INACTIVE_AND_VERIFIED`

WEB-AI-03 est livré dans la release privée, mais Public Knowledge, Conversation V2 et tout fournisseur réel restent inactifs. Aucune activation publique n'est autorisée par ce rapport.
