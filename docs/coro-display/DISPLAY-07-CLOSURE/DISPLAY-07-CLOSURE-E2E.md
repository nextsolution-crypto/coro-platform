# Validation E2E logicielle

Chaîne validée : Platform → orchestration → PostgreSQL → outbox → Gateway M2M → Player → état persistant → Chromium → accusé → supervision.

Les scénarios couvrent commande valide, falsification, rejeu, concurrence, révocation, plan non approuvé, priorités, sortie gouvernée, hors ligne, redémarrage et réconciliation. Les accusés distinguent création, autorisation, attente, transmission, réception, application déclarée, rejet, échec et obsolescence.

L'application déclarée par le Player n'est pas présentée comme une observation physique indépendante.
