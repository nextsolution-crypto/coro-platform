# SP-OPS-03 — Préparation Brevo

## Inventaire du produit

- Courriel : `POST /v3/smtp/email`, clé `BREVO_API_KEY`, expéditeur `BREVO_SENDER_EMAIL`, idempotence fournisseur et webhook signé `/webhooks/brevo/population/email`.
- SMS : `POST /v3/transactionalSMS/send`, clé `BREVO_API_KEY`, expéditeur `BREVO_SMS_SENDER` et webhook signé `/webhooks/brevo/population/sms`.
- Les erreurs HTTP, 429, timeout, résultat inconnu, reprise et réconciliation ont déjà des états distincts.
- Les événements fournisseur sont corrélés aux livraisons persistées; aucun destinataire n'est publié dans les preuves.

## État démontré

| Contrôle | Statut |
|---|---|
| Adaptateurs courriel et SMS | TESTÉ AVEC FOURNISSEUR SIMULÉ |
| Séparation organisations | TESTÉE |
| PAUSED/BLOCK prioritaire | TESTÉ |
| Clé API réellement valide | NOT_VERIFIED |
| Expéditeur courriel vérifié chez Brevo | NOT_VERIFIED |
| TFN canadien enregistré/approuvé | NOT_VERIFIED |
| Permissions réelles de diffusion | NOT_VERIFIED |
| Webhooks réellement joignables par Brevo | NOT_VERIFIED |
| Livraison réelle | INTERDITE / NON EXÉCUTÉE |

Le canal SMS est bloqué par code tant que `POPULATION_SMS_TFN_APPROVED=true` et `POPULATION_SMS_PRODUCTION_VALIDATED=true` ne sont pas tous deux attestés. Une simple présence de clé API ne suffit pas.

## Coût

Le code impose un plafond configuré et refuse toute valeur supérieure à 500 cents CAD. Le plafond proposé pour la première campagne est **100 cents CAD (1,00 CAD)**. Le prix unitaire contractuel Brevo n'a pas été vérifié dans ce chantier et doit être confirmé avant autorisation finale.
