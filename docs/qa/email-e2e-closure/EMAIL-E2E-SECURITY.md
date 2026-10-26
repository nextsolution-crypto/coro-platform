# CORO Email E2E — rapport de sécurité

## Contrôles confirmés

- Les demandes Forgot Password et Magic Link renvoient des réponses neutres et sont limitées par débit.
- Les jetons sont générés avec `crypto.randomBytes(32)`, transmis une seule fois et stockés sous SHA-256.
- Le reset expire après 30 minutes; les nouveaux Magic Links expirent après 15 minutes.
- Les claims atomiques `usedAt: null` et `expiresAt > now` refusent expiration, concurrence et rejeu.
- Un reset invalide les autres resets, les Magic Links actifs, les appareils de confiance et incrémente `sessionVersion`.
- `ClientJwtGuard` compare la version signée à la version persistée sur chaque endpoint protégé.
- Un Magic Link consommé ne produit pas de JWT: il lance un défi MFA. Seule la validation MFA émet la session.
- Les erreurs fournisseur sont journalisées sans adresse, jeton, mot de passe ou clé API.
- Les limites QA refusent les hôtes, ports, origines et bases hors topologie isolée.

## Compatibilité transitoire

Les anciens Magic Links bruts restent acceptables uniquement lorsqu'un enregistrement persistant non utilisé et non expiré correspond. Leur expiration déjà stockée n'est pas prolongée. Tous les nouveaux liens sont hachés et limités à 15 minutes. Aucune migration de schéma n'est requise.

## Appareils de confiance

Le comportement historique autorise un appareil de confiance valide à éviter un nouveau défi MFA pendant sa fenêtre de 90 jours. Les resets et changements de mot de passe suppriment ces appareils. Cette exception doit rester une politique explicitement acceptée et surveillée.

## Risques résiduels

1. Le bearer token du portail est conservé dans `localStorage`; une compromission XSS pourrait l'exfiltrer. Une migration vers un cookie HttpOnly/SameSite constitue un chantier séparé.
2. La révocation d'une session réelle antérieure au reset n'a pas été observée directement durant le run QA; elle est démontrée sur fixture automatisée.
3. L'expiration a été testée avec horloge/fixture, pas par attente réelle dans la campagne humaine.
4. La soumission navigateur des formulaires de demande n'a pas été couverte de bout en bout pendant les envois réels.
5. La branche `main` ne possède actuellement pas de règle de protection GitHub imposant les checks; la discipline de release reste donc essentielle.

## Conclusion

Les mécanismes Email E2E sont adaptés à une release contrôlée. Le statut de sécurité est `WITH_RESERVATIONS`; aucune réserve critique connue ne justifie un contournement des points d'approbation.
