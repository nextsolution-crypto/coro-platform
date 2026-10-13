# CORO — Sentinelle Population — dossier TFN Canada

Statut : **HUMAN LEGAL REVIEW REQUIRED · PUBLIC DEPLOYMENT PENDING · CARRIER APPROVAL PENDING**

Ce document est un dossier de revue et de resoumission. Il ne constitue ni une preuve de déploiement, ni une approbation TFN, ni une preuve d’envoi réel.

## 1. Matrice de traçabilité

| ID | Exigence | Autorité / implémentation | Preuve attendue avant resoumission |
|---|---|---|---|
| PRIV-01 | Données d’adhésion SMS non vendues | `/privacy`, section 6A FR/EN | HTTPS public + revue juridique |
| PRIV-02 | Aucun partage marketing avec tiers ou affiliés | `/privacy`, section 6A FR/EN | HTTPS public + revue juridique |
| TERMS-01 | Fréquence variable | `/sms-terms`, section 3 | Capture FR/EN |
| TERMS-02 | Catégories de messages | `/sms-terms`, section 2 | Capture FR/EN |
| TERMS-03 | Soutien | `/sms-terms`, sections 4 et 7 | Coordonnées vérifiées humainement |
| TERMS-04/05 | STOP / HELP | `/sms-terms`, section 4 | Capture + contrat webhook automatisé |
| TERMS-06 | Frais de messagerie/données | `/sms-terms`, section 3 | Capture FR/EN |
| TERMS-07 | Limitation transporteur / livraison | `/sms-terms`, section 5 | Capture FR/EN |
| TERMS-08 | Liens juridiques directs | `/sms-terms`, `/privacy`, `/terms` | Vérification HTTPS après déploiement |
| OPTIN-01/02 | Adhésion affirmative, décochée par défaut | `PopulationRegistration`, `PopulationContactProfile` | Capture locale puis publique |
| OPTIN-03..07 | Fréquence, frais, STOP, HELP et liens | `smsCompliance.ts` + surfaces publiques | Tests de contrat + captures |
| OPTIN-08 | URL identique à la soumission | mapping §2 | Comparaison humaine avec formulaire Brevo |
| OPTIN-09 | Parcours réel complet | checklist §4 | **EVIDENCE CAPTURE PENDING** |
| OPTIN-10 | Version + snapshot | `PopulationSmsConsentEvidence` append-only | Tests backend/PostgreSQL |
| SAMPLE-01..05 | Exemples OTP, test, alerte, mise à jour, fin d’alerte, STOP/HELP | §3 | Revue opérations/carrier |
| BUSINESS-01 | Nom complet du représentant | Corrigé par l’opérateur dans Brevo | **PENDING BREVO RECONFIRMATION** |

## 2. Mapping public autoritatif proposé

| Document | Français | English |
|---|---|---|
| Confidentialité | `https://getcoro.io/privacy` | `https://getcoro.io/privacy?lang=en` |
| Conditions générales | `https://getcoro.io/terms` | `https://getcoro.io/terms?lang=en` |
| Conditions SMS | `https://getcoro.io/sms-terms` | `https://getcoro.io/sms-terms?lang=en` |
| Opt-in citoyen | `https://client.getcoro.io/population/<publicSlug>` | Même URL, puis sélection English dans l’interface |

Les URL `/sms-terms` sont **proposées et vérifiées dans le code uniquement**. Elles ne doivent pas être déclarées publiques dans une demande transporteur avant vérification HTTPS après déploiement.

## 3. Exemples de messages pour soumission transporteur

Ces textes sont des **SAMPLES** et non des modèles de production ni une preuve d’envoi. La segmentation doit être revérifiée avec l’outil/provider final : les accents et caractères typographiques peuvent déclencher UCS-2 et augmenter le nombre de segments.

### OTP déclenché par l’utilisateur

- FR : `[SAMPLE] CORO Sentinelle Population : votre code de vérification est 123456. Il expire bientôt. Ne partagez pas ce code. Répondez STOP pour vous désabonner ou HELP pour obtenir de l’aide.`
- EN : `[SAMPLE] CORO Sentinelle Population: your verification code is 123456. It expires soon. Do not share this code. Reply STOP to unsubscribe and HELP for help.`

### Test ou exercice

- FR : `[SAMPLE] EXERCICE — Sentinelle Population, Ville Exemple. Ceci est un test; aucune urgence et aucune action requise. Répondez STOP pour vous désabonner ou HELP pour obtenir de l’aide.`
- EN : `[SAMPLE] EXERCISE — Sentinelle Population, Example City. This is a test; there is no emergency and no action is required. Reply STOP to unsubscribe and HELP for help.`

### Alerte et consigne de protection

- FR : `[SAMPLE] ALERTE — Ville Exemple : incident dans le secteur Exemple. Évitez la zone et suivez les consignes des autorités. En danger immédiat, composez le 911.`
- EN : `[SAMPLE] ALERT — Example City: incident in the Example area. Avoid the area and follow official instructions. For immediate danger, call 911.`

### Mise à jour opérationnelle

