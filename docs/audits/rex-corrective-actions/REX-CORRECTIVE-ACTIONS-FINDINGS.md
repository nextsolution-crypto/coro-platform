# Constats REX et actions correctives

| ID | Constat | Preuve | Statut |
|---|---|---|---|
| REX-01 | Une actualisation de fond du REX remplaçait la synthèse locale toutes les 30 secondes, y compris pendant une édition non enregistrée. | Lecture de `population/reviews/[reviewId]/page.tsx`; absence de garde de brouillon. | CORRIGÉ_LOCAL |
| REX-02 | Les formulaires Constat, Recommandation et Action se fermaient après une mutation refusée, car `mutate` absorbait l'erreur puis la chaîne `.then` s'exécutait. | Contrat du composant avant correction. | CORRIGÉ_LOCAL |
| REX-03 | Deux chargements concurrents pouvaient appliquer une réponse obsolète sur l'écran REX. | Absence de génération de requête avant correction. | CORRIGÉ_LOCAL |
| REX-04 | Les invariants serveur, SQL, tenant, idempotence, concurrence, audit, preuve et clôture disposent déjà d'une couverture spécialisée. | 81 tests unitaires ciblés, 66 tests élargis, 35 tests PostgreSQL. | PASS |
| REX-05 | Le parcours complet Organisation ↔ Portail n'existe pas sous forme de deux interfaces opérationnelles symétriques. | Inventaire des routes et pages. | NON_APPLICABLE; administration Organisation conservée |
| REX-06 | Restitution par lecteur d'écran réel. | Aucun lecteur d'écran humain observé durant la campagne à ce stade. | NOT_VERIFIED |
| REX-07 | Observation production du parcours complet. | Les mutations réelles sont interdites; seule une inspection lecture seule est autorisée. | À QUALIFIER APRÈS RELEASE |

## Correction ciblée

- Une génération monotone ignore les réponses réseau obsolètes.
- Un brouillon sale n'est plus remplacé par l'actualisation périodique.
- `mutate` retourne un résultat explicite; les formulaires ne sont nettoyés ou fermés qu'après succès.
- Aucun changement de règle métier, schéma, permission ou API.
