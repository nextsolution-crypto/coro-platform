# Tests adversariaux

PASS : clé inconnue, signature falsifiée, tenant/bâtiment/appareil étrangers, séquence rejouée, priorité réduite, incident de sortie différent, autorité bâtiment refusée, Building Bridge désactivé, protocole Ops absent et restauration directe.

PostgreSQL refuse une livraison intertenant, la mutation d’un événement append-only et l’identité modifiée des commandes/livraisons. Les tests se trouvent dans `src/display-orchestration`.
