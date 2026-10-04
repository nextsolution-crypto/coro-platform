# Sentinelle Population — première validation SMS LIVE contrôlée

Cette procédure ferme uniquement le bootstrap de validation du transport SMS.
Elle ne valide pas automatiquement la production et n’active jamais
`POPULATION_SMS_PRODUCTION_VALIDATED`.

## Limites de sécurité

- Programme imposé : `coro-validation-live`.
- Une invocation accepte une seule destination et effectue au maximum une
  requête fournisseur.
- Message fixe `population-sms-live-validation/v1`; aucun texte, sender, URL
  fournisseur ou programme ne peut être fourni par l’opérateur.
- Canonicalisation CORO et `PopulationSmsSuppression` sont obligatoires.
- Aucun `PopulationAlert`, challenge, consentement ou abonnement n’est créé.
- Aucune relance automatique. Une issue ambiguë doit être réconciliée avant
  toute autre exécution.
- Les voies inscription, Citizen Profile, alertes, retry, resend et récupération
  restent bloquées tant que le gate global vaut faux.

**THIS COMMAND SENDS ONE REAL SMS en mode LIVE.** Le dry-run n’envoie rien.

## Préconditions

1. Déploiement revu contenant l’outil compilé.
2. Programme `coro-validation-live` existant, `ACTIVE`, `LIVE`, SMS activé et
   consentement configuré. L’outil ne le crée et ne le modifie pas.
3. Propriétaire du téléphone contrôlé explicitement consentant au SMS unique et
   aux réponses HELP puis STOP.
4. `BREVO_API_KEY`, `BREVO_SMS_SENDER` et
   `POPULATION_BREVO_SMS_WEBHOOK_SECRET` configurés, sans les afficher.
5. Dans la console Brevo, vérifier manuellement le service SMS, le sender pour
   le Canada, sa capacité de réponse, le callback
   `POST /api/webhooks/brevo/population/sms`, son authentification Bearer et
   l’absence de comportement fournisseur incompatible avec STOP.
6. `POPULATION_SMS_PRODUCTION_VALIDATED` doit rester faux.
7. Choisir un répertoire de preuve protégé, hors du dépôt. Le JSON contient la
   destination masquée seulement; son SHA-256 détecte une altération accidentelle
   mais ne signe pas la preuve.

## Exécution dans le backend déployé

La production ne contient pas `ts-node`. L’entrée compilée est :

```text
/app/dist/src/admin/run-population-sms-live-validation.js
```

Ne placez pas le téléphone dans la ligne de commande ou l’historique. Utilisez
une saisie masquée côté shell, puis injectez-la uniquement au processus
`docker compose exec`. N’ajoutez jamais ces variables au `.env` persistant.

### FUTURE OPERATOR COMMAND — DO NOT EXECUTE DURING IMPLEMENTATION

Dry-run, depuis l’hôte de production :

```bash
read -r -s -p 'Controlled phone: ' CONTROLLED_PHONE; printf '\n'
docker compose exec -T \
  -e POPULATION_SMS_LIVE_VALIDATION_MODE=DRY_RUN \
  -e POPULATION_SMS_LIVE_VALIDATION_PHONE="$CONTROLLED_PHONE" \
  -e POPULATION_SMS_LIVE_VALIDATION_EVIDENCE_DIR=/var/lib/coro/sms-validation \
  -e POPULATION_SMS_LIVE_VALIDATION_PROGRAM=coro-validation-live \
  -e DEPLOYED_GIT_SHA="$(git rev-parse HEAD)" \
  backend node /app/dist/src/admin/run-population-sms-live-validation.js
unset CONTROLLED_PHONE
```

Le résultat doit indiquer `DRY_RUN_READY`, `providerContacted=false` et
`liveValidation=false`. Il ne vaut pas approbation.

### FUTURE LIVE SMS COMMAND — REQUIRES HUMAN APPROVAL

Préparer rollback et revue des autres programmes avant cette commande. Une
seule exécution peut déjà avoir envoyé le SMS même si la sortie est ambiguë.

```bash
read -r -s -p 'Controlled phone: ' CONTROLLED_PHONE; printf '\n'
docker compose exec -T \
  -e POPULATION_SMS_LIVE_VALIDATION_MODE=LIVE \
  -e POPULATION_SMS_LIVE_VALIDATION_PHONE="$CONTROLLED_PHONE" \
  -e POPULATION_SMS_LIVE_VALIDATION_EVIDENCE_DIR=/var/lib/coro/sms-validation \
  -e POPULATION_SMS_LIVE_VALIDATION_PROGRAM=coro-validation-live \
  -e POPULATION_SMS_LIVE_VALIDATION_CONFIRM=SEND_ONE_CONTROLLED_SMS \
  -e DEPLOYED_GIT_SHA="$(git rev-parse HEAD)" \
  backend node /app/dist/src/admin/run-population-sms-live-validation.js
unset CONTROLLED_PHONE
```

