# Options de remédiation

| Option | Risque | Entretien | Décision |
|---|---:|---:|---|
| Étendre le certificat partagé | impacte tous ses consommateurs | simple mais blast radius élevé | réserve |
| Wildcard d'origine | clé à portée large | simple | non privilégiée |
| Certificat dédié Display + vhost dédié | blast radius minimal | renouvellement explicite | **retenue sous condition** |
| Réutiliser un hostname existant | ambiguïté Host/SNI | fragile | rejetée |

Le certificat dédié préserve les certificats existants et permet un rollback local au seul vhost Display.
