# CORO WEB-AI-FINAL — Revue de sécurité

## Résultats

- Corpus privé et `ProjectFile` : non accessibles au rôle public testé.
- Citations : identifiants recoupés avec les sources admises et URL vérifiées par le registre public.
- Injection : une demande contenant des instructions d'exfiltration produit une abstention sans citation.
- Fournisseur : Bedrock refuse de démarrer sans la serrure indépendante; région et modèle alternatifs sont refusés.
- Ressources : 8 requêtes/minute et 60/heure par l'API, 100 invocations Bedrock maximum par processus/campagne, concurrence 2, timeout 15 secondes, une tentative, coupe-circuit après 3 échecs.
- Journalisation Bedrock : statut, durée, modèle, région et compteurs de jetons seulement; ni question, ni source, ni secret.
- Secrets : aucun certificat, clé privée, secret SQL ou jeton AWS n'est ajouté au dépôt ou à l'image.

## Dépendances

L'audit runtime backend après correction rapporte zéro vulnérabilité. `@xmldom/xmldom` est fixé à 0.8.15 et l'override `multer` à 2.5.0. Les régressions ciblées et le build passent après mise à jour.

## Réserves

IAM Roles Anywhere est validé hors ligne uniquement. Aucun appel AWS réel n'a été effectué. L'identité SQL de production et ses privilèges effectifs restent `NOT_VERIFIED`.
