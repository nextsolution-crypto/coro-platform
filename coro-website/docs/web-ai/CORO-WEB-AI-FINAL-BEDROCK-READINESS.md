# CORO WEB-AI-FINAL — Préparation Bedrock

## Cible fixe

- Politique : `WEB_PUBLIC`.
- Région d'entrée : `ca-central-1`.
- Profil : `ca.amazon.nova-lite-v1:0`.
- Traitement canadien attendu : Montréal et Calgary selon le profil canadien.
- Authentification : IAM Roles Anywhere, profil `coro-ai-production`, sessions 900 secondes.
- Runtime : image backend Debian/glibc; aucun binaire hôte Alpine n'est copié.

## Préparation démontrée

Converse, outil de sortie structurée, contexte public borné, timeout, absence de retry, concurrence, plafond de campagne, coupe-circuit, journalisation minimale et arrêt par feature flag sont couverts par tests simulés.

## Non vérifié et interdictions

Les quotas Nova Lite sont rapportés à zéro. L'invocation, le renouvellement réel Roles Anywhere depuis le conteneur, les jetons, la latence et le coût réels sont `NOT_VERIFIED`. Aucun appel Bedrock/Anthropic n'a été effectué. La future campagne requiert quotas non nuls, budget autorisé, identité SQL publique opérationnelle et autorisation explicite. La première étape devra être une invocation unique, jamais une campagne automatique.
