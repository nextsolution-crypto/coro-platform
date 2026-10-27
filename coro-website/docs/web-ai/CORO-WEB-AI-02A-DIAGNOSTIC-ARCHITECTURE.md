# CORO WEB-AI-02A — Diagnostic et architecture fournisseur

Date : 2026-10-27

Branche : `feature/web-ai-02-public-knowledge`

Base : `2cd919b6a0fa52fd4af59b9bdf61a3fcb5691ccf`

## Diagnostic

Le chat public existant appelle directement `https://api.anthropic.com/v1/messages`, exige `ANTHROPIC_API_KEY` et fixe le modèle `claude-haiku-4-5-20251001`. Le fichier Compose transmet la variable au backend. WEB-AI-00 fournit déjà les limites, délais, contrôles de forme et modes dégradés.

Le comportement dégradé observé ne permet pas, sans appel fournisseur ni journaux de production plus précis, de distinguer de façon certaine : clé absente/invalide, autorisation de modèle, quota, réseau ou indisponibilité fournisseur. Le diagnostic est donc **INCONCLUSIVE_PROVIDER_SIDE**. Aucun appel réel ou payant n'a été exécuté.

## Architecture retenue

WEB-AI-02 ne remplace pas encore le fournisseur du chat. Il crée une couche déterministe indépendante :

`catalogue public approuvé → validation → version/empreinte → chunks → index public → recherche hybride → contexte et citations`

Le futur WEB-AI-03 pourra consommer ce contexte derrière une interface fournisseur et un coupe-circuit. Le flag `WEB_AI_PUBLIC_KNOWLEDGE_ENABLED` est faux par défaut. Le site et le chat WEB-AI-00 restent indépendants si la connaissance publique est indisponible.

## Réserves

- Cause fournisseur réelle non démontrée.
- Aucun Bedrock réel activé.
- Aucun raccordement du widget dans ce lot.
