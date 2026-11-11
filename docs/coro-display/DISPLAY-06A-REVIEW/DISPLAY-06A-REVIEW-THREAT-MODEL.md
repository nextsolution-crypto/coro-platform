# DISPLAY-06A-REVIEW — Modèle de menaces

| Menace | Couverture actuelle | Limite |
|---|---|---|
| Manifeste/plan falsifié | Ed25519 + SHA-256 + schéma strict | registre de confiance futur |
| Rejeu/ancienne version | séquence persistée attendue + affectation liée | persistance OS future |
| Clé inconnue/révoquée/expirée | refus | distribution authentifiée future |
| Mauvaise portée/profil | refus organisation, bâtiment, emplacement et géométrie | identité réelle future |
| Cache corrompu | empreinte et conservation de l'ancien plan | atomicité disque future |
| Contenu secondaire falsifié | exigence `authenticated` et portée | contrat signé futur |
| Commande/downgrade urgence | priorité et clear gouverné | persistance/transport futurs |
| Attaquant administrateur OS | non couvert | durcissement OS/kiosque requis |

Les pannes réseau prolongées n'autorisent jamais une nouvelle publication; elles rendent seulement l'actualité non confirmable.
