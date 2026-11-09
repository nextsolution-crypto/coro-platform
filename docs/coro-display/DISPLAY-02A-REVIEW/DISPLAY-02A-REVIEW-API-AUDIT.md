# DISPLAY-02A-REVIEW — Audit API

## Contrats vérifiés

- `ValidationPipe` avec transformation, allowlist et rejet des champs inconnus.
- Corps sans identifiants tenant/bâtiment forgés.
- Codes normalisés et longueurs bornées.
- Coordonnées bornées et fournies par paires.
- `expectedLockVersion` obligatoire sur modification et archivage.
- Réponses 403/404/409 cohérentes avec autorité, non-énumération et concurrence.
- Audit CORO existant utilisé dans la transaction de mutation.

## Anomalie corrigée : pagination

Les listes retournaient toutes les lignes du bâtiment sans limite structurelle. Elles exposent maintenant :

```json
{ "items": [], "total": 0, "offset": 0, "limit": 50 }
```

`offset` est borné de 0 à 1 000 000; `limit` de 1 à 100. Les filtres précèdent le décompte et la pagination. Les ordres restent déterministes. Aucun consommateur produit de ces nouvelles routes n'existe, donc la clarification du contrat ne casse pas un client existant.

## Limites

Les paramètres d'identifiant sont traités comme chaînes et validés par les recherches canoniques plutôt que par un parseur UUID de contrôleur. Les erreurs ne divulguent aucune ressource étrangère. La pagination est par offset; un curseur pourra être justifié si une volumétrie réelle le nécessite.
