# SP-OPS-04A — Statut TFN Canada

Numéro attendu : `+1 833 588-6812`

Nom légal communiqué : `MONTAROUX, MATHIEU`

## Preuve fournisseur reçue

- TFN : `+18335886812`.
- nom légal : `MONTAROUX, MATHIEU`.
- approbation Twilio : 20 octobre 2026.
- approbation reflétée dans le compte Brevo.
- SMS transactionnels autorisés vers le Canada et les États-Unis.
- sender API requis : `+18335886812` en E.164, jamais `CORO`.
- SMS bidirectionnel, réponses et désabonnements supportés.
- l'ancien rejet concernait un essai antérieur à l'approbation.

**TFN : CONFIRMÉ PAR LE FOURNISSEUR.** Le rejet historique Twilio `30527` est conservé comme antécédent clos et ne constitue plus un blocage courant.

Brevo indique que l'enregistrement d'un sender est obligatoire et que les États-Unis/Canada utilisent un numéro sans frais; l'envoi doit rester suspendu tant que l'enregistrement n'est pas approuvé : <https://help.brevo.com/hc/en-us/articles/28255350696466-Register-a-Sender-ID-to-send-SMS-messages>. Les règles Canada/États-Unis sont également décrites ici : <https://help.brevo.com/hc/en-us/articles/11884482521234-Country-specific-guidelines-and-restrictions-for-SMS-messages>.

## Contrôles CORO restant à exécuter

1. démontrer que le conteneur actif reçoit `BREVO_SMS_SENDER=+18335886812`, sans afficher d'autre configuration;
2. éliminer ou bloquer le fallback `CORO` pour le parcours contrôlé;
3. démontrer l'accès API Brevo en lecture seule;
4. confirmer solde et prix d'un SMS canadien;
5. confirmer les webhooks réellement enregistrés et leur réponse HTTP 200.

Une capture masquée ou un constat humain daté suffit pour le dossier; aucun numéro personnel, identifiant de dossier ou secret ne doit être commité.
