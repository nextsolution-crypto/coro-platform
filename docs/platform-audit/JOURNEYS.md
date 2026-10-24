# Campagnes de validation de bout en bout

État initial : **à exécuter dans cette campagne**, sauf preuve explicitement reliée.
Les tests existants seront réutilisés ; leur présence seule ne ferme aucune ligne.
Pour chaque parcours, consigner release, acteurs, preuve, résultat réel, écarts,
conditions commerciales et décision conformément à AUDIT-PLAN.md.

| ID | Parcours et résultat attendu | Acteurs/périmètres | Contrôles négatifs et reprise |
|---|---|---|---|
| AUTH-01 | Connexion → MFA → session → refresh → déconnexion ; session révoquée inutilisable | interne, client, compte inactif | mauvais code, expiration, rejeu refresh, isolation des types de jeton |
| CORE-01 | Organisation → client → bâtiment → projet ; rattachements cohérents après recharge | administrateur, conseiller, client corporate et manager | organisation B, bâtiment non attribué, objet archivé, retrait de permission |
| DOC-01 | Configuration → génération → édition → validation → export PDF ; version et contenu cohérents | conseiller autorisé et lecteur | champs requis, erreur génération, fichier privé, accès direct refusé |
| DOC-02 | Fichier DRAFT → REVIEW → APPROVED → remplacement/révocation ; source admissible actuelle | approbateur et lecteur | futur, expiré, révoqué, ancienne version, stockage absent ; reprise contrôlée |
| DOC-03 | Bibliothèque → procédure → application au projet → export ; origine et version conservées | administrateur bibliothèque et conseiller | modèle incomplet, procédure retirée, écrasement concurrent |
| PERF-01 | Mandat → tâches → activités → temps → rendement ; agrégats justifiables | gestionnaire, conseiller | activité annulée, saisie invalide, périmètre interdit, doublon |
| PLAN-01 | Réservation → éligibilité → affectation → planning → réalisation ; états cohérents portail/interne | gestionnaire, intervenant, client | indisponibilité, chevauchement, annulation, notifications simulées, idempotence |
| SENT-01 | Employé → présence IN/OUT → occupation ; bonne population du site | gestionnaire et employé contrôlés | PIN invalide, borne expirée, mauvais site, doublon de présence |
| SENT-02 | Évacuation simulée → suivi → personnes manquantes → fin → historique | opérateur autorisé et observateur | action interdite, mauvais bâtiment, répétition, perte réseau ; aucun déclenchement réel |
| INC-01 | Incident fictif → journal → suivi → clôture → rapport accessible | opérateur et lecteur autorisés | ressource autre tenant, transition invalide, concurrence, reprise |
| REX-01 | Exercice → rapport brouillon → publication → consultation portail → action corrective → suivi | rédacteur, valideur, client | brouillon non publié, confidentialité, révocation d’accès, export |
| RES-01 | Rôles/plans/qualifications/exercices → indicateurs de résilience ; calcul explicable | gestionnaire de bâtiment et portefeuille | donnée absente, action restreinte, changement de période, autre site |
| POP-01 | Programme isolé → inscription → OTP → consentement → localisation → profil | opérateur et citoyen synthétique | OTP expiré/rejoué, changement de contact, localisation invalide, désinscription |
| POP-02 | Préparation → approbation → roster figé → envoi simulé → preuve → clôture/REX | préparateur, approbateur et diffuseur distincts selon gouvernance | mauvais rôle, mauvais site, panne provider, résultat ambigu, retry sans doublon |
| POP-03 | Validation LIVE des canaux ; destinataire contrôlé et preuve fournisseur concordante | opérateur et destinataire explicitement autorisés | HELP/STOP, suppression, webhook, absence d’autre envoi ; campagne distincte |
| AI-01 | Document approuvé → indexation → question → réponse → source exacte ; code absent non inventé | interne/client et périmètre interdit | preuve historique release722 disponible ; à relier à la campagne actuelle, injection et panne provider |
| AI-02 | PDF natif/scanné/mixte → OCR local → citations par page ; contenu incomplet refusé | mêmes acteurs AI-01 | mauvaise empreinte, faible confiance, limites temps/pages, reprise ingestion |
| HELP-01 | Manuel → recherche de fonction → étapes citées → écran cible ; public correctement filtré | interne et client | article interne direct interdit au client, fonction inconnue, absence réseau, clavier/mobile |
| OFF-01 | Document autorisé → préparation coffre → hors ligne → expiration/révocation → purge | client et appareil contrôlé | appareil révoqué, contenu absent, ressource périmée, autre utilisateur sur l’appareil |
| COM-01 | Prospect → configuration → offre approuvée/émise → acceptation → contrat → signature → droits | commercial autorisé, signataire et administrateur | clause non approuvée, prix/version incohérents, famille non vendable, capacité non accordée |
| COM-02 | Contrat → abonnement → facturation → suivi ; montants et périodes cohérents | administration financière | prorata, arrêt, doublon, montant invalide ; aucun paiement réel de recette |
| NET-01 | Navigation et refus conformes au registre FUTURE/NOT_AVAILABLE | client avec/sans capacité et administrateur | aucun accès commercial supposé ; activer un produit futur n’est pas un test de lecture |
| OPS-01 | Release immuable → backup/restauration vérifiée → déploiement → santé → rollback ; état réconcilié | opérateur infrastructure | panne, verrou concurrent, image incorrecte, politique AI désactivée ; exercice isolé de restauration |
| WEB-01 | Site public → pages → liens → formulaire simulé ; promesses concordantes avec aptitude produit | visiteur et lecteur mobile | lien cassé, fausse promesse LIVE, clavier, données invalides, aucun message réel |

Ces parcours doivent ensuite être décomposés et reliés aux IDs de `inventory.json`.
Un parcours peut couvrir plusieurs fonctions ; une réussite partielle ne ferme
pas l’ensemble du module. Le propriétaire commercial tranche le périmètre vendable
sur les preuves et les conditions réelles, pas sur un nombre de tests global.
