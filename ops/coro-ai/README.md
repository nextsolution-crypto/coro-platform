# CORO AI - AWS preparation (inactive)

This overlay prepares the backend for IAM Roles Anywhere without embedding a
certificate, private key, or long-lived AWS credential in an image or in Git.
The standard deployment does not load the overlay and continues to use the
deterministic simulated provider.

The backend image is glibc-based so the host-provisioned
`aws_signing_helper` can be mounted read-only and invoked by the AWS SDK
`credential_process` configured in `/etc/coro-ai/aws-config`.

Activation requires a separate governed operation that:

1. verifies the profile `coro-ai-production` and helper path on the host;
2. verifies the model `ca.amazon.nova-lite-v1:0` and region `ca-central-1`;
   the approved Roles Anywhere session duration is exactly 900 seconds;
3. mounts `/etc/coro-ai` and the helper read-only;
4. sets `CORO_AI_PROVIDER=bedrock` and
   `CORO_AI_BEDROCK_INVOCATION_ENABLED=true`;
5. performs an explicitly approved, non-sensitive invocation test.

No model invocation is part of this change or its automated tests.
The approved Canadian cross-region inference profile can process within the two
Canadian regions; CORO still addresses Bedrock through `ca-central-1` only.

## CORO Knowledge - vecteurs sémantiques Titan (inactif par défaut)

CORO Knowledge peut calculer de vrais vecteurs de sens avec Amazon Titan Text
Embeddings V2 (`amazon.titan-embed-text-v2:0`, 512 dimensions), appelé dans
`ca-central-1` uniquement. Interrupteur distinct de CORO AI :
`"semanticEmbeddingsEnabled": true` dans `/etc/coro-ai/runtime-policy.json`,
qui pose `CORO_KNOWLEDGE_EMBEDDING_PROVIDER=bedrock-titan-v2` et monte les
mêmes identifiants Roles Anywhere en lecture seule.

Prérequis AWS : le rôle de `coro-ai-production` doit autoriser
`bedrock:InvokeModel` sur
`arn:aws:bedrock:ca-central-1::foundation-model/amazon.titan-embed-text-v2:0`,
et rien d'autre pour ce modèle.

Comportement :

- nouveaux documents : vecteur Titan stocké avec `embeddingModel`;
- documents existants : rattrapage automatique par lots (60 s,
  `CORO_KNOWLEDGE_EMBEDDING_BACKFILL_BATCH`, 40 par défaut, 0 = arrêté);
- échec AWS : repli sur la projection locale, coupe-circuit de 5 minutes
  après 3 échecs ; la recherche reste plein texte + mots exacts;
- le déploiement exécute un test fictif (`knowledge-provider-smoke.js`) qui
  échoue si Titan est activé mais inaccessible.
