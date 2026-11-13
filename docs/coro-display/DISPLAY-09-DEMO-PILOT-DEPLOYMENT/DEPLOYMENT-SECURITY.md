# Securite du deploiement

Garanties code validees : autorite serveur par organisation/batiment, URL publique opaque, activation temporaire hachee, P-256, session revocable, publication approuvee uniquement, rendus prives, idempotence, concurrence et audit.

Le pilote autorise uniquement `WEB_VIEW_ONLY`. Les commandes d'urgence, Building Bridge, adaptateurs machine Ops/Incident, `WEB_MANAGED_KIOSK` et `WEB_EMERGENCY_ELIGIBLE` restent exclus.

Gates phase B : aucune release concurrente, quatre digests immuables, sauvegarde/restauration, 11 migrations, CSP/origines/cookies, DNS/TLS, permission minimale, zero secret dans les preuves, et refus intertenant. Toute collision de cible, publication non approuvee, certificat invalide ou ancien rollback incomplet impose l'arret.

Aucun secret, code d'activation, jeton, document client ni donnee d'occupant n'a ete collecte en phase A.
