# Registre P0

| Contrôle | État | Preuve |
|---|---|---|
| Usurpation de provenance machine | FERMÉ | `MACHINE_EVENT_SOURCE_REQUIRES_TRUSTED_ADAPTER` et tests négatifs |
| Commande falsifiée ou rejouée | FERMÉ | Ed25519, séquence monotone, portée vérifiée |
| Commande intertenant | FERMÉ | autorité spatiale et ciblage déterministe |
| Downgrade d'une urgence réelle | FERMÉ | ordre de priorité et refus des commandes inférieures |
| Sortie unilatérale | FERMÉ | séparation des acteurs et approbations persistées |
| Écriture partielle | FERMÉ | transaction sérialisable et outbox atomique |

Aucun P0 logiciel connu ne demeure ouvert. L'adaptateur machine futur n'est ni livré ni activé.
