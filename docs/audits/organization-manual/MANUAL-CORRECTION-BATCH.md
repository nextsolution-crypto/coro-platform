# Lot correctif recommandé — Manuel CORO

Ce document prépare un lot ultérieur. Aucune correction n’est autorisée ou incluse dans l’audit présent.

## Lot 1 — réconciliation éditoriale prioritaire

1. Ajouter des articles Clients, Carte, Conformité, Bibliothèque et Paramètres.
2. Documenter la désactivation Client : suspension immédiate, sessions/liens invalidés, données conservées, nouvelle authentification après réactivation.
3. Documenter les archives : consultation et téléchargements autorisés, mutations/régénérations interdites sans réouverture gouvernée.
4. Documenter Carte : tuiles OSM avec attribution, alternative liste, géocodage public désactivé par défaut, aucune garantie de SLA.
5. Documenter Conformité comme suivi documentaire factuel, sans attestation réglementaire.
6. Documenter Bibliothèque comme catalogue global en lecture seule, non connecté à Knowledge, CORO AI authentifié ou l’assistant public.
7. Distinguer explicitement stockage documentaire, admissibilité, ingestion et indexation Knowledge.

Critère de sortie : revue croisée contre les rapports de clôture #135/#137/#139/#142/#144, sources existantes et version du Manuel incrémentée.

## Lot 2 — parcours consolidés

1. Étendre Dashboard, Projets et Documents : génération, édition, sauvegarde, soumission, révision indépendante, décision, PDF et erreurs/reprise selon le support réel.
2. Décrire Activities comme planification `ProjectActivity`.
3. Maintenir Timelog comme suivi du temps, sans assimilation au rendement financier.
4. Décrire Planning, Buildings et documents techniques/conformité avec leurs distinctions d’autorité.

Critère de sortie : chaque action pointe vers une route réelle, nomme l’autorité requise et ne promet aucun fournisseur ou effet externe non validé.

## Lot 3 — navigation et politique de visibilité

1. Corriger la restauration des ancres après chargement asynchrone sur les deux frontends.
2. Tester lien direct, F5, retour, avance, ancre invalide et focus au chapitre.
3. Faire approuver la politique globale ou contextuelle des articles internes.
4. Renommer l’aide extractive pour éviter la confusion avec CORO AI/Knowledge.

Critère de sortie : tests unitaires et navigateur sur les deux surfaces, sans duplication d’une seconde autorité RBAC.

## Lot 4 — acceptation

- Tests de catalogue, routes et gardes.
- Deux organisations synthétiques; admin, opérateur, identité inactive, client manager et client corporate.
- Recherche accents/casse/partiel/long/rapide, résultats multiples et aucun résultat.
- Pannes liste et aide avec reprise.
- Chrome 12/12 et zoom 200 %.
- NVDA ou lecteur d’écran réel si disponible.
- Observation production strictement en lecture seule après livraison gouvernée.

## Priorité

1. MAN-001 et MAN-002 avant toute affirmation d’exhaustivité.
2. MAN-003 avant diffusion de liens profonds.
3. MAN-004 après décision de politique.
4. MAN-005 et MAN-006 comme améliorations d’usage/accessibilité.
