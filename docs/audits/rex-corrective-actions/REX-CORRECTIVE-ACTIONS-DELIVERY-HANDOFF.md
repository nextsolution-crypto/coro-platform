# Passation de livraison REX / actions correctives

## État

- Audit ciblé : terminé.
- Défauts UX reproduits : trois, corrigés localement.
- Tests backend et PostgreSQL : PASS.
- Build backend et portail : PASS.
- PR #186 publiée; HEAD `3f4be4296d762ce5f40fdb0d4f4a331673579858`.
- CI terminale : PASS (`41723148659`, `41723149150`).
- Chrome 12/12 : `NOT_VERIFIED`, contrôle de l'onglet bloqué par l'extension avant interaction.
- Fusion, release et production : non exécutées.

## Prochaine action exacte

1. Restaurer un contrôle fonctionnel de l'onglet Chrome QA.
2. Exécuter le parcours synthétique et la matrice Chrome 12/12 sur le candidat exact.
3. Revoir le diff final et la CI du HEAD si les preuves ajoutent un commit documentaire.
4. Fusionner et livrer uniquement après acceptation navigateur et gates gouvernés.
5. Inspecter la production en lecture seule et réconcilier le SHA/digests/migrations.

## Nettoyage

Le conteneur PostgreSQL `coro-rex-qa-postgres` et tout autre artefact créé par cette campagne doivent être arrêtés et supprimés après conservation des preuves assainies. Aucun volume métier, sauvegarde ou worktree étranger n'est concerné.

## Réserves

- Accès Incident production autorisé antérieur toujours non démontré faute de session portail QA légitime; cette réserve n'est pas rouverte.
- Lecteur d'écran réel : `NOT_VERIFIED`.
- Aucune mutation métier réelle ni communication externe n'est autorisée pour la recette production.
