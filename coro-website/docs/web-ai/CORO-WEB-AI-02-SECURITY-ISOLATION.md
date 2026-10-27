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
| URL SQL dédiée obligatoire lorsque le flag est actif | PASS — démarrage fail-closed |
| Identité SQL publique en lecture seule | PASS PostgreSQL |
| Lecture `ProjectFile` avec l'identité publique | PASS — refus PostgreSQL |
| Écriture avec l'identité publique | PASS — refus PostgreSQL |
| Quotas dédiés | 8/minute, 60/heure |

Le test PostgreSQL inspecte également `information_schema` : zéro colonne `organizationId`, `buildingId`, `projectFileId`, `tenantId` ou `clientUserId`, et zéro clé étrangère vers une table non `PublicKnowledge%`.

## Limites

Les tables partagent la même base PostgreSQL, mais le service de recherche possède désormais une connexion dédiée et exige `PUBLIC_KNOWLEDGE_DATABASE_URL` dès que le flag est actif. Le rôle minimal a été exercé sur PostgreSQL 16. Sa création et son secret de production restent une condition d'activation, pas une condition du déploiement désactivé. Les quotas Nest restent locaux au processus comme dans WEB-AI-00; une autorité distribuée sera nécessaire avant mise à l'échelle horizontale.

## Conclusion

Isolation public/privé : **PASS pour le modèle, l'API, la connexion dédiée et les privilèges PostgreSQL minimaux. Activation publique interdite tant que le rôle et son secret de production ne sont pas provisionnés.**
