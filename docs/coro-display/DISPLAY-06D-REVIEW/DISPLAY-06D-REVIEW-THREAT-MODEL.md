# Modèle de menaces

## Surface

`Gateway → Player → keystore → cache → état d'urgence → Chromium → superviseur OS → journal → télémétrie → Display Manager`.

## Risques majeurs

| Menace | Gravité | Exploitabilité | Contrôle observé | Statut |
|---|---:|---:|---|---|
| Clé PEM extraite de l'environnement | Critique | Moyenne | abstraction non exportable non utilisée | FAIL |
| Runtime modifié avant démarrage | Critique | Moyenne | fonction locale non appelée, manifeste non authentifié | FAIL |
| Révocations anciennes rejouées | Élevée | Moyenne | HMAC local sans ancrage anti-rollback | FAIL |
| État d'urgence supprimé/corrompu | Critique | Faible à moyenne | HMAC, version, priorité et clear gouverné | PASS logiciel |
| Cache modifié, symlink ou rollback | Élevée | Moyenne | signature, SHA-256, séquence, chemins contrôlés | PASS synthétique |
| DNS rebinding loopback | Élevée | Moyenne | correctif Host/méthode/route ajouté | PASS ciblé |
| Boucle de crash | Élevée | Moyenne | limites systemd statiques; watchdog applicatif non intégré | FAIL |
| Télémétrie falsifiée | Moyenne | Moyenne | authentifiée mais qualifiée comme déclaration | PASS contractuel |
| Journal tronqué par maître du stockage et de la clé | Élevée | Moyenne | aucun ancrage externe | RISQUE RÉSIDUEL |

## Corrections

La portée runtime des fichiers vérifiés est maintenant confinée au répertoire réel et refuse doublons, liens externes et manifeste vide. L'origine loopback refuse Host non canonique, méthodes non GET et routes inconnues.

## Limites

Un attaquant contrôlant simultanément le stockage et les secrets HMAC locaux peut reconstruire journal, révocations et état. La revue ne présente donc pas ces objets comme inviolables.
