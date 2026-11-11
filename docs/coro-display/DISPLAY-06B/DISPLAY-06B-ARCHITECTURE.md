# DISPLAY-06B — Architecture

Quatre frontières : Registry gère identité/affectation; Gateway authentifie et sélectionne les données autorisées; Runtime vérifie et persiste; Kiosk impose l'environnement. Le noyau DISPLAY-06A demeure l'unique validateur documentaire.

L'implémentation actuelle fournit les contrats et services locaux sans dépendance nouvelle. Les adaptateurs PostgreSQL/HTTP et le processus Chromium ne sont pas encore activés.
