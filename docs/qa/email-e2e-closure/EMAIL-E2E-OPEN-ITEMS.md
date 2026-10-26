# CORO Email E2E — registre des réserves

| Réserve | Gravité | Responsable proposé | Action recommandée | Critère de fermeture | Échéance proposée |
|---|---|---|---|---|---|
| Révocation d'une session réelle pré-reset non observée | Moyenne | Sécurité applicative | Campagne contrôlée avec deux sessions synthétiques, sans compte réel | ancienne session reçoit 401 après reset et preuve horodatée | prochaine campagne QA sécurité |
| Expiration vérifiée principalement par fixture | Faible | QA | Ajouter un test d'intégration avec horloge contrôlée persistante | expiration et frontière temporelle démontrées en intégration | prochain cycle auth |
| Formulaires Forgot Password et Magic Link non soumis intégralement au navigateur lors de la campagne réelle | Moyenne | QA portail | Test navigateur synthétique contrôlé, un scénario à la fois | requête, réponse neutre et page d'arrivée observées | avant prochaine release auth majeure |
| Bearer token dans `localStorage` | Moyenne | Architecture sécurité | Concevoir une session cookie HttpOnly, Secure et SameSite avec protection CSRF | migration et tests XSS/CSRF approuvés | chantier séparé priorisé |
| Appareil de confiance valide évite un nouveau MFA | Moyenne | Product Security | Confirmer durée, révocation et exigences de réauthentification | politique approuvée et tests de risque associés | revue sécurité trimestrielle |
| Absence de protection GitHub obligatoire sur `main` | Moyenne | Administrateur GitHub | Définir les checks requis et la revue obligatoire sans affaiblir la release | règles activées et testées | avant prochaine release sensible |
| Configuration et santé production Email E2E | Haute avant release | Release manager | Vérifier les variables sans afficher leurs valeurs et exécuter les contrôles post-déploiement | release autorisée, digests relevés, contrôles PASS | au déploiement autorisé |
