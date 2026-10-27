# CORO WEB-AI-02 — Sécurité et isolation

## Contrôles démontrés

| Contrôle | Résultat |
|---|---|
| Aucun champ tenant/organisation/bâtiment/document client | PASS PostgreSQL |
| Aucune FK publique vers une table privée | PASS PostgreSQL |
| Sélecteurs privés dans l'API | PASS — HTTP 400 |
| Domaine, protocole, route et requête URL | PASS |
| Source révoquée/expirée/non publiée | PASS |
| Injection dans la question | PASS — blocked |
| Injection dans une source | PASS — chunk exclu |
| Citation depuis le registre serveur | PASS |
| Flag inactif par défaut | PASS — HTTP 503 |
| Quotas dédiés | 8/minute, 60/heure |

Le test PostgreSQL inspecte également `information_schema` : zéro colonne `organizationId`, `buildingId`, `projectFileId`, `tenantId` ou `clientUserId`, et zéro clé étrangère vers une table non `PublicKnowledge%`.

## Limites

Les tables partagent actuellement la même base PostgreSQL, avec séparation logique et contraintes structurelles, plutôt qu'un compte SQL public à privilèges réduits. Une identité SQL dédiée reste recommandée avant activation publique. Les quotas Nest restent locaux au processus comme dans WEB-AI-00; une autorité distribuée sera nécessaire avant mise à l'échelle horizontale.

## Conclusion

Isolation public/privé : **PASS pour le modèle, l'API et les tests PostgreSQL locaux; réserve opérationnelle sur le compte SQL dédié**.
