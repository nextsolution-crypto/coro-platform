# DISPLAY-06B-REVIEW — Synchronisation

Le protocole réutilise le manifeste DISPLAY-06A : schéma exact, signature Ed25519, séquence croissante, affectation, tenant, bâtiment, emplacement, profil, publication non révoquée, référence `private://` et empreinte du rendu. Le rendu incomplet est refusé et le document est revalidé avant commit.

Le cache impose en plus une séquence croissante sous verrou local et un vérificateur de manifeste lors du commit et de la reprise. Il n'existe donc aucun circuit documentaire parallèle.

Limites : l'authentification de la requête appareil, l'autorisation de la référence privée, la reprise HTTP par plages et la transaction journal/sequence sont des responsabilités du Gateway non implémenté.
