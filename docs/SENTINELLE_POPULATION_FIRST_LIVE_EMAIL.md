# Sentinelle Population - premier test LIVE courriel

Cette procédure prépare un test contrôlé. Elle ne déclenche aucun envoi et ne doit jamais être appliquée au programme Prémont, qui demeure en mode `SANDBOX`.

## Environnement isolé

Créer avec les outils d'administration habituels une organisation cliente de validation, un bâtiment distinct, puis un `RueFacilityProfile` propre à ce bâtiment. Le profil doit être explicitement évalué `CONFIRMED_SUBJECT` et avoir Population activé. Créer ensuite un programme nommé **Sentinelle Population - Validation LIVE** avec un `publicSlug` unique.

Configuration attendue :

- `status = ACTIVE`
- `deliveryMode = LIVE`
- `governanceMode = STANDARD`
- `registrationEnabled = true`
- `emailEnabled = true`
- `smsEnabled = false`
- aucun abonné synthétique et aucune fixture

Créer un scénario de test validé et actif, une zone d'impact exploitable, ainsi que des instructions publiques portant clairement la mention TEST. Ne copier aucun identifiant de bâtiment, profil, programme, scénario, zone ou abonné de Prémont.

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
