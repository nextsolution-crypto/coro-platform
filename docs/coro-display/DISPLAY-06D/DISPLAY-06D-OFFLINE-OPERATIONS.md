# Opérations hors ligne

Le dernier plan signé et non révoqué localement reste affichable; les écritures opérationnelles vont au journal et la reconnexion reprend sync/heartbeat/réconciliation. Une erreur réseau est inscrite sans effacer cache ou urgence.

Preuve : captures `online.png`, `offline.png`, `restart.png`; redémarrage hors ligne PASS. DNS, TLS invalide, horloge fortement incorrecte et coupure de plusieurs heures restent à la campagne matérielle.
