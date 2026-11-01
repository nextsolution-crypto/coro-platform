# Constats — Manuel d’utilisation CORO

## MAN-001 — couverture insuffisante de l’application Organisation

- Sévérité : Haute.
- Statut : `CONFIRMED`.
- Reproduction : ouvrir `/manual` avec un `User` interne actif et comparer les 15 articles aux espaces principaux du menu.
- Résultat : aucun article dédié pour Clients, Carte, Conformité, Bibliothèque ou Paramètres; couverture seulement introductive de plusieurs parcours livrés.
- Impact : un nouvel utilisateur ne peut pas exécuter de manière autonome plusieurs fonctions du périmètre consolidé et peut ignorer des règles de sécurité ou de gouvernance importantes.
- Preuve : catalogue `2026-10-24.1`, production observée, `MANUAL-CONTENT-COVERAGE.md`.
- Correction proposée : compléter le catalogue depuis les preuves de clôture de chaque module, sans transformer le Manuel en seconde autorité métier.
- Acceptation : article exact pour chaque espace inclus, liens réels, rôles/limites explicites, tests de recherche et recette Chrome ciblée.

## MAN-002 — contenu non réconcilié avec les décisions d’exploitation récentes

- Sévérité : Haute.
- Statut : `CONFIRMED`.
- Reproduction : rechercher dans le catalogue la désactivation Client, les archives, le géocodage, le suivi documentaire Conformité et la connectivité IA de la Bibliothèque.
- Résultat : ces décisions ne sont pas documentées.
- Impact : risque d’attentes incorrectes et d’actions inadaptées, particulièrement pour la suspension d’accès, les archives et les interprétations réglementaires.
- Preuve : clôtures Clients #135, Carte #139, Conformité #142 et Bibliothèque #144; aucune occurrence correspondante dans le catalogue.
- Correction proposée : intégrer les formulations factuelles approuvées et incrémenter `MANUAL_VERSION`.
- Acceptation : contenu concordant avec les contrats et rapports de clôture, sans promesse de conformité, d’IA ou de fournisseur non démontrée.

## MAN-003 — ancre de chapitre perdue après F5

- Sévérité : Moyenne.
- Statut : `CONFIRMED`.
- Reproduction : ouvrir `/manual#timelog`, puis recharger la page.
- Résultat : l’ancre reste dans l’URL, mais après le chargement asynchrone la carte Timelog demeure environ 1731 px sous le haut au lieu d’être repositionnée.
- Impact : liens partagés, signets, historique et reprise après F5 n’ouvrent pas le chapitre attendu.
- Preuve : mesure navigateur avant F5 ≈205 px; après F5 ≈1731 px.
- Correction proposée : après réception des articles, valider l’identifiant, puis utiliser un repositionnement contrôlé et accessible (`scrollIntoView` sans animation si réduction de mouvement).
- Acceptation : lien direct, F5, retour/avance et ancre inconnue testés sur les deux surfaces.

## MAN-004 — visibilité des instructions non conditionnée par rôle ou module

- Sévérité : Moyenne.
- Statut : `POLICY_NOT_VERIFIED`.
- Reproduction : appeler la liste interne avec tout `User` actif.
- Résultat : le seul filtre est `INTERNAL`; un article commercial ou d’approbation est visible indépendamment des permissions et activations du compte.
- Impact : aucun droit supplémentaire n’est accordé, mais les fonctions et instructions peuvent être présentées hors contexte et créer de la confusion.
- Preuve : `UserManualService.list`, contrôleurs et tests de garde.
- Correction proposée : décider si l’aide interne est volontairement globale. Sinon, filtrer à partir d’un contexte serveur minimal et documenté, sans dupliquer le RBAC des modules.
- Acceptation : politique approuvée, tests admin/opérateur/module désactivé et maintien du refus applicatif sur la destination.

## MAN-005 — appellation « Aide CORO AI » ambiguë

- Sévérité : Faible.
- Statut : `CONFIRMED`.
- Reproduction : lire le panneau d’aide et inspecter le contrat serveur.
- Résultat : l’interface utilise la marque CORO AI, tandis que le fournisseur retourné est `USER_MANUAL_EXTRACTIVE`, déterministe et sans IA générative.
- Impact : le fonctionnement est sûr et expliqué, mais le nom peut laisser croire que l’assistant Knowledge/IA documentée est impliqué.
- Preuve : page `/manual` et `UserManualService.ask`.
- Correction proposée : privilégier « Recherche guidée dans le Manuel » ou afficher explicitement le moteur déterministe dans le libellé.
- Acceptation : aucun mélange possible avec Knowledge, CORO AI authentifié ou l’assistant public.

## MAN-006 — restitution par lecteur d’écran non démontrée

- Sévérité : Faible.
- Statut : `NOT_VERIFIED`.
- Reproduction : non applicable sans lecteur d’écran réel disponible.
- Résultat : DOM et rôles accessibles cohérents; restitution vocale non exécutée.
- Impact : certaines difficultés de lecture ou d’ordre d’annonce peuvent subsister.
- Preuve : arbre accessible Chrome uniquement.
- Correction proposée : campagne NVDA ou équivalent après le lot éditorial.
- Acceptation : navigation, annonces de chargement/erreur/résultat et détails validés vocalement.
