# Fiche factuelle - fournisseur cartographique du portail client

Date de vérification : 2026-10-25

## Configuration observée

Le portail intègre désormais Leaflet 1.9.4 dans son bundle applicatif et affiche les tuiles raster standard OpenStreetMap depuis `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Cette configuration apparaît dans la carte générale des bâtiments et dans la carte opérationnelle Sentinelle Population.

Cette intégration est exécutée côté navigateur. Elle ne requiert actuellement aucune clé d'API cartographique. Le code et la feuille de style Leaflet ne dépendent plus d'UNPKG à l'exécution; seul le fond de carte dépend des serveurs de tuiles OpenStreetMap Foundation.

## Accès réseau requis

| Destination | Usage | Accès requis |
| --- | --- | --- |
| Bundle `coro-client-portal` | Leaflet 1.9.4 et styles | Aucun accès CDN à l'exécution |
| `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Tuiles cartographiques | HTTPS sortant du navigateur |

Le stack QA deny-by-default ne doit pas ouvrir ces destinations automatiquement. Une preuve avec réseau réel doit rester distincte des tests réalisés avec ressources simulées ou bloquées.

## Données transmises

Les requêtes de tuiles OpenStreetMap transmettent également ces métadonnées ainsi que les coordonnées techniques de la tuile demandée (`z/x/y`). La combinaison des tuiles demandées révèle approximativement la zone géographique et le niveau de zoom consultés. Le code observé n'envoie pas directement le nom du bâtiment, le nom d'un occupant, une liste de personnes ou un identifiant client au fournisseur de tuiles. Les coordonnées du bâtiment déterminent toutefois indirectement la zone des tuiles demandées.

La politique officielle OSM interdit de soumettre des données personnelles ou confidentielles à ses services et exige un Referer valide pour les pages Web. Référence : https://operations.osmfoundation.org/policies/tiles/

## Coût et niveau de service

- OpenStreetMap indique que ses données sont libres, mais que ses serveurs de tuiles ne constituent pas un service garanti. L'accès est financé par dons et commandites, fourni au mieux, sans SLA, et peut être bloqué sans préavis en cas d'usage contraire à la politique.
- Aucun tarif à l'appel n'est configuré dans CORO pour ce chemin. Cela ne constitue pas une garantie de service gratuit ou pérenne pour un produit commercial.
- Aucune nouvelle intégration payante n'est activée par cette fiche.

## Contraintes applicables

La politique OSM exige notamment une attribution visible, l'usage HTTPS, le respect du cache, un Referer Web valide et l'absence de téléchargement massif ou de préchargement hors ligne. Le code affiche l'attribution `© OpenStreetMap contributors` et utilise l'URL exacte actuellement demandée.

## Preuve réseau réelle

Le 25 octobre 2026, le scénario synthétique `client-map-real-network.mjs` a chargé la carte générale avec Leaflet fourni localement. Vingt-quatre tuiles OSM ont répondu HTTP 200 en PNG, l'attribution était visible, aucun appel UNPKG ni échec réseau n'a été observé, et le composant ne débordait pas du viewport 1440 × 900. Les preuves assainies sont conservées sous `D:\CORO-QA\runs\client-portal-v1-final\map-real-network`.

## Conclusion opérationnelle

Statut : `VALIDATED_REAL_NETWORK_LIMITED_LOAD_NO_SLA`.

La carte peut être présentée comme une aide facultative dépendante d'un accès Internet public, sans clé fournisseur ni coût d'usage configuré. Elle ne doit pas être présentée comme assortie d'un SLA, disponible hors ligne, ou validée pour une charge commerciale soutenue. La liste des bâtiments reste le parcours complet de repli. Un fournisseur ou hébergement cartographique gouverné devra être approuvé si l'usage commercial dépasse les limites du service public.
