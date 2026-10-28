# Reproduction de l'audit de génération documentaire

Préconditions : dépendances verrouillées installées dans `coro-backend`, Prisma Client généré et PostgreSQL 16 jetable avec les migrations courantes.

```powershell
.\qa\organization-document-generation\run-document-generation-audit.ps1 `
  -TestDatabaseUrl 'postgresql://<qa-user>:<qa-password>@127.0.0.1:<qa-port>/<qa-database>'
```

Le runner refuse l'absence d'URL explicite. Il ne contient aucun secret, ne connaît aucune adresse de production et n'appelle aucun fournisseur externe.

Les tests « caractérise le défaut » réussissent lorsqu'ils reproduisent le comportement indésirable de la version auditée. Ils servent de preuve avant correction et devront être inversés lors du lot produit autorisé.
