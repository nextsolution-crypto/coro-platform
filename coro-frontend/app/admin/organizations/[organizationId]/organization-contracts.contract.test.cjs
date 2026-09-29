const fs=require('node:fs');const path=require('node:path');const source=fs.readFileSync(path.join(__dirname,'page.tsx'),'utf8');
for(const token of ['Current Contract','Contracts and history','OBSERVATION_ONLY','Enforcement','Billing']){if(!source.includes(token))throw new Error(`missing ${token}`);}
if(source.includes('BillingPanel'))throw new Error('Phase 2B must not add billing UI');
console.log('Organization contracts UI contract: OK');