Ne jamais relancer par réflexe après timeout ou résultat ambigu. Vérifier
d’abord console fournisseur, téléphone et preuve locale.

## Contrôles immédiatement après l’envoi

Conserver : UTC, SHA Git/image, version, slug, destination masquée, sender,
acceptation, identifiant fournisseur éventuel, exit code, chemin et hash de la
preuve. Compléter humainement le JSON ou une copie protégée : réception
`YES/NO/AMBIGUOUS`, heure et délai. Un HTTP 2xx n’est pas une réception handset.

### HELP

Si le sender accepte les réponses, répondre `HELP`. Vérifier via le webhook
authentifié que CORO a reçu et classé `HELP`. Actuellement CORO enregistre HELP
mais n’émet pas automatiquement de réponse HELP. L’acceptabilité carrier/légale
doit être confirmée avant approbation globale.

### STOP

Après HELP, répondre `STOP`. Vérifier, sans exposer le téléphone :

- événement entrant STOP/UNSUBSCRIBE;
- suppression canonique créée ou réutilisée;
- SMS désactivé pour l’abonné concerné selon les règles existantes;
- événements de consentement attendus;
- idempotence issue des invariants/tests existants.

Ne jamais supprimer cette suppression. Sans nouvel envoi fournisseur, vérifier
ensuite que la suppression est présente et que le send gate normal refuserait la
destination.

## Contrôles base PII-safe

Les requêtes futures doivent utiliser un identifiant de validation ou des
agrégats, jamais afficher le téléphone. Vérifier : HELP présent, STOP présent,
suppression présente, abonné pertinent désactivé, zéro alerte/challenge créé et
zéro livraison d’un autre programme.

## Revue du blast radius

Avant d’activer le gate global, inventorier tous les programmes ACTIVE/READY avec
`smsEnabled=true`, notamment `premont-boucherville`, ainsi que leurs alertes,
retry, vérifications, resend, récupérations et changements de contact en attente.
La validation doit être refusée si une activité non expliquée peut partir après
activation.

## Approbation humaine obligatoire

Tous les points doivent être `YES` :

- [ ] dry-run PASS;
- [ ] configuration et sender confirmés;
- [ ] fournisseur accepte le SMS unique;
- [ ] téléphone reçoit le message clairement marqué TEST;
- [ ] callback et capacité de réponse confirmés;
- [ ] HELP reçu/classé et politique HELP revue;
- [ ] STOP reçu/classé;
- [ ] suppression et gate post-STOP confirmés;
- [ ] aucun autre SMS observé;
- [ ] autres programmes et activités en attente revus;
- [ ] preuve protégée conservée;
- [ ] rollback prêt;
- [ ] approbateur et date consignés.

Tout `NO`, `UNKNOWN` ou `AMBIGUOUS` interdit l’activation.

## Activation séparée

Après approbation seulement, l’opérateur infrastructure peut mettre
`POPULATION_SMS_PRODUCTION_VALIDATED=true` dans la configuration protégée puis
recréer le backend. Vérifier `population.sms=READY` et
`population.contactChangeCrypto=READY`. Cette readiness est une attestation
outbound manuelle; elle ne prouve pas à elle seule webhook, reply, HELP, STOP ou
delivery receipt.

Le premier smoke test post-activation reste limité à `coro-validation-live`.
Ne pas utiliser Prémont.

## Rollback

1. Remettre `POPULATION_SMS_PRODUCTION_VALIDATED=false` dans la configuration
   protégée.
2. Exécuter `docker compose up -d --force-recreate backend`.
3. Vérifier `population.sms=NOT_VALIDATED` et le blocage des voies ordinaires.
4. Examiner toute requête déjà acceptée côté fournisseur.
5. Conserver les preuves et la suppression STOP légitime.

Tout rejet, timeout, absence handset, incapacité de réponse, échec HELP/STOP,
échec webhook/suppression, activité SMS inattendue ou perte de preuve bloque
l’approbation.

## Reprise du PHONE E2E

Reprendre Citizen Profile → Add phone → consentement → PHONE initiate → OTP →
verify → APPLY → refresh uniquement après validation live approuvée, gate global
activé intentionnellement, `population.sms=READY`, crypto READY, programme ACTIVE
et téléphone contrôlé non supprimé.

## Limites et suivis

- Le boolean global n’est pas lié à une preuve structurée.
- Les changements de configuration programme n’ont pas un historique dédié.
- La readiness ne prouve pas la santé inbound.
- La politique de réponse HELP reste à confirmer.
- Le statut carrier SMS est moins complet que celui de l’email.

Suivis recommandés : UX de readiness PHONE, politique HELP, attestation
structurée, enablement SMS par programme, readiness décomposée et cycle de statut
carrier SMS.
