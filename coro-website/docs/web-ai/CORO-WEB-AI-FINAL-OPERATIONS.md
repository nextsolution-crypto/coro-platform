# CORO WEB-AI-FINAL — Exploitation, désactivation et rollback

## Synchronisation

Exécuter `knowledge:public:sync` seulement avec `PUBLIC_KNOWLEDGE_SYNC_CONFIRMATION=SYNC_PUBLIC_KNOWLEDGE`, l'identité d'ingestion gouvernée et une base explicitement ciblée. Vérifier le nombre de sources, la version du corpus et le second passage idempotent.

## Activation documentaire future

1. Vérifier le rôle avec `ops/public-knowledge/verify-readonly-role.sql`.
2. Vérifier le corpus approuvé et les URL.
3. Configurer `PUBLIC_KNOWLEDGE_DATABASE_URL` par le canal de secrets.
4. Définir `WEB_AI_PUBLIC_KNOWLEDGE_ENABLED=true`, `WEB_AI_INTELLIGENT_ASSISTANT_ENABLED=true`, `WEB_AI_PROVIDER=documentary`.
5. Garder `WEB_AI_BEDROCK_INVOCATION_ENABLED=false`.
6. Déployer par le pipeline gouverné et effectuer les smoke tests FR/EN.

## Désactivation immédiate

Mettre `WEB_AI_INTELLIGENT_ASSISTANT_ENABLED=false` et `NEXT_PUBLIC_WEB_AI_INTELLIGENT_ASSISTANT_ENABLED=false` par le mécanisme gouverné, puis redéployer. Le site reste disponible et le chat historique demeure indépendant. Ne pas supprimer le corpus ni le rôle pour arrêter le service.

## Rollback

Utiliser les quatre digests immuables du manifeste précédent. Ne jamais utiliser `latest`. Vérifier sauvegarde, restauration, migrations, capacité disque et verrou de déploiement avant l'opération. Aucun rollback SQL n'est nécessaire pour ce lot : aucune migration Prisma n'est ajoutée.

## Activation Bedrock future

Elle est une décision séparée. Exiger quotas non nuls, identité SQL vérifiée, budget, certificat valide, smoke Roles Anywhere, invocation unique autorisée et critères d'arrêt. La désactivation reste la serrure `WEB_AI_BEDROCK_INVOCATION_ENABLED=false` ou le retour au fournisseur `documentary`.
