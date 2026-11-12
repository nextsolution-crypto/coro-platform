# Sécurité

Le correctif ne touche ni activation, session, CSP, stockage privé, brute force, rotation, révocation ni contrôleur d'urgence. Le lien portail est protégé par permission côté interface, tandis que le backend conserve l'autorité réelle et l'intersection des portées.

Les tests ciblés confirment : navigateur view-only, rendu privé exigeant une session enrôlée, anti-framing et politique de référent. Les tests négatifs complets URL devinée, code expiré/réutilisé, session/tenant/PDF étrangers et CSRF demeurent ceux de DISPLAY-09 et de la CI; aucune protection n'est désactivée.
