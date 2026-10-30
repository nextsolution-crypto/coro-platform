# Dépendances cartographiques

## Rendu

- Bibliothèque : Leaflet 1.9.4.
- Organisation : chargement actuel depuis UNPKG au runtime.
- Portail : import du paquet local verrouillé.
- Recommandation : utiliser la dépendance locale pour les deux écrans; ne pas faire dépendre une fonction applicative d'un CDN de script public.

## Tuiles OpenStreetMap

Politique officielle : <https://operations.osmfoundation.org/policies/tiles/>

Contraintes pertinentes :

- URL officielle exacte et attribution visible;
- service best-effort sans SLA;
- en-têtes et cache appropriés;
- interdiction du téléchargement massif ou hors ligne non autorisé;
- les données confidentielles ne doivent pas être envoyées au service.

La carte Portail utilise l'URL actuelle. La carte Organisation utilise encore le sous-domaine historique `{s}`. Les deux désactivent le contrôle d'attribution.

## Géocodage Nominatim

Politique officielle : <https://operations.osmfoundation.org/policies/nominatim/>

Le service public impose notamment une charge très limitée, une identification valide, de l'attribution et du cache. Il ne doit pas recevoir de renseignements personnels ou confidentiels. Une application commerciale doit pouvoir changer de fournisseur si l'accès est retiré.

CORO transmet actuellement une adresse complète lors de certains parcours de création ou modification de bâtiments. Avant une utilisation commerciale soutenue, il faut documenter : base légale et transparence, cache, limitation coordonnée, réessai, stratégie de bascule et absence de données confidentielles.

## Confidentialité et coûts

- Aucun coût contractuel n'est démontré pour les services publics OSM/Nominatim; cela ne constitue pas un SLA ni une capacité commerciale garantie.
- Les adresses sont des données transmises à un tiers réseau lorsqu'un géocodage réel est exécuté.
- Aucun nouvel appel fournisseur n'a été effectué pendant cet audit.

## Contrats techniques

- Référence Leaflet : <https://leafletjs.com/reference>
- Téléchargement/SRI Leaflet : <https://leafletjs.com/download>

Le recours à SRI réduirait le risque du CDN, mais l'import local déjà utilisé par le Portail est la solution la plus cohérente avec le réseau contrôlé et la reproductibilité CORO.
