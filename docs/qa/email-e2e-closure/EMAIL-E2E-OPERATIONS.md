# CORO Email E2E — procédure d'exploitation

## Configuration

Le backend requiert une clé Brevo fournie uniquement par le magasin de secrets d'exploitation, un expéditeur autorisé et `CLIENT_PORTAL_PUBLIC_URL` pointant vers le portail public attendu. Ne jamais enregistrer les valeurs dans Git, un ticket ou un journal. Toute rotation est une opération de production approuvée: créer la nouvelle clé, la valider hors journal, mettre à jour le secret protégé, redémarrer de façon contrôlée, vérifier la santé, puis révoquer l'ancienne clé.

## Diagnostic de livraison

1. Relever l'horodatage, le type de parcours et l'identifiant de corrélation fournisseur, jamais le jeton ou le mot de passe.
2. Confirmer l'acceptation de la requête par le fournisseur.
3. Examiner les événements de livraison, rejet, bounce ou blocage dans l'outil autorisé.
4. Vérifier l'expéditeur, le domaine, la réputation et les suppressions sans copier de données sensibles.
5. Corréler avec les journaux applicatifs neutres et l'événement d'audit de sécurité.
6. Ne pas renvoyer automatiquement: déterminer si un jeton actif existe et obtenir la confirmation humaine applicable.

## Indisponibilité fournisseur

L'application doit retourner une réponse neutre aux demandes publiques. Un échec d'envoi marque le jeton nouvellement créé comme consommé afin d'éviter un lien orphelin réutilisable. Surveiller le taux d'erreur et ouvrir un incident si le seuil opérationnel est dépassé. Ne jamais contourner Brevo avec un canal non approuvé.

## Surveillance recommandée

- taux de demandes, limitations et réponses 4xx/5xx;
- taux d'acceptation, livraison, bounce et délai fournisseur;
- échecs MFA et rejeux refusés;
- changements de `sessionVersion` et événements de sécurité;
- erreurs de configuration d'URL ou CORS;
- santé backend/portail et erreurs Next.js de manifestes ou ressources statiques.

Les tableaux de bord et alertes doivent utiliser des compteurs et identifiants de corrélation non secrets. Les adresses, jetons, codes MFA, mots de passe, clés API et URLs contenant un jeton sont interdits dans les journaux.

## Reprise après incident

Préserver les journaux autorisés, identifier la version et les digests, suspendre les renvois automatiques, qualifier l'impact et appliquer uniquement le plan d'incident approuvé. Une rotation de clé, un rollback, une modification de données ou un courriel réel nécessite son autorisation propre.

## Contrôles périodiques

- revoir les expéditeurs et domaines Brevo autorisés;
- confirmer la rotation et les accès au secret;
- exécuter les tests de jetons, MFA et session sur fixtures;
- vérifier les origines CORS et l'URL publique;
- confirmer que les runners QA restent exclus du build produit;
- tester le rollback et conserver les preuves selon la politique de rétention.
