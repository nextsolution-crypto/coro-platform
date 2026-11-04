# Isolation des communications CORO Démo

## Autorité

`DemoEnvironment` lie la politique au `organizationId` canonique. En mode `SIMULATE`, chaque tentative crée une preuve assainie (`recipientHash`, `payloadHash`, canal, opération, idempotence) et aucun fournisseur n'est appelé. En mode `BLOCK` ou si l'environnement est en pause, l'opération est refusée.

La configuration invalide `externalProvidersDisabled=false` échoue avant la création d'une preuve de simulation. L'absence du garde dans un transport intégré échoue fermé en production.

## Exception d'authentification bornée

`DEMO_AUTH_EMAIL_LIVE_RECIPIENT_SHA256_ALLOWLIST` peut contenir une liste
séparée par des virgules d'empreintes SHA-256 de destinataires explicitement
autorisés. Cette configuration ne change pas le mode `SIMULATE` et ne désactive
pas `externalProvidersDisabled`. Elle autorise uniquement le canal `EMAIL` pour
les opérations d'authentification suivantes : MFA plateforme, récupération de
mot de passe plateforme ou portail, magic link portail et invitations User ou
ClientUser.

Toutes les notifications documentaires, communications métier, alertes, SMS et
webhooks demeurent simulés. Un environnement `PAUSED` ou `BLOCK` refuse aussi
les destinataires allowlistés. Une empreinte absente ou mal formée échoue en
simulation. La valeur de configuration et les adresses sources ne doivent pas
être ajoutées au dépôt ni aux preuves.

## Transports raccordés dans le candidat local

- MFA plateforme.
- Courriels du portail client (invitation, récupération, magic link et parcours apparentés).
- Invitations d'utilisateurs d'organisation.
- Réservations.
- Incident : courriel, SMS et outbox différée.
- Sentinelle : PIN employé et invitation visiteur.
- Rappels de signature et lacunes de résilience.
- Sentinelle Population : alertes et codes lorsque le contexte d'organisation est fourni.

## À terminer avant provisionnement

- Inventaire et raccordement des push, webhooks, escalades et intégrations physiques.
- Vérification de chaque worker différé au moment du traitement, pas seulement à l'enqueue.
- Stratégie MFA Démo utilisable sans livraison externe.
- Preuve réseau deny-by-default dans le stack QA.

Le chat commercial public n'est pas une communication du tenant Démo et ne doit pas être désactivé globalement.
