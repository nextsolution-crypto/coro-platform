# DISPLAY-05A-REVIEW — Préparation du portail client

## API réutilisable

Le futur portail peut réutiliser l'autorité organisation/bâtiment, `DISPLAY_READ`, `DISPLAY_PLAN_READ`, l'arbre spatial, la liste filtrée des publications et la récupération authentifiée des variantes. Une permission dédiée de proposition/observation devra être conçue avant écriture client.

## Contrat recommandé

Le client peut lire ses bâtiments, emplacements, versions explicitement autorisées et aperçus privés, puis soumettre une proposition de correction séparée et auditée. Il ne doit jamais appeler les commandes d'approbation, publication, révocation, affectation, diffusion ou urgence.

## Garanties disponibles

Portée tenant/bâtiment serveur, UUID + verrou, historique append-only, empreintes de source/variante et absence d'URL publique permanente.

## Lacunes avant DISPLAY-05B

Définir l'état et le modèle d'une observation client, les permissions dédiées, la modération, les quotas et la politique de rétention. Aucun de ces éléments n'a été développé dans cette revue.
