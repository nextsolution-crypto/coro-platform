# Delta production → candidat

Le delta `e83d83a1..5ae7cd21` contient **88 commits**, **15 PR fusionnées**, **920 fichiers**, environ **35 064 ajouts** et **211 suppressions**. Il couvre toute la chaîne Display 02A→09, pas seulement le pilote.

PR : #243 spatial; #244 publication; #245 worker PDF; #246 profils/rendu; #247 Manager; #248 portail; #249 observations; #250 Player hors ligne; #251 enrôlement; #252 gateway; #253 résilience; #255 orchestration; #257 Player physique; #259 URL permanente; #261 pilote Démo.

Hors Display, les changements exécutables significatifs sont limités aux raccordements Auth/Client Portal requis par Display, aux workflows CI, à `docker-compose.yml` et aux assets Design System régénérés. Knowledge est touché par un Dockerfile/smokes de build; aucun fournisseur IA n'est activé. Aucun changement fonctionnel Sentinelle Population, Incident ou Ops hors intégration Display gouvernée n'a été identifié dans ce delta.

Risque principal : release large et schéma +11 migrations. Mitigation : images immuables, upgrade testé, déploiement des quatre services comme un seul candidat, Display non provisionné avant smoke tests.