- FR : `[SAMPLE] MISE À JOUR — Ville Exemple : l’intervention se poursuit. Maintenez les mesures de protection communiquées. Prochaine mise à jour lorsqu’une information confirmée sera disponible.`
- EN : `[SAMPLE] UPDATE — Example City: response operations continue. Maintain the communicated protective measures. Another update will follow when confirmed information is available.`

### Fin d’alerte

- FR : `[SAMPLE] FIN D’ALERTE — Ville Exemple : les mesures de protection liées à cet incident sont levées. Restez attentif aux communications officielles.`
- EN : `[SAMPLE] ALL CLEAR — Example City: protective measures related to this incident have been lifted. Continue to monitor official communications.`

### STOP / HELP

- Entrants attendus : `STOP`, `UNSUBSCRIBE`, `HELP`.
- Brevo fournit l’aide de base. CORO enregistre et classe HELP mais ne promet pas une seconde réponse automatique.
- STOP/UNSUBSCRIBE doivent créer ou conserver la suppression globale canonique avant tout nouvel envoi.

## 4. Checklist de preuve du parcours

Utiliser exclusivement un programme synthétique, une personne synthétique et un numéro masqué dans toute capture.

1. Ouvrir l’URL publique `https://client.getcoro.io/population/<publicSlug>` sans authentification.
2. Capturer l’identité du programme et le rôle de CORO comme fournisseur technologique.
3. Ouvrir l’inscription et capturer le choix des canaux.
4. Saisir un numéro synthétique/contrôlé; capturer la case initialement décochée.
5. Capturer la disclosure complète : catégories, fréquence, frais, STOP, HELP et liens directs.
6. Ouvrir chacun des liens FR, puis EN, et capturer l’URL HTTPS finale.
7. Cocher volontairement la case et soumettre sur une infrastructure autorisée.
8. Capturer la confirmation sans exposer OTP, jeton, numéro brut ou identifiant interne.
9. Répéter aux formats mobile FR et EN.
10. Pour le changement PHONE, capturer la disclosure identique, la nouvelle acceptation et la gestion d’une version devenue stale.

État actuel : **CODE VERIFIED · LOCAL UI CAPTURE PENDING · PUBLIC DEPLOYMENT PENDING · HUMAN LEGAL APPROVAL PENDING · CARRIER APPROVAL PENDING**.

## 5. Configuration humaine du consentement

Ne modifier aucun programme automatiquement. Après approbation juridique et déploiement :

1. Vérifier qu’aucune inscription en attente ni challenge PHONE actif ne serait rendu incohérent.
2. Préparer un texte de programme FR/EN décrivant `PROGRAM + SELECTED CHANNELS` sans recopier ni contredire la disclosure transporteur code-owned.
3. Choisir une nouvelle version explicite, par exemple `tfn-2026-10-13-v1`, uniquement après validation humaine de la date et du texte.
4. Mettre à jour le programme par l’autorité administrative existante et auditée.
5. Vérifier qu’un client avec l’ancienne version reçoit un rejet stale et doit relire/consentir.
6. Ne jamais réécrire les événements ou preuves historiques.

## 6. Brouillon de réponse à Kayla — NE PAS ENVOYER

Subject: CORO Sentinelle Population — Canadian TFN compliance materials

Hello Kayla,

Thank you for outlining the remaining Canadian TFN requirements. The business representative’s full surname has been corrected by our operator in Brevo and remains pending Brevo reconfirmation.

We have prepared bilingual privacy wording, dedicated SMS terms, the citizen opt-in journey, and representative message samples. Before submitting final links and screenshots, our legal and operations reviewers will approve the wording and we will verify each URL over public HTTPS after deployment. We understand that our TFN is not yet approved and that the exact Canadian sender value must be confirmed by Brevo before any further live test.

Our package will include:

- final French and English Privacy Policy URLs and the SMS opt-in data clause;
- final French and English SMS Terms URLs;
- the public opt-in URL and authentic journey screenshots showing an unchecked checkbox, full disclosure, and legal links;
- representative OTP, exercise, emergency/protective-action, update, all-clear, STOP and HELP examples;
- confirmation that global SMS activation remains disabled pending carrier approval and a controlled validation.

We will not represent samples as delivery evidence or perform another live SMS attempt before TFN approval and sender confirmation.

Regards,
CORO

## 7. Handoff après revue humaine

1. Revue juridique/confidentialité/opérations.
2. Commits, PR et merge indépendants selon la propriété de déploiement confirmée.
3. Déployer le site et le portail.
4. Vérifier les URL HTTPS, FR/EN, canonical/hreflang, mobile et accès sans authentification.
5. Capturer le parcours public synthétique.
6. Versionner prudemment la configuration de consentement si requis.
7. Soumettre le dossier Brevo, sans envoyer le brouillon automatiquement.
8. Attendre l’approbation TFN et la valeur exacte du sender canadien.
9. Effectuer ultérieurement un changement sender distinct et approuvé; conserver `POPULATION_SMS_PRODUCTION_VALIDATED=false`.
10. Effectuer un précheck, puis un seul essai LIVE approuvé, et valider HELP/START/STOP ainsi que la suppression globale.
