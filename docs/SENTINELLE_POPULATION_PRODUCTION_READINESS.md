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

Le readiness vérifie seulement leur présence et le format du courriel. La
livraison réelle doit être confirmée par un smoke test contrôlé.

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
2. Confirmer que le courriel est `READY` et le SMS volontairement
   `NOT_VALIDATED` tant que sa validation n'est pas terminée.
3. Tester l'inscription avec une destination de test contrôlée.
4. Vérifier la réception et la consommation unique de l'OTP.
5. Vérifier la récupération d'accès et le géocodage d'une adresse de test.
6. Ne déclencher aucune alerte réelle pendant ce smoke test.

La procédure de rotation coordonnée des secrets et des jetons actifs reste à
définir dans un lot ultérieur.
