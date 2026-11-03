# Passation de livraison REX / actions correctives

## État

- Audit ciblé : terminé.
- Défauts UX reproduits : trois, corrigés localement.
- Tests backend et PostgreSQL : PASS.
- Build backend et portail : PASS.
- Chrome, PR, CI, fusion, release et production : en cours / non encore revendiqués.

## Prochaine action exacte

1. Démarrer le stack QA isolé sur le HEAD commité.
2. Exécuter le parcours synthétique et la matrice Chrome.
3. Publier une PR ciblée, attendre la CI terminale et revoir le diff exact.
4. Fusionner et livrer uniquement si tous les gates gouvernés passent.
5. Inspecter la production en lecture seule et réconcilier le SHA/digests/migrations.

## Nettoyage

Le conteneur PostgreSQL `coro-rex-qa-postgres` et tout autre artefact créé par cette campagne doivent être arrêtés et supprimés après conservation des preuves assainies. Aucun volume métier, sauvegarde ou worktree étranger n'est concerné.

## Réserves

- Accès Incident production autorisé antérieur toujours non démontré faute de session portail QA légitime; cette réserve n'est pas rouverte.
- Lecteur d'écran réel : `NOT_VERIFIED`.
- Aucune mutation métier réelle ni communication externe n'est autorisée pour la recette production.
