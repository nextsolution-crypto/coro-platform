# SP-OPS-04A — Acceptation Brevo

Date de qualification : 2026-11-05 (America/Toronto)

Référence production examinée : `98a7de977935c9cfea41fc3333998df02ceb341b`

## Échelle de preuve

- **VÉRIFIÉ TECHNIQUEMENT** : démontré par le code, un test exécuté ou une observation réseau non mutante.
- **CONFIRMÉ PAR CONFIGURATION** : présence/forme démontrée dans la configuration CORO, sans preuve du compte fournisseur.
- **CONFIRMÉ PAR LE FOURNISSEUR** : état positif observé dans Brevo ou retourné par son API.
- **NOT_VERIFIED** : preuve insuffisante ou interface fournisseur inaccessible.

## Résultats

| Contrôle | Statut | Preuve |
|---|---|---|
| Transport courriel `POST /v3/smtp/email` | VÉRIFIÉ TECHNIQUEMENT | `PopulationDeliveryService`, tests simulés réussis |
| Transport SMS transactionnel `POST /v3/transactionalSMS/send` | VÉRIFIÉ TECHNIQUEMENT | `PopulationDeliveryService`, tests simulés réussis |
| Clé API présente et valide en production | NOT_VERIFIED | GitHub ne contient pas cette clé; validation serveur/fournisseur non exécutée |
| Expéditeur `info@getcoro.io` autorisé | NOT_VERIFIED | DNS favorable, mais statut du sender Brevo non observé |
| Domaine `getcoro.io` | CONFIRMÉ PAR CONFIGURATION | Brevo code, deux CNAME DKIM et DMARC publiés publiquement |
| TFN `+1 833 588-6812` approuvé | NOT_VERIFIED | l'ancien rejet `30527` n'est pas réputé actif, mais aucune preuve actuelle positive n'est disponible |
| SMS transactionnel vers le Canada | NOT_VERIFIED | dépend du TFN, du compte et des crédits Brevo |
| Coût de la campagne inférieur à 1,00 CAD | NOT_VERIFIED | plafond CORO vérifié; tarif et crédits du compte non observés |
| Webhooks Bearer | VÉRIFIÉ TECHNIQUEMENT | schéma Brevo officiel compatible et contrôleurs CORO testés |
| Webhooks réellement enregistrés dans Brevo | NOT_VERIFIED | configuration du compte non accessible |

La documentation officielle Brevo confirme l'authentification `auth.type=bearer` des webhooks :
<https://developers.brevo.com/docs/secured-webhooks>. Le contrat de création expose également `auth`, `channel=email|sms` et les événements transactionnels : <https://developers.brevo.com/reference/create-webhook>.

## DNS public observé

- TXT racine : un `brevo-code` est publié.
- DKIM : `brevo1._domainkey.getcoro.io` et `brevo2._domainkey.getcoro.io` pointent vers Brevo.
- DMARC : `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`.
- MX : réception chez Private Email.

Brevo précise que l'authentification de domaine repose sur le code Brevo, DKIM et DMARC; SPF/MX ne sont pas requis hors IP dédiée : <https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC>.

## Vérifications exécutées

- 5 suites ciblées sécurité/fournisseur : **76 tests réussis**.
- suite `population.service.spec.ts` : **306 tests réussis**.
- build backend : **réussi**.
- CI/release du SHA de production : workflow `42133657233`, **SUCCESS**.
- inspection lecture seule : `42135861007`, **SUCCESS**.
- capacité lecture seule : `42135872060`, **SUCCESS**, releaseReady=true.
- aucun appel Brevo, aucun SMS et aucun courriel réel.

## Défaut de raccordement découvert

Les variables `POPULATION_CONTROLLED_LIVE_TEST_*`, `POPULATION_BREVO_EMAIL_SENDER_VERIFIED` et `POPULATION_SMS_TFN_APPROVED` sont consommées par le code, mais ne figurent ni dans le bloc `backend.environment` de `docker-compose.yml`, ni dans `.env.example`. Une valeur placée dans le `.env` hôte ne serait donc pas transmise au conteneur.

Conséquence : le mode reste correctement désactivé, mais **SP-OPS-04B ne peut pas être activé gouvernément** sur cette composition. Un correctif de raccordement, avec valeurs par défaut fail-closed, revue, CI et release distincte est requis.

## Verdict Brevo

**NO-GO POUR UN ENVOI RÉEL.** L'intégration est techniquement prête en simulation, mais les états fournisseur, la configuration runtime et le raccordement Compose ne sont pas tous démontrés.
