# WebCrypto

Les clés navigateur sont limitées à des JWK publiques P-256. Le backend refuse les composantes privées, courbes étrangères, coordonnées malformées et points non importables par `createPublicKey`.

Limite : la possession de clé n’est pas démontrée à chaque requête. Un jeton de session copié reste clonable; `WEB_VIEW_ONLY` ne constitue donc pas une identité matérielle.
