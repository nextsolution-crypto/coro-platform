# Escalades

Un accusé FAILED, REJECTED ou STALE crée idempotemment une `DisplayOperationalEscalation`, avec sévérité, échéance, appareil, incident et preuve qu’aucune notification externe n’a été envoyée. La portée est contrôlée par PostgreSQL.

La génération proactive après délai sans accusé reste une réserve avant exploitation; aucun SMS ou courriel n’est émis.
