# Démarrage sécurisé

Ordre implémenté : refus root → identité et confiance → keystore → journal `BOOT` → registre de révocations connu → état d’urgence → cache vérifié → synchronisation → heartbeat → origine loopback → Chromium. En panne Gateway, seul un cache signé, intègre et non révoqué localement est restauré.

Sans cache sûr, le Player échoue explicitement; il ne fabrique aucun plan. L’E2E a démontré le redémarrage hors ligne et `emergencyRestored=true`.
