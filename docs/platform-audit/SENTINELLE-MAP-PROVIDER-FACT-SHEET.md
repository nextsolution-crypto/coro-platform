# Fiche factuelle - fournisseur cartographique du portail client

Date de vérification : 2026-10-25

## Configuration observée

Le portail charge actuellement Leaflet 1.9.4 dans le navigateur depuis `https://unpkg.com` et affiche les tuiles raster standard OpenStreetMap depuis `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. Cette configuration apparaît dans la carte générale des bâtiments et dans la carte opérationnelle Sentinelle Population.

Cette intégration est exécutée côté navigateur. Elle ne requiert actuellement aucune clé d'API cartographique. Elle dépend toutefois de deux services Internet tiers : le CDN UNPKG pour le code et la feuille de style Leaflet, puis les serveurs de tuiles OpenStreetMap Foundation pour le fond de carte.

## Accès réseau requis

| Destination | Usage | Accès requis |
| --- | --- | --- |
| `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` | Style Leaflet | HTTPS sortant du navigateur |
| `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` | Bibliothèque Leaflet | HTTPS sortant du navigateur |
| `https://*.tile.openstreetmap.org/{z}/{x}/{y}.png` | Tuiles cartographiques | HTTPS sortant du navigateur |

Le stack QA deny-by-default ne doit pas ouvrir ces destinations automatiquement. Une preuve avec réseau réel doit rester distincte des tests réalisés avec ressources simulées ou bloquées.

## Données transmises

Les requêtes vers UNPKG transmettent les métadonnées HTTP habituelles du navigateur, notamment l'adresse IP source observable par le service, le User-Agent et normalement le Referer.

Les requêtes de tuiles OpenStreetMap transmettent également ces métadonnées ainsi que les coordonnées techniques de la tuile demandée (`z/x/y`). La combinaison des tuiles demandées révèle approximativement la zone géographique et le niveau de zoom consultés. Le code observé n'envoie pas directement le nom du bâtiment, le nom d'un occupant, une liste de personnes ou un identifiant client au fournisseur de tuiles. Les coordonnées du bâtiment déterminent toutefois indirectement la zone des tuiles demandées.

La politique officielle OSM interdit de soumettre des données personnelles ou confidentielles à ses services et exige un Referer valide pour les pages Web. Référence : https://operations.osmfoundation.org/policies/tiles/

## Coût et niveau de service

- OpenStreetMap indique que ses données sont libres, mais que ses serveurs de tuiles ne constituent pas un service garanti. L'accès est financé par dons et commandites, fourni au mieux, sans SLA, et peut être bloqué sans préavis en cas d'usage contraire à la politique.
- Aucun tarif à l'appel n'est configuré dans CORO pour ce chemin. Cela ne constitue pas une garantie de service gratuit ou pérenne pour un produit commercial.
- UNPKG fournit les fichiers npm par un CDN public. Aucun abonnement ou compte UNPKG n'est configuré dans le code observé. Aucun SLA contractuel ou coût réservé à CORO n'a été démontré.
- Aucune nouvelle intégration payante n'est activée par cette fiche.

## Contraintes applicables

La politique OSM exige notamment une attribution visible, l'usage HTTPS, le respect du cache, un Referer Web valide et l'absence de téléchargement massif ou de préchargement hors ligne. Le code affiche l'attribution `© OpenStreetMap contributors`, mais son URL utilise encore le motif historique avec sous-domaines (`{s}.tile.openstreetmap.org`) alors que la politique actuelle demande l'URL exacte `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.

## Conclusion opérationnelle

Statut : `CONFIGURATION_IDENTIFIEE_DEPENDANCE_RESEAU_REELLE_NON_VALIDEE_DANS_QA_ISOLEE`.

La carte peut être présentée comme dépendante d'un accès Internet public, sans clé fournisseur ni coût d'usage configuré. Elle ne doit pas être présentée comme assortie d'un SLA, disponible hors ligne, ou validée pour une charge commerciale soutenue. Avant un pilote autonome utilisant cette carte, il faut soit valider la conformité et la capacité du service de tuiles retenu, soit approuver un fournisseur ou un hébergement adapté. Cette décision est indépendante de la recette du rapport d'évacuation.
