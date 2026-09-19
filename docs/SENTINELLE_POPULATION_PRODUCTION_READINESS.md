# SENTINELLE POPULATION - PRODUCTION READINESS

Cette fiche décrit la configuration statique requise. Elle ne contient aucune
valeur de production. Les secrets doivent être fournis par le gestionnaire de
secrets ou le fichier d'environnement du serveur, jamais par Git.

## Capacités et variables

### Population core

- `POPULATION_OTP_SECRET`: secret HMAC d'au moins 32 octets/caractères forts.
- `POPULATION_ACCESS_SECRET`: secret HMAC d'au moins 32 octets/caractères forts.
- `POPULATION_ACCESS_REQUEST_TOKEN_SECRET`: clé AES-256, exactement 32 octets
  encodés en hexadécimal (64 caractères) ou en base64 standard.
- `POPULATION_LOCATION_TOKEN_SECRET`: clé AES-256 au même format.

Ces quatre valeurs doivent être générées indépendamment et ne doivent jamais
être identiques. Exemple de génération, à exécuter séparément pour chaque
secret :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Courriel Brevo

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `POPULATION_EMAIL_TIMEOUT_MS`, optionnel, entre 1 et 30000 ms.
- `POPULATION_BREVO_WEBHOOK_SECRET`, secret Bearer indépendant d'au moins
  32 octets/caractères forts.

Le readiness distingue `emailOutbound`, `emailWebhook` et `emailLive`.
`emailOutbound` peut être prêt seul pour les parcours non LIVE. Une diffusion
Population LIVE exige `emailLive=READY`, donc transport sortant et webhook
entrant configurés. La livraison réelle doit toujours être confirmée par un
smoke test contrôlé.

### Webhook courriel transactionnel Brevo

Créer après déploiement un webhook Brevo de type `transactional`, canal
`email`, non batché, vers :

```text
https://api.getcoro.io/api/webhooks/brevo/population/email
```

Configurer l'authentification officiellement supportée `auth.type=bearer` avec
la valeur de `POPULATION_BREVO_WEBHOOK_SECRET`. Sélectionner uniquement :

```text
sent (ou request), delivered, deferred, softBounce, hardBounce,
blocked, invalid, error, spam, unsubscribed
```

Ne pas sélectionner `opened`, `uniqueOpened` ou `click`. CORO conserve une
preuve technique minimisée, jamais le payload brut, l'adresse destinataire ou
le contenu. Les doublons répondent 200 sans seconde transition. Un messageId
inconnu est accepté et ignoré afin d'éviter une boucle de retries fournisseur.
Le handler accepte aussi le payload `error` documenté dans les événements
transactionnels, même si la liste actuelle de création d'un webhook ne permet
pas de sélectionner séparément cet événement.

Configuration à effectuer avec l'API Brevo `POST /v3/webhooks` authentifiée par
la clé API Brevo (ou l'écran équivalent), sans enregistrer cette clé dans CORO :

```json
{
  "description": "CORO Population production email evidence",
  "url": "https://api.getcoro.io/api/webhooks/brevo/population/email",
  "type": "transactional",
  "channel": "email",
  "batched": false,
  "events": [
    "sent",
    "delivered",
    "deferred",
    "softBounce",
    "hardBounce",
    "blocked",
    "invalid",
    "spam",
    "unsubscribed"
  ],
  "auth": {
    "type": "bearer",
    "token": "<POPULATION_BREVO_WEBHOOK_SECRET>"
  }
}
```

En cas de panne du webhook, une livraison déjà acceptée reste `SENT`. Une
tentative dont le résultat réseau est inconnu reste en réconciliation et n'est
jamais renvoyée automatiquement. L'API Brevo ne permet pas de rechercher une
requête avec sa clé d'idempotence; les anciennes tentatives sans corrélation
restent donc `STILL_UNKNOWN` jusqu'à preuve explicite.

La projection est monotone et recalculée depuis les preuves conservées : une
preuve `DELIVERED` domine les événements temporaires et les échecs contradictoires;
à défaut, un échec définitif produit `FAILED`; `request/sent`, `deferred` et
`softBounce` prouvent au moins l'acceptation et produisent `SENT`. Ainsi, l'ordre
d'arrivée des webhooks ne décide jamais seul de l'état. `spam` et `unsubscribed`
ne modifient pas silencieusement le consentement CORO dans ce lot.

Pendant les 30 minutes d'idempotence documentées par Brevo, un rejeu identique
avec la même clé peut répondre `duplicate_parameter`, ce qui prouve que la clé a
déjà été vue mais ne fournit pas l'identifiant du message original. CORO ne fait
donc pas ce rejeu automatiquement. Après cette fenêtre, la même clé ne protège
plus contre un nouvel envoi et tout rejeu est également interdit.

Après configuration, utiliser la fonction de test webhook Brevo et vérifier
une réponse HTTP 200 ainsi que `emailWebhook=READY`. Le test doit employer une
destination contrôlée et ne doit pas déclencher une alerte Population LIVE.

### SMS Brevo

- `BREVO_API_KEY`
- `BREVO_SMS_SENDER`
- `POPULATION_SMS_PRODUCTION_VALIDATED=true`

La dernière variable est une attestation humaine. Elle ne doit être activée
qu'après validation du compte, du sender, des exigences canadiennes et d'un
test réel contrôlé. La seule présence d'une clé Brevo ne rend pas le SMS prêt.

### Géocodage Mapbox Permanent

- `GEOCODING_PROVIDER=mapbox`
- `MAPBOX_GEOCODING_ACCESS_TOKEN`
- `POPULATION_LOCATION_TOKEN_SECRET`
- `GEOCODING_TIMEOUT_MS` optionnel, entier positif, défaut 5000.
- `GEOCODING_CACHE_HMAC_SECRET` optionnel, au moins 32 octets/caractères forts.
- `GEOCODING_CACHE_TTL_SECONDS` optionnel, entier positif.
- `GEOCODING_CACHE_MAX_ENTRIES` optionnel, entier positif.

Le readiness est statique et ne contacte pas Mapbox.

## Vérification

Un `SUPER_ADMIN` authentifié peut consulter :

```text
GET /api/internal/readiness/population
Authorization: Bearer <jwt-admin>
```

La réponse ne contient que les états `READY`, `NOT_CONFIGURED`, `INVALID` ou
`NOT_VALIDATED`. Elle ne contient ni secret, ni longueur, ni URL avec credential.

## Smoke test post-déploiement

1. Vérifier l'endpoint de readiness avec un compte `SUPER_ADMIN`.
2. Confirmer que `emailOutbound`, `emailWebhook` et `emailLive` sont `READY`,
   et le SMS volontairement
   `NOT_VALIDATED` tant que sa validation n'est pas terminée.
3. Tester l'inscription avec une destination de test contrôlée.
4. Vérifier la réception et la consommation unique de l'OTP.
5. Vérifier la récupération d'accès et le géocodage d'une adresse de test.
6. Ne déclencher aucune alerte réelle pendant ce smoke test.

La procédure de rotation coordonnée des secrets et des jetons actifs reste à
définir dans un lot ultérieur.
