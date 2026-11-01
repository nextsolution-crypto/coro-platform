# Lot correctif recommandé — Paramètres

## Lot A — Frontières d’autorisation (bloquant)

1. Centraliser l’autorité de gestion des membres et l’appliquer aux listes, détails et mutations.
2. Séparer l’information organisation minimale de l’annuaire administrateur.
3. Protéger logos et Module 1 par la même autorité ADMIN/SUPER_ADMIN.
4. Ajouter `OrganizationStatusGuard` aux contrôleurs Paramètres qui représentent des fonctions normales.
5. Tests : deux tenants, ADMIN, OPERATOR, identité inactive, ClientUser, payload forgé et refus sans effet.

## Lot B — Autorité des données organisationnelles (décision requise)

Décider si les coordonnées et logos sont organisationnels ou personnels. L’interface les annonce comme organisationnels; la correction recommandée est une autorité `Organization` unique, avec migration vérifiée des valeurs existantes et audit avant/après. Ne pas migrer sans règle de résolution des divergences historiques.

## Lot C — Identités et invitations (bloquant)

1. Remplacer la création/renvoi avec mot de passe visible par une invitation à usage unique.
2. Utiliser une outbox chiffrée, idempotente, observable et rejouable.
3. Ne jamais retourner succès si la livraison reste inconnue; distinguer compte créé, événement persisté, fournisseur accepté et livraison.
4. Vérifier le secret actuel ou une réauthentification forte pour changer le mot de passe.
5. Auditer création, renvoi, annulation, désactivation et changements de rôle sans secret.

## Lot D — Résilience et UX

1. Ajouter états erreur/reprise accessibles sur Membres et Organisation.
2. Conserver saisie non sauvegardée et neutraliser les réponses obsolètes.
3. Aligner les cartes Outils sur les capacités effectives.
4. Ajouter confirmations expliquant retrait d’affectation, retrait de membre et désactivation.

## Corrections éditoriales recommandées au Manuel

- Remplacer l’aperçu actuel par une distinction claire profil personnel / organisation / équipe.
- Préciser les rôles autorisés et l’effet immédiat de la désactivation.
- Ne pas décrire invitation et renvoi comme fiables tant que l’outbox et la reprise ne sont pas gouvernées.
- Expliquer que les actions de communication externe nécessitent un état de livraison observable.

## Critère de sortie

Tous les SET-001 à SET-009 corrigés ou explicitement décidés, tests API/PostgreSQL PASS, Chrome ciblé PASS et aucune notification réelle.
