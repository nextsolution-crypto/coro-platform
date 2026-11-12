# Intégration CORO Ops

Le contrat de commande conserve `protocolId` et la provenance `CORO_OPS`, mais aucun adaptateur machine authentifié n'existe encore dans ce lot. La contre-revue a donc fermé la provenance machine sur la route JWT humaine afin qu'un utilisateur ne puisse pas falsifier l'origine auditée.

Un futur adaptateur devra présenter une identité de service non falsifiable, résoudre le protocole approuvé dans la même organisation et le même bâtiment, puis réutiliser l'autorité, la transaction, le ciblage documentaire et la signature de DISPLAY-07. Aucune procédure documentaire n'est convertie automatiquement en commande.

Limite : aucune tâche Ops dédiée n'est créée automatiquement; les escalades Display et le journal Incident fournissent la reprise minimale. L'orchestration Ops entrante complète demeure `NOT_VERIFIED`, fermée par défaut et non bloquante pour la revue du noyau logiciel.
