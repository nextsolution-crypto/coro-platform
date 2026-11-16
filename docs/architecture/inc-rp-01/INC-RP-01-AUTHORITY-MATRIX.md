# INC-RP-01 — Matrice d'autorité

Toute opération combine permission individuelle, organisation, affectation
active au bâtiment et statut de la ressource. Aucun rôle administratif ne
donne implicitement accès au contenu sensible.

| Action | Permission | Conditions supplémentaires |
|---|---|---|
| lire | `INCIDENT_REPORT_READ` | bâtiment affecté; masquage par sensibilité |
| créer | `INCIDENT_REPORT_CREATE` | modèle publié et politique active |
| modifier brouillon | `INCIDENT_REPORT_EDIT` | auteur ou délégation explicite; révision attendue |
| réviser | `INCIDENT_REPORT_REVIEW` | version soumise, même bâtiment |
| approuver/rejeter | `INCIDENT_REPORT_APPROVE` | acteur distinct du créateur/soumissionnaire par défaut |
| exporter | `INCIDENT_REPORT_EXPORT` | version admissible; manifeste complet |
| administrer modèles/rétention | `INCIDENT_REPORT_ADMIN` | organisation seulement; pas d'accès implicite aux rapports |

Les droits Incident et Sentinelle ne sont pas transposés. La révocation prend
effet à la requête suivante. Toute décision conserve acteur réel, rôle, motif,
version et date serveur.
