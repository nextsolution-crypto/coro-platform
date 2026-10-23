# MASTER — Knowledge et CORO AI en production privée

## Mandat

Terminer les six étapes autorisées par Mathieu Montaroux le 23 octobre 2026,
à partir de la release privée `fff622e530e7d833e6d81cea7ac5978186b3708e`.
Livrer le code, les tests, la procédure d'exploitation et des preuves distinctes
pour les contrôles automatisés, les essais réels et les limites restantes.
Ne jamais présenter une préparation, une simulation ou une vérification non
exécutée comme une réussite en production.

## Invariants

- ProjectFile reste l'unique autorité documentaire : version, approbation,
  dates d'effet/expiration, révocation, confidentialité et rattachement au projet.
- Aucune approbation métier forgée, aucun JWT de production fabriqué, aucune
  identité de production usurpée. Les changements métier passent par les API
  canoniques et leurs contrôles. Les fixtures sont explicitement fictives.
- Les tests locaux utilisent une base jetable et des identités synthétiques.
  Ils ne réutilisent jamais les secrets, documents ou sessions de production.
- Les seules invocations réelles prévues pour la recette utilisent des données
  synthétiques. Ni clé privée, ni mot de passe, ni jeton dans Git ou les preuves.
- Bedrock : profil canadien autorisé, région ca-central-1, session de 900 s,
  credential_process et montages de certificats strictement en lecture seule.
- Aucun envoi d'alerte opérationnelle, aucune évacuation ni mutation métier
  déclenchée par l'assistant. Les contextes opérationnels restent en lecture seule.
- Tout déploiement utilise des images immuables et le circuit de release existant,
  avec sauvegarde, restauration vérifiée, santé, réconciliation et retour arrière.

## 1. Activation durable entre les déploiements

Définir une politique locale root-only, absente = désactivée, sans secret.
La release génère un overlay strict à partir de cette politique et de l'image
approuvée ; elle contrôle le fournisseur, les montages et un smoke synthétique
avant de déclarer la réussite. Une configuration invalide ne doit jamais activer
un fournisseur par défaut ou modifier silencieusement la destination des données.
Le retour au fournisseur déterministe doit être explicite, testable et documenté.

Critères : activation conservée lors d'une nouvelle release ; absence ou politique
désactivée sans accès AWS ; mauvais modèle/région/session/montage refusé ; preuve
de santé et résultat fournisseur joints à la release, sans texte documentaire.

## 2. Recette documentaire représentative

Créer un corpus reproductible fictif : PDF multipage, tableau, sources concordantes
et contradictoires, information absente, versions successives et PDF scanné.
Vérifier texte extrait, pages, empreintes et citations exactes ; aucune réponse
ne doit contenir une information absente ou une consigne opérationnelle inventée.
Conserver un inventaire SHA-256 et les limites de taille/pages/temps.

## 3. Cycle de vie réel

Tester DRAFT -> REVIEW -> APPROVED, dates futures, expiration, remplacement et
révocation via le service canonique et les endpoints métier. Vérifier l'exclusion
immédiate des sources non admissibles à la recherche, puis la réconciliation des
projections, l'idempotence, les tentatives échouées et la reprise contrôlée.
Ne jamais révoquer un document réel pour fabriquer une preuve.

## 4. Accès et contextes

Matrice : organisation A/B, interne autorisé/non autorisé, client corporate,
manager avec/sans bâtiment, document partagé/interne et périmètres Network.
Tester Incident, Sentinelle, Network, ExerciseReport et CorrectiveAction : identité
de contexte, organisation, bâtiment, confidentialité, ressource absente, mélange
de bâtiments et absence de chemin de mutation. Distinguer la preuve locale
automatisée de la recette effectuée dans la production privée.

## 5. Exploitation

Livrer diagnostic sans secrets, état du fournisseur, état des indexations,
compteurs d'échec, échéance du certificat, politique de renouvellement,
surveillance périodique et procédures de dégradation/reprise. Ne pas journaliser
prompts, réponses, contenu documentaire, secrets ou coordonnées personnelles.
Les coûts doivent être surveillés avec les métriques/alertes AWS existantes ;
une alerte budgétaire ne constitue pas un plafond de dépense.

## 6. OCR local et fermé en cas d'échec

Évaluer puis valider Poppler/Tesseract local, sans service OCR externe.
Activation explicite, français/anglais, pages exactes, provenance LOCAL_OCR,
seuil de confiance, taille d'image, nombre de pages, durée, concurrence et sortie
bornés. Nettoyage des fichiers temporaires et arrêt de l'arbre de processus à
l'expiration du délai. Texte natif préservé ; document incomplet ou OCR incertain
refusé plutôt qu'indexé comme une preuve fiable. Aucune correction OCR supposée
ne doit modifier le document canonique ou sa signature.

## Validation et livraison

Exécuter les tests ciblés, les intégrations PostgreSQL pertinentes, les contrats
de déploiement et les builds. Revoir le diff ; intégrer par PR puis release
contrôlée. Effectuer la recette privée avec le corpus fictif et les comptes
autorisés, en incluant la consultation de la source citée. Produire une matrice
PASS / FAIL / NOT_VERIFIED et une liste explicite de limites. Toute étape bloquée
reste ouverte ; les autres travaux indépendants continuent.
