# Matrice d'acceptation — Carte CORO

| Domaine                   | Organisation                    | Portail client                       | Statut         |
| ------------------------- | ------------------------------- | ------------------------------------ | -------------- |
| Portée organisation       | Filtrée côté serveur            | Filtrée côté serveur                 | PASS           |
| Portée client/bâtiment    | Client + affectations opérateur | Manager affecté / corporate autorisé | PASS           |
| Refus inter-tenant        | Contrat canonique               | Contrat canonique                    | PASS           |
| Erreur API visible        | Non                             | Oui, avec reprise                    | FAIL           |
| Dépendance Leaflet locale | Non, CDN runtime                | Oui                                  | FAIL           |
| Attribution fournisseur   | Masquée                         | Masquée                              | FAIL           |
| Coordonnées zéro          | Rejetées                        | Rejetées                             | FAIL           |
| Coordonnées invalides     | Non filtrées                    | Non filtrées                         | FAIL           |
| Infobulle sûre            | HTML interpolé                  | HTML interpolé                       | FAIL           |
| Coordonnées superposées   | Non regroupées                  | Non regroupées                       | FAIL           |
| Alternative textuelle     | Cartes en bas                   | Avertissement/état vide              | PARTIAL        |
| Navigation détail         | Disponible                      | Disponible                           | PASS           |
| Clavier et focus          | Non démontré                    | Non démontré                         | NOT_VERIFIED   |
| Lecteur d'écran           | Non exécuté                     | Non exécuté                          | NOT_VERIFIED   |
| Chrome 12/12              | Non exécuté                     | Non exécuté                          | NOT_VERIFIED   |
| Fournisseur réseau réel   | Non requis pour l'audit         | Non requis pour l'audit              | NOT_APPLICABLE |

## Matrice responsive requise, état courant

| Taille      | Classic      | Glass Light  | Glass Dark   |
| ----------- | ------------ | ------------ | ------------ |
| 390 × 844   | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |
| 768 × 1024  | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |
| 1440 × 900  | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |
| 2560 × 1440 | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED |

La matrice n'est pas déclarée réussie à partir d'une inspection statique. Elle doit être rejouée après correction avec mesures de boîtes, débordement, focus, erreurs console et panne de tuiles simulée.
