# SP-OPS-04A — Verdict final

Date : 2026-11-05 (America/Toronto)

SHA production : `98a7de977935c9cfea41fc3333998df02ceb341b`

## Matrice finale

| Domaine | Verdict | Niveau de preuve |
|---|---|---|
| Courriel — implémentation | PASS | VÉRIFIÉ TECHNIQUEMENT |
| Courriel — sender/compte Brevo | NOT_VERIFIED | fournisseur non accessible |
| SMS — implémentation | PASS | VÉRIFIÉ TECHNIQUEMENT |
| SMS — TFN Canada | NOT_VERIFIED | fournisseur non accessible |
| SMS — crédits/coût | NOT_VERIFIED | fournisseur non accessible |
| Webhooks — contrat/authentification | PASS | VÉRIFIÉ TECHNIQUEMENT |
| Webhooks — enregistrement réel | NOT_VERIFIED | fournisseur non accessible |
| Destinataire | NOT_READY | coordonnées et consentement non enregistrés |
| Sécurité PAUSED/BLOCK/STOP | PASS en simulation | VÉRIFIÉ TECHNIQUEMENT |
| Double approbation, idempotence, isolement | PASS en simulation | VÉRIFIÉ TECHNIQUEMENT |
| Simulation sans fournisseur | PASS | 382 tests ciblés/service + build |
| Raccordement runtime du mode contrôlé | FAIL | variables absentes de Compose |
| Essai réel | NO-GO | conditions ci-dessus ouvertes |

## Verdict unique

**NO-GO POUR SP-OPS-04B À CETTE DATE.**

L'architecture de sécurité et les adaptateurs sont prêts en simulation. Le mode réel demeure désactivé et PAUSED/BLOCK/STOP n'ont pas été contournés. Il reste quatre familles de conditions :

1. corriger et livrer le raccordement fail-closed des variables SP-OPS-03 dans Compose;
2. obtenir les preuves Brevo actuelles (TFN, sender, API, webhooks, crédits/coût);
3. enregistrer hors Git le destinataire et son consentement;
4. obtenir une autorisation distincte du message exact et de la destination masquée.

## Checklist manuelle Brevo — parcours exact

1. **TFN** — `Brevo > Settings > Senders, Domains & Dedicated IPs > SMS senders / Sender registration` : relever le statut exact de `+1 833 588-6812` et la capacité Canada transactionnelle.
2. **Courriel** — `Settings > Senders, Domains & Dedicated IPs > Senders` : confirmer `info@getcoro.io` actif; puis `Domains` : confirmer `getcoro.io` **Authenticated**.
3. **API** — `Settings > SMTP & API > API Keys` : confirmer la clé CORO **Active**, sa dernière utilisation récente, ses permissions et l'absence de blocage IP. Ne jamais copier la clé.
4. **Webhooks** — `Transactional > Settings > Webhooks` : confirmer deux webhooks actifs vers les routes CORO, canal email/SMS, auth Bearer, non batché pour le courriel et événements attendus.
5. **Crédits** — `My Plan > SMS & WhatsApp` : relever le solde et le prix affiché pour un SMS transactionnel Canada; confirmer que SMS + courriel restent sous 1,00 CAD.

Pour chaque point, consigner uniquement le statut, la date et une capture masquée. Aucun secret, token, destination personnelle ou URL credentialisée.

## Commandes serveur en lecture seule à faire exécuter par un opérateur autorisé

Ces commandes ne modifient pas la production et n'affichent aucune valeur de secret.

```bash
cd /opt/coro-platform

# Présence et états fail-closed vus par le conteneur actif.
docker compose exec -T backend node - <<'NODE'
const names = [
  'BREVO_API_KEY','BREVO_SENDER_EMAIL','BREVO_SMS_SENDER',
  'POPULATION_BREVO_WEBHOOK_SECRET','POPULATION_BREVO_SMS_WEBHOOK_SECRET',
  'POPULATION_SMS_PRODUCTION_VALIDATED','POPULATION_CONTROLLED_LIVE_TEST_ENABLED',
  'POPULATION_CONTROLLED_LIVE_TEST_STOP','POPULATION_CONTROLLED_LIVE_TEST_ORGANIZATION_ID',
  'POPULATION_CONTROLLED_LIVE_TEST_PROGRAM_ID','POPULATION_CONTROLLED_LIVE_TEST_EMAIL_SHA256',
  'POPULATION_CONTROLLED_LIVE_TEST_SMS_SHA256','POPULATION_CONTROLLED_LIVE_TEST_MAX_CAMPAIGN_CAD_CENTS',
  'POPULATION_BREVO_EMAIL_SENDER_VERIFIED','POPULATION_SMS_TFN_APPROVED'
];
for (const n of names) {
  const v = process.env[n]?.trim();
  const state = n.endsWith('_ENABLED') || n.endsWith('_STOP') || n.endsWith('_VALIDATED') || n.endsWith('_VERIFIED') || n.endsWith('_APPROVED')
    ? (v === 'true' ? 'TRUE' : v === 'false' ? 'FALSE' : 'UNSET')
    : (v ? 'CONFIGURED' : 'UNSET');
  console.log(`${n}=${state}`);
}
NODE

# Vérifier la clé auprès de Brevo sans envoyer de message ni afficher le compte.
docker compose exec -T backend node - <<'NODE'
const key=process.env.BREVO_API_KEY;
if(!key){ console.log('BREVO_ACCOUNT=NOT_CONFIGURED'); process.exit(0); }
fetch('https://api.brevo.com/v3/account',{headers:{accept:'application/json','api-key':key}})
  .then(r=>console.log(`BREVO_ACCOUNT_HTTP=${r.status}`))
  .catch(()=>{ console.log('BREVO_ACCOUNT_HTTP=NETWORK_ERROR'); process.exitCode=1; });
NODE

# Lister les webhooks sous forme minimisée; aucun token n'est imprimé.
docker compose exec -T backend node - <<'NODE'
const key=process.env.BREVO_API_KEY;
if(!key){ console.log('BREVO_WEBHOOKS=NOT_CONFIGURED'); process.exit(0); }
fetch('https://api.brevo.com/v3/webhooks?type=transactional',{headers:{accept:'application/json','api-key':key}})
 .then(async r=>({status:r.status,body:r.ok?await r.json():null}))
 .then(({status,body})=>{
   console.log(`BREVO_WEBHOOKS_HTTP=${status}`);
   for(const w of body?.webhooks||[]){
     let u; try{u=new URL(w.url)}catch{continue}
     if(u.hostname!=='api.getcoro.io'||!u.pathname.includes('/webhooks/brevo/population/')) continue;
     console.log(JSON.stringify({id:w.id,type:w.type,channel:w.channel,host:u.hostname,path:u.pathname,events:w.events,batched:w.batched,authType:w.auth?.type||null}));
   }
 }).catch(()=>{console.log('BREVO_WEBHOOKS_HTTP=NETWORK_ERROR');process.exitCode=1});
NODE
```

Résultats attendus avant SP-OPS-04B : compte HTTP 200; deux webhooks minimisés conformes; toutes les valeurs nécessaires `CONFIGURED`; `ENABLED=FALSE` et `STOP=TRUE` jusqu'à l'autorisation finale.
