# SP-OPS-04A — Sécurité des webhooks

## Contrat CORO

- Courriel : `POST /api/webhooks/brevo/population/email`.
- SMS : `POST /api/webhooks/brevo/population/sms`.
- Secrets Bearer indépendants; comparaison résistante au timing.
- corrélation par identifiant fournisseur et identifiant CORO;
- événements persistés avec unicité et déduplication;
- projection monotone des états;
- payload brut, contenu et destination non conservés comme preuve applicative;
- STOP/HELP/réponses et suppression SMS traités séparément.

Les GET sans authentification ont retourné `404`, ce qui est attendu pour des routes POST uniquement. L'endpoint interne de readiness sans JWT a retourné `401`.

## Compatibilité Brevo

**VÉRIFIÉ TECHNIQUEMENT.** Brevo documente explicitement :

```json
"auth": { "type": "bearer", "token": "..." }
```

Source : <https://developers.brevo.com/docs/secured-webhooks>. Les schémas d'événements courriel et SMS, dont `message-id`, `messageId`, `reference`, `delivered`, les rebonds et les crédits SMS, sont documentés ici : <https://developers.brevo.com/docs/transactional-webhooks>.

## Tests exécutés

- signature/refus sans Bearer;
- mauvais secret;
- doublon;
- ordre d'événements contradictoire;
- message inconnu;
- livraison, report, rebond, blocage et erreur;
- STOP/HELP/subscribe/unsubscribe/reply;
- corrélation et refus inter-organisation.

Résultat ciblé inclus dans les **76 tests réussis**.

## Limites fournisseur

| Élément | Statut |
|---|---|
| Contrat Bearer compatible | VÉRIFIÉ TECHNIQUEMENT |
| Secrets structurés dans Compose | CONFIRMÉ PAR CONFIGURATION |
| Secrets valides présents dans le conteneur de production | NOT_VERIFIED |
| Webhook courriel créé, actif, non batché et correctement filtré | NOT_VERIFIED |
| Webhook SMS créé et actif | NOT_VERIFIED |
| Test webhook Brevo reçu avec HTTP 200 | NOT_VERIFIED |
| Capacité fournisseur réponse/désabonnement SMS | CONFIRMÉ PAR LE FOURNISSEUR |
| Réception réelle de ces événements par CORO | NOT_VERIFIED |

## Verdict

**WEBHOOKS : READY_WITH_CONDITIONS.** Aucun défaut de contrat n'est démontré; l'enregistrement réel et le test fournisseur restent à constater.
