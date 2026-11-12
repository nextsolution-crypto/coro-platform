# Validation multitenant

Les tests isoles utilisent au moins trois organisations et couvrent batiments, emplacements, publications, appareils, invitations, sessions, confirmations et journaux. Les cles composites et les requetes incluent organisation + batiment; les activations et publications etrangeres sont refusees.

Le portail client combine permission individuelle et liste de batiments. Une permission sans affectation, ou une affectation sans permission, ne donne pas acces.

Smoke tests obligatoires apres release : cible Demo autorisee, organisation B refusee, meme identifiant de ressource dans organisation C refuse, ancienne session revoquee refusee, publication non approuvee absente. Aucune permission globale ne sera ajoutee pour faciliter la recette.
