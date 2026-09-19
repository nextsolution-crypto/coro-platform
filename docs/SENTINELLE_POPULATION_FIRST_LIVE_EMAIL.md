# Sentinelle Population - premier test LIVE courriel

Cette procédure prépare un test contrôlé. Elle ne déclenche aucun envoi et ne doit jamais être appliquée au programme Prémont, qui demeure en mode `SANDBOX`.

## Environnement isolé

Créer d'abord l'organisation cliente, le client et le bâtiment distinct avec l'interface d'administration. Le bâtiment doit posséder ses coordonnées publiques de site. Relever ensuite son `buildingId` dans la fiche ou la requête d'administration.

Le helper manuel `admin:population-live-setup` crée le profil RUE, le scénario TEST, la zone TEST et le programme Population. Il ne crée ni bâtiment, ni utilisateur, ni abonné. Il refuse explicitement le bâtiment et le slug Prémont.

Exécuter obligatoirement le dry-run depuis `coro-backend` avant l'initialisation réelle :

```powershell
$env:ALLOW_POPULATION_LIVE_SETUP='true'; $env:BUILDING_ID='<buildingId>'; $env:PUBLIC_SLUG='<slug-unique>'; $env:DRY_RUN='true'; npm run admin:population-live-setup
```

Après contrôle des identifiants et des modes affichés, exécuter le setup dans une nouvelle commande contrôlée :

```powershell
$env:ALLOW_POPULATION_LIVE_SETUP='true'; $env:BUILDING_ID='<buildingId>'; $env:PUBLIC_SLUG='<slug-unique>'; $env:DRY_RUN='false'; npm run admin:population-live-setup
```

La garde ne doit jamais être ajoutée à la configuration permanente du service. Le programme est volontairement laissé en `CONFIGURING`; ne pas le modifier directement en base.

Configuration attendue :

- `status = CONFIGURING`, puis transitions métier `READY` et `ACTIVE` dans le portail client
- `deliveryMode = LIVE`
- `governanceMode = STANDARD`
- `registrationEnabled = true`
- `emailEnabled = true`
- `smsEnabled = false`
- aucun abonné synthétique et aucune fixture

Créer un scénario de test validé et actif, une zone d'impact exploitable, ainsi que des instructions publiques portant clairement la mention TEST. Ne copier aucun identifiant de bâtiment, profil, programme, scénario, zone ou abonné de Prémont.

## Contrôles après setup

Contrôler en base, sans afficher de donnée citoyenne, que les quatre IDs retournés sont reliés au bon bâtiment, que le programme est `CONFIGURING`, `LIVE`, `STANDARD`, courriel activé et SMS désactivé, et qu'il ne contient aucun subscriber. Contrôler aussi le scénario et la zone TEST actifs et validés.

L'accès opérateur n'est pas modifié par le helper. Dans l'administration client, rattacher uniquement l'utilisateur de validation approprié au nouveau `buildingId`, puis lui attribuer explicitement `POPULATION_PREPARE`, `POPULATION_APPROVE` et `POPULATION_SEND`. Ne pas étendre automatiquement tous les `ClientUser`.

Dans le portail client, ouvrir Sentinelle Population pour ce bâtiment, compléter les contrôles de configuration, effectuer la transition `CONFIGURING` vers `READY`, puis vers `ACTIVE`. L'URL publique devient `/population/<publicSlug>` sur l'origine du portail citoyen. Le premier subscriber doit ensuite suivre le parcours public normal : inscription, OTP, activation et localisation.

Avant toute transition, confirmer une dernière fois que le programme Prémont est toujours `SANDBOX` et qu'aucune opération du test ne le cible.

Le seul abonné réel doit s'inscrire depuis le portail public normal, confirmer l'OTP et atteindre l'état `ACTIVE`. Aucune adresse ou destination personnelle ne doit être placée dans un seed, une migration, un script ou ce document.

## Message du test

### Français

**Titre**

TEST CORO - Sentinelle Population - Aucune urgence réelle

**Message**

TEST DE DEMONSTRATION CORO.

Ceci est un essai contrôlé du système Sentinelle Population.

Aucune situation d'urgence réelle n'est en cours.

Aucune action de protection n'est requise.

### English

**Title**

CORO TEST - Sentinelle Population - No real emergency

**Message**

CORO DEMONSTRATION TEST.

This is a controlled test of the Sentinelle Population system.

There is no real emergency in progress.

No protective action is required.

## Checklist avant le test

- [ ] Sauvegarde de la base terminée et vérifiée.
- [ ] Backend stable et version déployée confirmée.
- [ ] Readiness `emailLive = READY`.
- [ ] Webhook Brevo actif et secret configuré.
- [ ] Expéditeur, DKIM et DMARC vérifiés.
- [ ] Programme de validation distinct en mode `LIVE`.
- [ ] Programme Prémont toujours en mode `SANDBOX`.
- [ ] SMS désactivé sur le programme de validation.
- [ ] Exactement un abonné réel `ACTIVE` issu du workflow normal.
- [ ] Exactement un courriel délivrable.
- [ ] Aucun abonné synthétique délivrable.
- [ ] Scénario explicitement identifié comme TEST.
- [ ] Titre et message portent clairement TEST / DEMONSTRATION.
- [ ] Opérateur authentifié avec `POPULATION_PREPARE`, `POPULATION_APPROVE` et `POPULATION_SEND` selon son rôle réel.

## Freeze

- [ ] Le preview montre exactement un abonné ciblé.
- [ ] Le roster figé contient exactement une communication.
- [ ] Le roster contient un courriel et zéro SMS.
- [ ] Aucune suppression inattendue.
- [ ] Aucun nom, courriel, téléphone ou emplacement citoyen n'est affiché.

## Juste avant DIFFUSER L'ALERTE

- [ ] La confirmation porte la mention **DIFFUSION REELLE**.
- [ ] Le scénario et le type d'alerte sont corrects.
- [ ] Le préflight backend indique `mode=LIVE` et `ready=true`.
- [ ] `targetedPeople=1`, `deliverable=1`, `email=1`, `sms=0`.
- [ ] `synthetic=0`, `retryPending=0`, `reconciliation=0`.
- [ ] Capture opérateur du résumé agrégé effectuée sans PII.
- [ ] Une seconde personne confirme verbalement le périmètre du test, même en gouvernance `STANDARD`.

Cette étape est le point d'arrêt de la préparation automatisée. Le clic final doit être une décision humaine explicite pendant la fenêtre de test approuvée.

## Après le clic humain contrôlé

- [ ] Une seule livraison passe à `SENDING`, puis `SENT` après acceptation fournisseur.
- [ ] L'interface distingue **Accepté par le fournisseur** de **Livré au destinataire**.
- [ ] Le webhook fait évoluer la livraison à `DELIVERED`.
- [ ] Un seul événement fournisseur correspondant existe; aucun doublon logique.
- [ ] `providerMessageId` demeure interne et n'apparaît pas dans le portail.
- [ ] L'alerte et ses agrégats sont cohérents.
- [ ] Les journaux ne contiennent ni destination, ni message privé, ni secret.
- [ ] La preuve est contrôlée en base sans afficher la destination.
- [ ] L'événement est contrôlé dans Brevo par une personne autorisée.
- [ ] L'alerte est terminée et le résultat du test est documenté.

## Arrêt immédiat

Ne pas diffuser si un compteur diffère du protocole, si une réconciliation ou une reprise est en attente, si un canal SMS apparaît, si un destinataire synthétique devient délivrable, ou si l'état du webhook/readiness n'est plus `READY`.
