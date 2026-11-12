# Modèle de menaces

| Menace | Gravité | Exploitabilité | Contrôle / résultat |
|---|---:|---:|---|
| Appareil usurpé, signature falsifiée | Critique | Moyenne | Ed25519 et clé préattestée; refus testé |
| Invitation interceptée/réutilisée | Élevée | Moyenne | Jeton opaque haché, expiration, consommation atomique |
| Nonce rejoué/interinstance | Critique | Moyenne | PostgreSQL, unicité et `updateMany` atomique |
| Corps, méthode ou chemin modifié | Élevée | Moyenne | Canonicalisation et liaison dans la signature |
| Portée organisation/bâtiment/emplacement substituée | Critique | Moyenne | Requêtes filtrées et nouvelle migration de contraintes composites |
| Publication révoquée ou rendu substitué | Critique | Moyenne | Statut/revocation et SHA-256 vérifiés |
| Manifeste ancien | Élevée | Moyenne | séquence stricte; rollback serveur corrigé |
| Cache corrompu / état d’urgence perdu | Critique | Faible | HMAC, générations atomiques, refus de downgrade; seulement tests Node |
| Télémétrie mensongère | Moyenne | Élevée | explicitement déclarative, jamais preuve physique |
| Navigateur ou origine locale exposés | Élevée | Faible | écoute loopback, CSP, options kiosk; OS réel non vérifié |
| Déni de service | Moyenne | Moyenne | throttle global; nettoyage/rétention DB incomplets |
| Perte réseau/redémarrage | Élevée | Élevée | primitives présentes, mais runtime connecté non raccordé |

Le scénario dominant est l’absence de chaîne exécutable : les contrôles serveur et cache existent séparément mais ne sont pas orchestrés par le binaire Player.
