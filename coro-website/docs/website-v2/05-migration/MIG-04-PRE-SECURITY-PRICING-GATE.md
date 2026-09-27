# MIG-04-PRE — Security & Pricing Governance Gate

**Mise à jour MIG-04-PRE-B : les décisions humaines sont approuvées et enregistrées dans la section « HUMAN GOVERNANCE DECISIONS — APPROVED » ci-dessous ; elles priment sur les recommandations des sections 21 et 22.**

Gate d'audit et de gouvernance AVANT toute migration de `/security` (MIG-04A) ou de `/pricing` (MIG-04B). Aucune page, aucun texte public, aucune image, aucune route, aucun sitemap, aucun registre V2 modifié. Date : 2026-09-26. Branche `feature/website-v2`, HEAD `e70132bf`. Autorité d'architecture : `01-strategy/TARGET-PAGE-ARCHITECTURE-V2.1.md`.

Statuts utilisés : **VERIFIED CURRENT FACT** · **PARTIAL** · **NOT VERIFIED** · **NOT IMPLEMENTED** · **FUTURE** · **COMMERCIAL DECISION REQUIRED** · **LEGAL / PRIVACY REVIEW REQUIRED**. Pour les faits techniques, chaque ligne distingue IMPLEMENTED IN CODE, CONFIGURED, DEPLOYED / VERIFIED et MARKETING CLAIM SAFE : un code source établit une implémentation, pas un déploiement.

## 1. Scope

**Constaté au départ.** HEAD `e70132bf`, arbre propre au moment de la vérification initiale.

**Constaté pendant le gate (non causé par ce gate).** Trois fichiers d'images ont changé dans l'arbre de travail pendant l'audit, de l'extérieur : `public/website-v2/pricing/pricing-coro-plans.webp` supprimé, `public/website-v2/pricing/pricing-coro-modular-platform.webp` ajouté, `public/website-v2/security/security-canadian-hosting.webp` remplacé (243 260 → 251 642 octets ; fichier daté du 26 septembre à 09:53). Ce gate n'a écrit dans aucun de ces fichiers. Les deux versions sont auditées ci-dessous (l'ancienne est restée lisible dans Git à `e70132bf`). Conséquence : `TARGET-PAGE-ARCHITECTURE-V2.1.md` §10 cite encore l'ancien nom `pricing-coro-plans.webp` ; il sera à mettre à jour quand les remplacements seront validés et commités.

**Méthode.**
- Pages publiques lues telles que rendues (build de production local, code identique à `e70132bf`), FR et EN.
- Code (`coro-backend`, `coro-website`, `docker-compose.yml`, `.github/workflows/deploy.yml`) lu en lecture seule ; aucun fichier `.env` ni secret n'a été lu.
- Vérification de déploiement par requêtes `HEAD` sur `getcoro.io`, `api.getcoro.io`, `app.getcoro.io`, `client.getcoro.io` (en-têtes publics seulement), et par l'API publique du blogue.
- Recherche publique ciblée (sources en fin de document). Aucun volume ni classement n'est avancé.
- L'état du serveur (région exacte du VPS, cron de sauvegarde, pare-feu, configuration Cloudflare) n'est pas lisible depuis le dépôt ni depuis l'extérieur : ces éléments sont NOT VERIFIED tant que le propriétaire n'a pas fourni une preuve (capture de console, script, configuration).

**Bases de référence créées (avant toute modification).**

| Fichier | Contenu |
|---|---|
| `tests/fixtures/security-baseline.json` | FR, EN, `?ref=CR-ABCDEF` : métadonnées, canonical, hreflang, robots, OG / Twitter, titres, liens, CTA, images, JSON-LD, comptes header / main / footer, texte visible complet |
| `tests/fixtures/pricing-baseline.json` | idem pour `/pricing` |

Constats de base : (1) `?ref=` ne change ni le contenu ni le canonical (canonical sans `ref`). (2) `?lang=en` rend l'anglais côté serveur (canonical `?lang=en`). (3) `<html lang>` reste « fr » même en anglais (dette globale connue). (4) `/security` : 1 header, 1 main, 1 footer (legacy) ; JSON-LD `WebPage` avec `about: SoftwareApplication` ; aucune image `<img>`. (5) `/pricing` : **0 `<header>` et 0 `<main>`** (aucun repère de région principale, à corriger en MIG-04B) ; JSON-LD `WebPage`, `BreadcrumbList`, `FAQPage` ; aucune image `<img>`.

## HUMAN GOVERNANCE DECISIONS — APPROVED

Tâche MIG-04-PRE-B, 2026-09-26. Décisions humaines approuvées et enregistrées ici. Elles n'ont modifié aucune page, aucun texte public, aucune image, aucune route, aucun sitemap ni registre V2. Elles priment sur les recommandations du §21 et du §22 et résolvent les décisions COMMERCIAL DECISION REQUIRED du §20 indiquées ci-dessous. Les éléments juridiques et de vie privée restent des éléments de gouvernance avant la mise en ligne, sauf s'ils empêchent une formulation véridique.

### D1. Tarification : MODÈLE A (approuvé)

Aucun prix public fixe. La page Tarification V2 explique comment un environnement / une offre commerciale CORO est configuré(e) et mène vers une discussion personnalisée ou une soumission. Ne pas publier de prix mensuel, annuel, de rabais ni de « à partir de » inventés. Ne pas créer de paliers de forfaits SaaS artificiels sans approbation distincte. Résout : CD-01 (modèle), CD-03 (nom et contenu des forfaits : aucun forfait public), CD-06 et CD-07 (aucun élément de forfait ni module vendu séparément publiés).

### D2. Essai gratuit

Aucune promesse publique d'un « essai gratuit de 30 jours » ni des limites d'essai historiques (1 utilisateur, 3 projets, exports filigranés). Direction V2 : DÉMONSTRATION / DISCUSSION COMMERCIALE D'ABORD. Un environnement d'essai ou de démonstration peut être accordé séparément, sans offre publique standardisée. Résout : CD-02.

### D3. Programme fondateur

RETIRÉ de la V2 publique (section `#fondateur` de `/pricing` et bandeau d'accueil qui y mène) : aucun programme commercial faisant autorité n'appuie l'affirmation publique. Cela n'empêche pas des offres commerciales négociées en privé. Résout : CD-04. Conséquences à traiter aux étapes de migration : (a) le lien `/pricing#fondateur` de l'accueil deviendra caduc et sera retiré ou redirigé lors de la migration de l'accueil (MIG-09) ; (b) MIG-04B ne le reprend pas ; (c) aucune autre page n'est modifiée dans cette tâche.

### D4. Promesse « 24 heures »

RETIRER la promesse publique ferme (« sous 24 heures », « within 24 hours », « dans les 24 heures ») de la copie de conversion publique de Website V2. Sens préféré : « Notre équipe vous contactera pour discuter de vos besoins ». Formulation exacte adaptable par page. Résout : CD-05 et PB-05.

**Élément transversal de gouvernance de contenu (CROSS-PAGE CONTENT-GOVERNANCE).** Occurrences connues, à traiter à leurs étapes respectives et non modifiées ici : `/pricing` (bandeau du héros, FR et EN, en MIG-04B) ; `DemoForm.tsx` (message de succès, utilisé sur l'accueil, `/contact` et `/pricing`, FR et EN) ; accueil (« Nous répondons habituellement dans les 24 heures », FR et EN, en MIG-09). Le message de `DemoForm` est un composant partagé : son remplacement exige une instruction distincte.

### D5. Parrainage

> **SUPPLANTÉE le 2026-09-26 (MIG-04B-B, décision humaine) :** un encart contextuel de parrainage avec lien vers `/programme-recommandation` est désormais autorisé sur `/pricing`, le programme restant distinct du modèle de tarification (voir B8). Le texte ci-dessous est conservé comme historique.

Le programme de crédit de 250 $ reste la propriété de la page de parrainage. Ne pas le promouvoir sur `/pricing` ; aucune impression de double remise (le lien discret évoqué au §15 n'est plus retenu par défaut). La validité commerciale du programme reste REVIEW (CD-08).

### D6. Sécurité : hébergement canadien

Direction publique approuvée : l'INFRASTRUCTURE APPLICATIVE PRINCIPALE de CORO est hébergée au Canada, sous réserve du périmètre d'infrastructure exactement vérifié. Ne pas revendiquer « toutes les données restent au Canada » : des traitements par des tiers existent et se traitent séparément. Le texte final de `/security` suit la matrice vérifiée du §2 et la règle de publication du §3.2 ; les exigences de preuve du §21 (point 8) demeurent.

### D7. Loi 25 / LPRPDE

Ne pas affirmer que CORO est « conforme à la Loi 25 », « certifié LPRPDE » ou l'équivalent. Formulations prudentes et factuelles seulement (échelle du §4.1). LEGAL / PRIVACY REVIEW REQUIRED avant la mise en ligne pour toute formulation définitive de confidentialité ou de conformité (LR-02).

### D8. SOC 2 / ISO

Ne pas attribuer à CORO les certifications ou attestations de DigitalOcean. Ne pas affirmer que CORO est certifié SOC 2 ou ISO 27001. Les attestations du fournisseur ne peuvent être évoquées qu'avec une portée précise, si elles sont réellement utiles. Direction par défaut : ne pas en faire un argument marketing central (l'affirmation « SOC 2 Type II du fournisseur », ligne 37 du §2, n'est donc plus un élément central et peut être omise).

### D9. MFA : non approuvée comme argument de vente

La MFA existe dans le code mais n'est PAS approuvée comme argument de vente publique de `/security`. Raison : durcissement de sécurité requis. Ne pas la corriger dans Website V2. La ligne 10 du §2 et les recommandations qui la promouvaient sont supplantées : ne pas la présenter publiquement en MIG-04A, ni dans un contexte de forfait.

**Dette technique enregistrée : SECURITY-HARDENING — MFA.** Audit et durcissement futurs, au minimum :
- génération du code ;
- caractère cryptographique de l'aléa (observation SEC-01 : le code utilise `Math.random`) ;
- stockage (le code est conservé en clair en base) ;
- expiration ;
- limites de tentatives ;
- limitation du débit ;
- cycle de vie des appareils de confiance (jetons de 90 jours) ;
- journalisation ;
- récupération et comportements de contournement.

Suivi : SR-01 (§20) devient SECURITY-HARDENING — MFA.

### D10. Sauvegardes

RETIRER / NE PAS RÉPÉTER : « 30 jours de sauvegardes » et « snapshots quotidiens », sauf rétablissement indépendant ultérieur. Direction publique sûre : formulation générale de sauvegarde et de récupération seulement quand elle est appuyée par la preuve. Ne pas publier de durée de conservation non appuyée. Résout : PB-01 et PB-02 par retrait ; la fréquence « toutes les 6 heures » n'est publiable qu'après confirmation du cron (ligne 13 du §2).

### D11. Tiers et vie privée

Les traitements par des tiers identifiés restent dans la revue juridique et de vie privée, au minimum : Cloudflare, Brevo, Anthropic, Formspree, Mapbox. Ne pas prétendre que tout le traitement se fait au Canada. LEGAL / PRIVACY REVIEW REQUIRED avant la mise en ligne (LR-01).

### D12. Image de la page Sécurité

L'humain a DÉJÀ remplacé l'image de sécurité dans le dépôt : `public/website-v2/security/security-canadian-hosting.webp` (version actuelle). Ne pas générer d'autre image ; ne pas restaurer l'ancienne ; ne pas appliquer les conclusions de l'ancienne image à la nouvelle.

**Pendant MIG-04A :** localiser le WebP de remplacement, l'ouvrir, auditer ce qui est réellement visible, le classer depuis zéro, l'intégrer s'il est sûr. Les constats du §5.1 sont un pré-audit indicatif, pas une approbation. Jamais d'approximation de logo CORO générée par IA : logo officiel fourni, ou aucun logo.

### D13. Image de la page Tarification

L'humain a DÉJÀ remplacé l'image de tarification dans le dépôt : `public/website-v2/pricing/pricing-coro-modular-platform.webp`. Ne pas générer d'autre image ; ne pas restaurer `pricing-coro-plans.webp`.

**Pendant MIG-04B :** localiser le WebP de remplacement, l'ouvrir, auditer l'image réellement présente, l'intégrer seulement si elle n'implique aucun prix, forfait, rabais, module ou capacité non appuyés. Logo officiel CORO seulement, ou aucun logo. Les constats du §13.2 (modules FUTURE et « Exercices » à l'écran) sont un pré-audit indicatif : l'intégration exige un nouvel audit de l'image du dépôt à ce moment-là.

### D14. Autorisation de procéder

- **MIG-04A `/security` : APPROUVÉ À PROCÉDER** après l'enregistrement de ces décisions.
- **MIG-04B `/pricing` : APPROUVÉ À PROCÉDER** avec le MODÈLE A. Aucune décision supplémentaire de modèle de tarification n'est requise avant la migration.
- Les éléments juridiques et de vie privée restants (LR-01 à LR-04) sont des éléments de gouvernance de mise en ligne, sauf s'ils empêchent une formulation véridique.

### Effet sur le registre du §20

| ID | Nouvel état |
|---|---|
| PB-01 | Résolu par retrait (D10) |
| PB-02 | Résolu par retrait (D10) |
| PB-03, PB-04 | Restent des conditions de formulation ou de preuve pour MIG-04A : ne publier que ce qui est vérifié (pare-feu, en-têtes du site, cloisonnement) |
| PB-05 | Résolu par retrait de la promesse (D4), à exécuter page par page |
| CD-01 à CD-07 | Résolus (D1 à D4) ; CD-08 reste REVIEW (D5) |
| LR-01 à LR-04 | Restent LEGAL / PRIVACY REVIEW avant la mise en ligne (D6, D7, D11) |
| SR-01 | Devient SECURITY-HARDENING — MFA (D9) ; aucune correction dans Website V2 |
| SR-02, SR-03 | Restent ouverts : à traiter avant les affirmations correspondantes |
| AH-01, AH-02 | À réauditer sur les fichiers du dépôt pendant MIG-04B et MIG-04A (D13, D12) |

## 2. Security claim matrix

`Public-safe ?` = peut être publié tel quel maintenant. Sources : S = `/security`, P = `/privacy`, T = `/terms`, H = accueil, F = pied de page, PF = FAQ de `/pricing`, I = image `security-canadian-hosting.webp` (ancienne version).

| # | Affirmation | Libellé actuel | Source de vérité | Statut | Public-safe ? | Décision |
|---|---|---|---|---|---|---|
| 1 | Pays d'hébergement | S : « maintenir leurs données au Canada » ; F : « Hébergé au Canada » | Voir §3 | PARTIAL | Non tel quel | REWRITE : « infrastructure principale hébergée au Canada », avec divulgation des tiers (§3) |
| 2 | Ville / région | S : « infrastructure située à Toronto, Ontario » | Documentation du propriétaire (`CORO_CONTEXTE_REPRISE_v4.md` : VPS DigitalOcean Toronto) ; code : région `tor1` codée en dur pour le stockage de fichiers | PARTIAL (documenté et cohérent, non observé de l'extérieur) | Oui, après une preuve de console | KEEP, avec preuve archivée (capture de la région du VPS et du bucket) |
| 3 | Fournisseur infonuagique | S : « DigitalOcean » | Documentation du propriétaire, code du stockage (`digitaloceanspaces.com`) | VERIFIED CURRENT FACT | Oui | KEEP |
| 4 | Résidence des données | S : « Une infrastructure canadienne pour vos données » ; F, P §7, PF, H | Voir §3 | PARTIAL | Non tel quel | REWRITE (localisation de l'infrastructure principale, pas des données de bout en bout) |
| 5 | Chiffrement en transit | S : « HTTPS/TLS » | Requêtes HTTPS observées sur les quatre hôtes ; HSTS observé sur l'API | VERIFIED CURRENT FACT (le TLS public est terminé chez Cloudflare, voir §3) | Oui | KEEP ; ne pas préciser la version TLS ni le segment Cloudflare → origine sans preuve |
| 6 | Chiffrement au repos | Non revendiqué | Aucune preuve (disque du VPS non documenté ; fichiers sur Spaces non documentés) | NOT VERIFIED | Ne pas ajouter | Ne rien publier |
| 7 | Chiffrement de bout en bout | I (ancienne) : « Chiffrement de bout en bout » | Faux par conception : le serveur lit le contenu (génération de PDF, procédures assistées par IA) | NOT IMPLEMENTED | Non | DO NOT PUBLISH |
| 8 | Mots de passe | S : « stockés sous forme hachée » | `bcrypt` (coût 10) dans `auth.service.ts`, `client-auth.service.ts`, `buildings.service.ts` | IMPLEMENTED IN CODE ; déploiement présumé identique | Oui | KEEP |
| 9 | Authentification / abus | S : « Protection contre les tentatives d'authentification abusives » | Limitation de débit par IP (`@Throttle`, 5 tentatives par minute sur le login et la vérification MFA, 120 / min globales) ; jetons de rafraîchissement ; pas de verrouillage par compte | IMPLEMENTED IN CODE (limitation de débit) | Oui avec formulation exacte | REWRITE : « limitation du débit des tentatives de connexion » |
| 10 | MFA | S : « MFA prévu pour les environnements et offres nécessitant un niveau de sécurité renforcé » ; I : « Contrôle d'accès MFA » | Code : code à usage unique à 6 chiffres envoyé par courriel à la connexion (conseiller et portail client), expiration 10 minutes, appareil de confiance 90 jours ; non lié à une offre | IMPLEMENTED IN CODE (le texte public sous-estime, et la mention « offres » n'existe pas dans le produit) | Oui avec formulation exacte ; voir l'observation d'ingénierie SEC-01 | REWRITE : « double authentification par code à usage unique envoyé par courriel » ; ne jamais écrire « MFA renforcée » ni le lier à un plan |
| 11 | Rôles et permissions | S : « Rôles et permissions différenciés selon les responsabilités » | Rôles utilisateur et gardes dans le backend | IMPLEMENTED IN CODE | Oui | KEEP |
| 12 | Isolation des locataires | S : « Les environnements clients sont isolés » | Cloisonnement logique par `organizationId`, correctif de renforcement récent ; aucun test indépendant ni test d'intrusion | PARTIAL (isolation logique, pas d'environnements séparés) | Non tel quel | REWRITE : « données cloisonnées par organisation » |
| 13 | Sauvegardes | S : « Sauvegardes automatisées, toutes les 6 heures » | Documentation du propriétaire : cron toutes les 6 h vers `/opt/backups/postgresql/` sur le même serveur ; script hors dépôt | PARTIAL (documenté, non vérifié, non hors site) | Prudence | KEEP la fréquence seulement après confirmation du cron ; ne pas dire « redondantes » |
| 14 | Durée de rétention des sauvegardes | S : « Rétention 30 jours » | La documentation dit « 30 derniers backups conservés » ; à 6 h d'intervalle, cela représente environ 7,5 jours, pas 30 jours | **CONTRADICTION** entre le texte public et la documentation | Non | REWRITE ou VERIFY : afficher la durée réelle (vérifier le script) |
| 15 | Restauration | Non revendiquée directement (S : « mécanismes de sauvegarde et de récupération ») | Aucune preuve d'un test de restauration | NOT VERIFIED | Non | Ne pas promettre de restauration testée |
| 16 | Reprise après sinistre | Implicite (« récupération ») | Aucun plan, RTO ni RPO ; la réplique de lecture est une priorité de feuille de route (haute disponibilité) | NOT IMPLEMENTED (FUTURE) | Non | Ne pas revendiquer |
| 17 | Snapshots quotidiens | S : « Snapshots : Quotidiens » | Aucune source dans le dépôt ni dans la documentation | NOT VERIFIED | Non | REMOVE tant qu'une preuve de console n'existe pas |
| 18 | Disponibilité / surveillance | S : « La disponibilité du service est surveillée » | Documentation : UptimeRobot sur `app.getcoro.io` et `api.getcoro.io` ; le site et le portail client ne sont pas cités | PARTIAL | Avec précision | REWRITE : « surveillance de disponibilité des services principaux » |
| 19 | Surveillance 24/7 | I : « Surveillance continue 24/7 », équipes devant des écrans | Aucun centre d'opérations ni personnel de garde | NOT IMPLEMENTED | Non | DO NOT PUBLISH |
| 20 | Journalisation | S : « journalisation des actions » | Module d'audit et modèle `AuditLog` ; journaux applicatifs | IMPLEMENTED IN CODE | Oui | KEEP (sans durée de conservation) |
| 21 | Réponse aux incidents de sécurité | P §12 : « processus de gestion des incidents de confidentialité » | Aucun plan écrit dans le dépôt | NOT VERIFIED | LEGAL / PRIVACY REVIEW REQUIRED | Vérifier l'existence du processus et du registre exigé par la loi |
| 22 | Tests d'intrusion | Non revendiqués | Aucune preuve | NOT VERIFIED | Ne pas ajouter | Ne rien publier |
| 23 | Gestion des vulnérabilités | Non revendiquée | Aucun outil d'analyse de dépendances dans l'intégration continue (typecheck, tests, build seulement) | NOT IMPLEMENTED (en CI) | Ne pas ajouter | Ne rien publier |
| 24 | Mises à jour logicielles | Non revendiquées | Déploiement continu sur `main` après typecheck et tests | IMPLEMENTED (processus) | Sans objet | Ne rien publier |
| 25 | SLA | S : « SLA infrastructure 99,9 % » | Le SLA publié par DigitalOcean est de 99,99 % par Droplet et de 99,9 % pour Spaces ; le texte ne dit pas de quel service il s'agit. T §11 : aucune garantie de disponibilité par CORO | PARTIAL / ambigu | Non tel quel | REWRITE (nommer le service et la source) ou REMOVE ; aucun SLA propre à CORO |
| 26 | Support | Non revendiqué sur `/security` | Sans objet | — | — | — |
| 27 | Conservation des données | P §9 générique ; S : rétention des sauvegardes seulement ; purge Sentinelle en tâche planifiée | Pas de politique de conservation générale dans le code | NOT VERIFIED | LEGAL / PRIVACY REVIEW REQUIRED | Ne pas publier de durée sans décision |
| 28 | Suppression | P §9 : « détruits de façon sécuritaire » ; T §12 : selon l'entente | Aucune procédure de suppression de fin d'abonnement documentée | NOT VERIFIED | LEGAL / PRIVACY REVIEW REQUIRED | Idem |
| 29 | Sous-traitants | S : DigitalOcean seulement ; P §6 : « fournisseurs de services » sans noms | Voir §3 : au moins Cloudflare, Brevo, Anthropic, Formspree, Mapbox en plus de DigitalOcean | PARTIAL (divulgation incomplète) | LEGAL / PRIVACY REVIEW REQUIRED | Décider du niveau de divulgation (catégories ou noms) |
| 30 | Courriel / SMS | Non détaillé publiquement | Brevo (courriel transactionnel, codes MFA, alertes ; SMS) | VERIFIED (code) | Voir §3 | À divulguer avec les sous-traitants |
| 31 | Fournisseurs d'IA | T §8 encadre le contenu assisté par IA ; S : silence | API Anthropic (assistant du site, importation de PCA, procédures personnalisées) | VERIFIED (code) | LEGAL / PRIVACY REVIEW REQUIRED | Divulguer ; ne pas laisser croire que tout reste au Canada |
| 32 | Analytique / témoins | P §10 : témoins « nécessaires » ; consentement pour les non essentiels | Aucun traceur d'analytique trouvé par recherche dans le code des trois applications ; témoins de parrainage propres à CORO (90 jours) | VERIFIED (recherche dans le code) | À revoir | Lister les témoins réels dans la politique |
| 33 | Vie privée | S : « Pratiques ... tenant compte du cadre législatif québécois » | Formulation prudente | — | Oui | KEEP ; voir §4 |
| 34 | Loi 25 | S : formulation prudente ; P §15 : « conformément aux lois applicables » ; I : « Conformité Loi 25 & PIPEDA », « Loi 25 » coché ; H (texte non rendu) : « Conformité Loi 25, PIPEDA » | Voir §4 | LEGAL / PRIVACY REVIEW REQUIRED | Non pour « conforme » | Ne jamais écrire « conforme Loi 25 » |
| 35 | LPRPDE / PIPEDA | S : « Cadre fédéral lorsqu'applicable » | — | — | Oui | KEEP |
| 36 | ISO 27001 | I : « ISO 27001 (inspiration) » | Aucune certification | NOT IMPLEMENTED (certification) | Non | DO NOT PUBLISH ; « inspiration » n'est pas une certification |
| 37 | SOC 2 | S : « SOC 2 Type II : attestation du fournisseur d'infrastructure, distincte de CORO » | DigitalOcean détient un SOC 2 Type II (source publique) ; portée exacte des services utilisés (Droplets, Spaces à Toronto) non vérifiée | VERIFIED au niveau du fournisseur ; portée NOT VERIFIED | Oui avec la mention « distincte de CORO » | KEEP ; vérifier la portée dans le rapport de confiance du fournisseur |
| 38 | PCI DSS | Non revendiqué | CORO n'encaisse aucun paiement (aucune facturation dans le produit) | Sans objet | — | Ne rien publier |
| 39 | HIPAA | Non revendiqué | Sans objet (les établissements de santé apparaissent seulement comme choix de type de bâtiment) | Sans objet | — | Ne rien publier |
| 40 | CCOHS / CNESST / CNPI | Absents de `/security` ; l'accueil affiche « ISO 22301 · CNPI 2020 · CNESST » sous « Cadres & références » | Décision D-02 de MIG-00A | — | Hors périmètre de `/security` | À traiter avec l'accueil (MIG-09) |
| 41 | Certifications / audits de CORO | S : « La sécurité doit être vérifiable, pas seulement déclarée » ; liste de documents (architecture, identité, sauvegardes, protection réseau, journalisation, questionnaire de sécurité fournisseur) | Aucun de ces documents ni questionnaire n'existe dans le dépôt ; l'adresse `mailto` de documentation existe | NOT VERIFIED | Non tel quel | REWRITE : ne promettre que ce qui peut être remis ; sinon « sur demande » sans liste |
| 42 | En-têtes HTTP de sécurité | S : « La configuration Web intègre des en-têtes de sécurité » | Observé le 2026-09-26 : `api.getcoro.io` (CSP, HSTS avec `preload`, X-Frame-Options, nosniff, Referrer-Policy) ; `app.getcoro.io` (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) ; **`getcoro.io` et `client.getcoro.io` : aucun de ces en-têtes observé** | PARTIAL | Non tel quel | REWRITE (« sur l'API et l'application ») ou corriger d'abord (SEC-04) |
| 43 | Pare-feu réseau | S : « Les accès réseau sont limités aux services nécessaires » | Aucune configuration dans le dépôt ; `docker-compose.yml` publie les ports 3000, 3001, 3002 et 3003 de l'hôte ; la base de données n'est pas publiée ; Cloudflare est en frontal | NOT VERIFIED | Non | VERIFY (pare-feu du fournisseur ou de l'hôte) avant de publier |

## 3. Infrastructure / data-residency truth

### 3.1 Faits d'infrastructure

| Fait | Source | Ce que cela prouve | Ce que cela ne prouve pas | Statut |
|---|---|---|---|---|
| Application, base de données et sites tournent dans des conteneurs sur un VPS | `docker-compose.yml`, `.github/workflows/deploy.yml` (déploiement SSH, `docker compose pull / up`) | Architecture : PostgreSQL 16 dans un conteneur, volume local ; aucune base gérée | La région du VPS | CONFIGURED |
| VPS DigitalOcean, Toronto | `CORO_CONTEXTE_REPRISE_v4.md` (documentation du propriétaire) | Intention et état déclarés | Que la machine soit réellement à Toronto aujourd'hui | PARTIAL (documenté) |
| Base de données PostgreSQL | Volume Docker sur le même VPS | La base suit la région du VPS | Emplacement des copies de sauvegarde | PARTIAL |
| Stockage de fichiers (documents, images, PDF) | `storage.service.ts` : `tor1.digitaloceanspaces.com` codé en dur pour la signature et l'hôte ; `DO_SPACES_ENDPOINT` par défaut Toronto | Le code cible le centre de données de Toronto (Spaces y est offert) | Que la variable d'environnement de production ne pointe pas ailleurs ; le caractère privé ou public des objets (aucune ACL dans le code, l'URL renvoyée utilise le CDN) | IMPLEMENTED IN CODE ; CONFIGURED par défaut ; déploiement NOT VERIFIED |
| Sauvegardes | Documentation : cron toutes les 6 h, 30 derniers fichiers, `/opt/backups/postgresql/` ; script `backup-db.sh` hors dépôt | Existence déclarée | Exécution réelle, chiffrement, copie hors serveur, test de restauration | PARTIAL (documenté seulement) |
| Journaux | Journaux Nest (contiennent des adresses courriel) et `AuditLog` | Traçabilité applicative | Durée de conservation, emplacement | IMPLEMENTED IN CODE |
| Frontal Cloudflare sur les quatre hôtes | En-têtes observés (`Server: cloudflare`, `CF-RAY` avec point de présence YYZ) | Tout le trafic public transite par Cloudflare ; le TLS public y est terminé | L'emplacement de l'origine (le point de présence Toronto est celui du visiteur) ; la configuration du chiffrement entre Cloudflare et l'origine ; l'usage de Cloudflare comme pare-feu applicatif | DEPLOYED / VERIFIED |
| TLS | Requêtes HTTPS réussies ; HSTS observé sur l'API | HTTPS actif | Détails de configuration | DEPLOYED / VERIFIED |
| Courriel et SMS | Brevo (`BREVO_API_KEY`, expéditeur SMS) | Envoi de codes MFA, alertes, notifications, SMS d'alerte | Emplacement de traitement de Brevo (fournisseur d'origine européenne ; région non confirmée) | IMPLEMENTED IN CODE |
| Intelligence artificielle | Appels directs à `api.anthropic.com` : assistant du site (Haiku), importation de PCA (Sonnet), procédures personnalisées | Du contenu utilisateur et visiteur est envoyé à un fournisseur d'IA externe | Emplacement de traitement, conservation, usage pour l'entraînement (à confirmer par les conditions du fournisseur) | IMPLEMENTED IN CODE |
| Géocodage de la population (Sentinelle Population) | Mapbox (`MAPBOX_GEOCODING_ACCESS_TOKEN`) | Des adresses sont envoyées à un fournisseur externe | Emplacement de traitement | IMPLEMENTED IN CODE (fournisseur configurable) |
| Formulaire de démonstration | `DemoForm.tsx` : envoi vers `formspree.io/f/xnpadzyq` | Nom, courriel, téléphone, organisation, message et code de parrainage quittent l'infrastructure de CORO pour un service tiers | Emplacement de traitement | DEPLOYED / VERIFIED (utilisé sur l'accueil, `/contact`, `/pricing`) |
| Surveillance | UptimeRobot (documentation) | Sondage d'URL, sans données personnelles | Couverture du site et du portail client | PARTIAL |
| Certificat TLS de l'origine | Documentation : Let's Encrypt (certbot) | — | Concordance avec le frontal Cloudflare | NOT VERIFIED |

### 3.2 Résidence des données d'application, séparée du traitement par des tiers

**Données d'application de CORO (base de données, fichiers, sauvegardes).** Hébergées sur DigitalOcean, Toronto selon la documentation du propriétaire et le code de stockage. Formulation supportable : « L'infrastructure principale de CORO est hébergée à Toronto (DigitalOcean). »

**Traitement par des tiers (hors de la garantie de résidence).**

| Tiers | Données concernées | Emplacement | Divulgué aujourd'hui ? |
|---|---|---|---|
| Cloudflare | Tout le trafic HTTPS des quatre sites | Réseau mondial (point de présence local) | Non |
| Brevo | Courriels, SMS, codes MFA, alertes | Non confirmé | Non nommé |
| Anthropic | Messages de l'assistant du site ; contenu des importations de PCA et des procédures personnalisées | Non confirmé (fournisseur américain) | Non nommé ; T §8 encadre le contenu, pas le flux |
| Formspree | Demandes de démonstration | Non confirmé (fournisseur américain) | Non |
| Mapbox | Adresses (Sentinelle Population) | Non confirmé (fournisseur américain) | Non |

**Règle de publication.** Ne pas publier « toutes les données restent au Canada » : c'est faux tant que ces flux existent. Pour un site qui parle à des acheteurs TI et juridiques, la formulation défendable est la localisation de l'infrastructure principale plus une phrase honnête sur les fournisseurs tiers (« certains services, comme le courriel, la messagerie texte, l'assistance par IA et les formulaires, sont fournis par des tiers qui peuvent traiter des données hors du Canada »). Le niveau exact de divulgation est une décision LEGAL / PRIVACY REVIEW REQUIRED (§4).

### 3.3 Observations d'ingénierie (internes, à ne pas publier)

| ID | Observation | Preuve | Priorité |
|---|---|---|---|
| SEC-01 | Le code MFA à 6 chiffres est généré avec `Math.random` (non cryptographique), stocké en clair en base et comparé sans comparaison à temps constant | `auth.service.ts`, `client-auth.service.ts` | À corriger avant de promouvoir la double authentification |
| SEC-02 | La limite du corps de requête JSON est de 250 Mo dans le code ; la documentation de projet mentionne 25 Mo | `main.ts` | À confirmer |
| SEC-03 | La politique CSP de l'API autorise `'unsafe-inline'` pour les scripts | `main.ts` | Faible (API) |
| SEC-04 | Aucun en-tête de sécurité observé sur `getcoro.io` et `client.getcoro.io` ; le site Next.js n'en définit pas dans sa configuration | `next.config.ts`, en-têtes observés | Moyen : à régler côté Cloudflare ou Next avant de publier « en-têtes de sécurité » pour le site |
| SEC-05 | Ports 3000 à 3003 publiés sur l'hôte par Docker Compose ; la protection dépend du pare-feu de l'hôte | `docker-compose.yml` | À vérifier |
| SEC-06 | Les fichiers sont téléversés sans ACL explicite ; le caractère privé ou public des objets dépend du réglage du bucket | `storage.service.ts` | À vérifier |
| SEC-07 | Aucune analyse automatique des dépendances en intégration continue | `deploy.yml` | Recommandé avant de parler de gestion des vulnérabilités |
| SEC-08 | Les sauvegardes sont sur le même serveur que la base (aucune copie hors serveur documentée) | Documentation | Recommandé |

## 4. Privacy / legal claims (Loi 25, LPRPDE)

### 4.1 Échelle de formulations (non équivalentes)

| Formulation | Sens | Usage permis pour CORO |
|---|---|---|
| « soutient les obligations de » | L'outil aide le client à remplir ses obligations | Oui, quand la fonction existe réellement |
| « conçu en tenant compte des exigences de » | Intention de conception | Oui (formulation actuelle prudente de `/security` et de l'accueil) |
| « conforme à » | Affirmation d'un état de conformité vérifié | **Non** sans avis juridique et preuves |
| « certifié » | Attestation d'un tiers accréditeur | **Non** : aucune certification de CORO |

### 4.2 Constats sur les textes publics

| Élément | Constat | Classe |
|---|---|---|
| S : Loi 25 et LPRPDE présentés comme cadres pris en compte | Formulation prudente | Acceptable |
| P §15 : « traite les renseignements personnels conformément aux lois applicables » | Plus forte qu'une « prise en compte » : affirme un traitement conforme | LEGAL / PRIVACY REVIEW REQUIRED |
| P §7 : « héberge les données de la plateforme au Canada » | Vrai pour la plateforme ; silencieux sur les tiers (§3.2) | LEGAL / PRIVACY REVIEW REQUIRED |
| P §7 : évaluations avant tout traitement hors Québec | La Loi 25 exige une évaluation des facteurs relatifs à la vie privée avant de communiquer des renseignements personnels hors Québec ; aucune preuve interne d'évaluation pour Anthropic, Brevo, Formspree, Mapbox, Cloudflare | LEGAL / PRIVACY REVIEW REQUIRED |
| P §6 : « fournisseurs de services » non nommés | Aucun nom ni catégorie ; la politique ne dit pas que des renseignements peuvent sortir du Canada pour ces fournisseurs | LEGAL / PRIVACY REVIEW REQUIRED |
| P §10 : témoins | Générique ; les témoins de parrainage (90 jours) ne sont pas listés | CONTENT REVIEW |
| P §12 : incidents de confidentialité | Suppose un processus et un registre ; aucune preuve dans le dépôt | LEGAL / PRIVACY REVIEW REQUIRED |
| P §13 : responsable de la protection | Titre et coordonnées présents ; personne non nommée | LEGAL / PRIVACY REVIEW REQUIRED (exigence de publication du titre et des coordonnées) |
| P et T : identité de l'exploitant | « Mathieu Montaroux, entreprise individuelle, NEQ 2282543935 » ; le pied de page dit « © 2026 CORO » ; le nom de marque « CORO » est utilisé seul ailleurs | LEGAL / PRIVACY REVIEW REQUIRED (décision D-05) |
| Image ancienne : « Loi 25 compliant » | Contredit la formulation prudente et la règle ci-dessus | DO NOT PUBLISH |

Sources publiques consultées : Commission d'accès à l'information du Québec (principaux changements de la Loi 25) et Gouvernement du Québec (évaluation des facteurs relatifs à la vie privée) : évaluation obligatoire avant de communiquer hors Québec, en tenant compte du régime juridique de l'État destinataire ; Commissariat à la protection de la vie privée du Canada (lignes directrices sur le traitement transfrontalier) : la LPRPDE n'interdit pas les transferts pour traitement mais impose la responsabilité et la transparence de l'organisation. Analyses tierces : la Loi 25 n'impose pas expressément l'hébergement au Canada ; un rapport SOC 2 ne répond pas à la question de la résidence. **Ces sources ne constituent pas un avis juridique.**

## 5. Security asset

### 5.1 Version actuelle (`security-canadian-hosting.webp`, remplacée le 2026-09-26)

1672 × 941, WebP. Contenu exact : une fenêtre donnant sur la Colline du Parlement (Ottawa) au crépuscule ; une femme de dos devant deux écrans (carte du Canada, schéma de réseau) ; à droite, une allée de baies de serveurs ; un pilier portant une feuille d'érable. **Aucun texte lisible incrusté** ; aucun logo, aucune norme, aucun statut.

| Élément | Vérifié ? | Sûr ? | Décision |
|---|---|---|---|
| Colline du Parlement, Ottawa | Faux pour l'hébergement (Toronto) ; évoque un lien avec le gouvernement fédéral | Risque de confusion | REVIEW : soit accepter comme symbole « canadien », soit recadrer |
| Personne devant des écrans de carte et de réseau | Sans rapport avec une équipe réelle ; suggère une équipe d'exploitation ou de surveillance | Risque de surinterprétation | Acceptable comme illustration décorative sans légende |
| Baies de serveurs | Illustration générique ; CORO n'exploite pas son propre centre de données (infrastructure louée à DigitalOcean) | Acceptable si le texte nomme le fournisseur | Acceptable |
| Feuille d'érable | Symbole canadien | Sûr | Acceptable |

**Détermination.** A. Utilisable en l'état : OUI, comme ILLUSTRATION MARKETING décorative (`alt=""`), jamais comme preuve, à condition que le texte de la page nomme le fournisseur et Toronto ; le point d'attention est Ottawa et l'impression d'un centre de données propre à CORO. B. Un recadrage supprime les deux risques : la moitié droite (x de 730 à 1672 environ : allée de serveurs et feuille d'érable) donne un carré d'environ 942 × 941 px, exploitable en image de section, pas en héros 16:9. C. Remplacement : non requis. Décision humaine : conserver le plan large ou recadrer.

### 5.2 Version précédente (dans Git à `e70132bf`, remplacée)

Contenait des affirmations incrustées, toutes non publiables : « Hébergé au Canada, Toronto, Ontario » ; « Conformité Loi 25 & PIPEDA » ; liste cochée « Loi 25 · PIPEDA · ISO 27001 (inspiration) · Sauvegardes redondantes · Infrastructure canadienne » ; écrans « Statut des services » tout au vert (Application CORO, Base de données, Sauvegardes, API et intégrations, Sentinelle, Sentinelle Population) ; « Chiffrement de bout en bout » ; « Contrôle d'accès MFA » ; « Surveillance continue 24/7 » ; personnel en veste CORO devant des postes de surveillance. Aucune n'était vérifiée ; plusieurs sont fausses (chiffrement de bout en bout, surveillance 24/7, ISO 27001). Un recadrage ne pouvait pas les retirer sans laisser l'image trompeuse. Décision : REPLACE (fait, de l'extérieur).

### 5.3 Brief visuel si un remplacement est finalement souhaité

| Champ | Contenu |
|---|---|
| Sujet | Infrastructure informatique sobre et fiable au Canada |
| Environnement | Salle de serveurs (colocation) ou vue sur un centre-ville canadien ; lumière froide |
| Personnes | Aucune ou une silhouette lointaine ; jamais de veste, de logo ou d'uniforme CORO |
| Objets | Baies de serveurs, câblage, feuille d'érable discrète, verre |
| Contexte canadien | Feuille d'érable ou paysage urbain **de Toronto** ; pas de Parlement, pas de drapeau du gouvernement |
| Contexte de sécurité | Portes verrouillées, allée contrôlée ; aucune impression de surveillance humaine continue |
| Ne doit pas apparaître | Texte de conformité (Loi 25, PIPEDA, ISO, SOC, HIPAA), cadenas avec « chiffrement », statuts « opérationnel », 24/7, MFA, noms de fournisseurs, logos, cartes du monde |
| Nom de fichier cible | `security-canadian-infrastructure.webp` |
| Dimensions cibles | 1672 × 941 (16:9, comme les autres actifs V2) |

## 6. Security SEO

Recherche publique ciblée (français, Québec et Canada ; anglais pour la terminologie).

- « hébergement données Canada logiciel SaaS » : les résultats sont des pages de fournisseurs qui parlent d'hébergement canadien, de disponibilité et de résidence des données, et de pages du gouvernement du Canada sur la résidence des données. Le vocabulaire dominant : « hébergement canadien », « souveraineté des données », « résidence des données ».
- « Loi 25 hébergement » : la conformité à la Loi 25 est présentée comme un sujet de gouvernance (politiques, contrats avec les sous-traitants, gestion des accès), et non comme une propriété de l'emplacement des serveurs.
- « SaaS security Canada » (anglais) : « data residency » et « SOC 2 » sont des termes distincts ; un rapport SOC 2 ne répond pas à la question de la résidence.
- Aucun volume ni classement de recherche n'est avancé.

**Territoire recommandé** : sécurité et hébergement de la plateforme CORO : où l'infrastructure principale est hébergée, comment les accès sont contrôlés, ce qui est protégé, et comment obtenir des renseignements techniques. **Interdits** : toute revendication de certification, de conformité légale ou de garantie (Loi 25, ISO 27001, SOC 2 de CORO, « sécurisé à 100 % »).

**Titre** : le titre actuel « Sécurité CORO | Protection des données et hébergement au Canada | CORO » répète la marque (le gabarit racine ajoute « | CORO »). Piste : « Sécurité et hébergement des données au Canada » (sans marque, sans « conformité »). **Description** : reprendre uniquement les faits publiables du §2 (hébergement à Toronto, chiffrement HTTPS/TLS, contrôle des accès, sauvegardes) ; ne rien affirmer sur la Loi 25 ni sur des certifications. **JSON-LD** : l'existant déclare un `SoftwareApplication` dans `about` ; la pratique V2 n'en émet pas sur les autres pages ; décision à prendre en MIG-04A. À valider une dernière fois (MIG-00A §26.6) avant de figer.

Ressources candidates (à vérifier selon la règle de découverte au moment de MIG-04A) : `registre-visiteurs-protection-renseignements-personnels` (existe dans l'API publique du blogue). Aucun article sur la sécurité de l'hébergement n'existe : ne rien inventer.

## 7. Pricing claim matrix

Sources : PR = `/pricing` publié, D = code mort de l'accueil non rendu (`pricing` dans `HomePageClient.tsx`, absent du HTML rendu), I1 = ancienne image `pricing-coro-plans.webp`, I2 = nouvelle image `pricing-coro-modular-platform.webp`, C = code (`license-limits.ts`, schéma), T = conditions d'utilisation.

| # | Affirmation | Libellé actuel | Source produit / commerciale | Statut | Public maintenant ? | Décision |
|---|---|---|---|---|---|---|
| 1 | Nom des forfaits | PR : aucun forfait ; trois « profils indicatifs » (bâtiment unique, organisation multisites, firmes et professionnels) ; D et I1 : « Essai gratuit », « Standard », « Entreprise » | C : trois types de licence internes `ESSAI_GRATUIT`, `STANDARD`, `ENTREPRISE` (étiquettes d'administration, attribuées à la main par le super administrateur) | PARTIAL | Non (D et I1) | COMMERCIAL DECISION REQUIRED |
| 2 | Essai gratuit | PR : aucun ; D : « Essai gratuit 0 $, 30 jours » ; I1 : idem | Voir §9 | PARTIAL | Non | COMMERCIAL DECISION REQUIRED |
| 3 | Durée de l'essai | D, I1 : « 30 jours » | C : aucune date d'expiration ni tâche de fin d'essai | NOT IMPLEMENTED | Non | REMOVE tant que non décidé et implémenté |
| 4 | Nombre d'utilisateurs | D : essai 1, Standard « jusqu'à 5 », Entreprise illimité ; I1 : 1 / 5 / illimités | C : essai 1 utilisateur ; Standard et Entreprise `null` (aucune limite) | PARTIAL ; contradiction (« 5 » n'existe pas) | Non | REMOVE |
| 5 | Nombre de projets | D et I1 : essai « 3 projets » | C : essai 1 projet | **CONTRADICTION** | Non | REMOVE |
| 6 | Export PDF avec filigrane | D, I1 | Le filigrane est appliqué aux PDF de façon générale ; il n'est pas lié à la licence | NOT VERIFIED comme limite d'essai | Non | REMOVE |
| 7 | Accès après démonstration | D : « Accès activé à la suite d'une démonstration » | C : aucune inscription libre ; les organisations sont créées par le super administrateur | VERIFIED CURRENT FACT | Oui (fait) | Peut être dit sans engagement commercial |
| 8 | Standard | D : « Pour les firmes conseil en croissance » avec liste de fonctions | C : aucune différence fonctionnelle entre Standard et Entreprise | NOT IMPLEMENTED (aucun droit distinct) | Non | COMMERCIAL DECISION REQUIRED |
| 9 | Entreprise | D : « Utilisateurs illimités », « MFA et sécurité renforcée », « SLA de disponibilité », « Formation personnalisée », « Gestionnaire de compte dédié » | Voir §10 | PARTIAL / NOT IMPLEMENTED selon la ligne | Non | COMMERCIAL DECISION REQUIRED |
| 10 | Utilisateurs illimités | D, I1 | C : oui pour Standard et Entreprise, sans plafond technique | IMPLEMENTED IN CODE | À décider | Ne pas écrire « illimité » sans validation commerciale |
| 11 | MFA | D et I1 : réservé à Entreprise | C : appliquée à tous les comptes | CONTRADICTION avec le produit | Non | REMOVE du contexte de forfait |
| 12 | SLA | D : « SLA de disponibilité » ; I1 : « SLA dédié » | T §11 : aucune garantie de disponibilité | NOT IMPLEMENTED (contractuel) | Non | COMMERCIAL DECISION REQUIRED ; conflit avec les conditions |
| 13 | Formation / accompagnement | PR : « Le niveau d'accompagnement... est abordé lors de l'évaluation » ; D : « Formation personnalisée » | Service, pas fonction du produit | PARTIAL | PR : oui (formulation générale) ; D : non | KEEP PR ; REMOVE D |
| 14 | REPTOX | D (Standard) : « Matières dangereuses REPTOX » | Fonction du produit disponible, sans limite par licence | AVAILABLE PRODUCT | Oui comme fonction, pas comme droit de forfait | Ne pas lier à un forfait |
| 15 | Sentinelle | PR : « Présence en temps réel avec Sentinelle » ; D : Standard | Voir §11 | AVAILABLE PRODUCT | Oui comme capacité | — |
| 16 | Incident | PR : « gestion des incidents... exercices et retour d'expérience » ; D : « Module Incident + bouton panique » | Voir §11 | AVAILABLE PRODUCT | Oui comme capacité | Formulations à aligner sur la page Incident |
| 17 | Sentinelle Population | Absent de PR | Voir §11, §12 | AVAILABLE PRODUCT (activation par installation) | Oui comme capacité, sans prix | — |
| 18 | AI / Knowledge / Network / Campus / Ops | I2 : tuiles « Knowledge », « Ops », « AI », « Network » et menu latéral | Aucun code pour Knowledge, Network, Campus ; l'IA existe comme fonctions d'assistance, pas comme produit à vendre | FUTURE / NOT IMPLEMENTED | **Non** | DO NOT PUBLISH sur la page tarifs |
| 19 | Tarification par organisation / site / bâtiment | PR : « Quatre facteurs déterminent votre configuration : sites et bâtiments, utilisateurs, capacités CORO, accompagnement » | Décision commerciale du propriétaire, sans trace dans le produit (aucune facturation) | COMMERCIAL DECISION REQUIRED (confirmer) | Déjà public | KEEP tant que confirmé |
| 20 | Mise en place et intégration | PR : « Évaluation, configuration, déploiement, accompagnement » | Processus de service | COMMERCIAL DECISION REQUIRED (confirmer) | Déjà public | KEEP tant que confirmé |
| 21 | Support | PR : niveau « convenu » ; D : « Support par email », « Support prioritaire » | Aucune structure de niveaux de support | NOT IMPLEMENTED | D : non | REMOVE D |
| 22 | Facturation mensuelle / annuelle | I1 : basculeur « Mensuel / Annuel » | Aucune facturation dans le produit | NOT IMPLEMENTED | Non | DO NOT PUBLISH |
| 23 | Rabais | I1 : « Économisez jusqu'à 20 % » | Aucune source | NOT VERIFIED | Non | DO NOT PUBLISH |
| 24 | Programme fondateur | PR et accueil : « Tarif fondateur préservé à long terme », « places limitées » | Aucune logique dans le produit | COMMERCIAL DECISION REQUIRED | Déjà public | Voir §14 |
| 25 | Crédit de recommandation | Page de parrainage : 250 $ | Schéma : `rewardAmountCents` par défaut 25 000 | IMPLEMENTED IN CODE ; validité commerciale à confirmer | Sur sa propre page | Voir §15 |
| 26 | Taxes | Absentes de PR ; T §9 : « les taxes exigibles s'ajoutent » | T | VERIFIED (contrat) | Oui (par T) | Ne pas répéter |
| 27 | Résiliation, hausses et baisses de forfait | Absentes de PR ; T §14 : selon l'offre ou l'entente | T | Contrat | Oui (par T) | Ne pas inventer de conditions |
| 28 | Soumission sur mesure | PR : « nous établissons votre configuration avec vous » ; T §9 : proposition commerciale | T, PR | VERIFIED CURRENT FACT (modèle publié) | Oui | KEEP |
| 29 | Montants en dollars | PR : aucun ; D : « 0 $ » ; I1 : « 0 $ », « 199 $ / mois » | Aucune source | NOT VERIFIED | Non | DO NOT PUBLISH |
| 30 | « Réponse sous 24 heures » | PR (bandeau du héros) | Voir §16 | COMMERCIAL DECISION REQUIRED | Non tel quel | Voir §16 |
| 31 | Hébergement (FAQ) | PF : « hébergées au Canada, sur une infrastructure DigitalOcean à Toronto » | Voir §3 | PARTIAL | Avec la formulation de §3 | Aligner sur `/security` |

## 8. Current commercial model

**Modèle public actuellement publié et sûr (aucun prix inventé).** Configuration sur mesure, établie avec le client à partir de quatre facteurs (sites et bâtiments, utilisateurs, capacités activées, niveau d'accompagnement), trois profils indicatifs qui ne sont pas des forfaits, un processus en quatre étapes (évaluation, configuration, déploiement, accompagnement), et aucune tarification affichée. Les conditions d'utilisation (§9, §10) sont cohérentes avec ce modèle (tarifs « indiqués dans une proposition commerciale, une commande ou une entente distincte », essais gratuits possibles et modifiables).

**Déjà décidé (par le texte public existant et le code).** Modèle sur soumission ; les quatre facteurs ; aucune inscription libre (organisation créée par CORO) ; existence de trois types de licence internes ; limites d'essai internes (1 utilisateur, 1 projet).

**Reste une décision d'affaires.** Noms et contenu des forfaits ; existence, durée et conditions d'un essai gratuit ; différences entre Standard et Entreprise ; modules vendus séparément ; prix ; facturation ; SLA ; support ; programme fondateur ; promesse de délai de réponse ; rabais.

**Capacité du produit ≠ emballage commercial.** Le produit offre déjà toutes les capacités du §11 sans distinction de licence ; l'emballage commercial (qui reçoit quoi, à quel prix) n'existe ni dans le code ni dans la documentation du dépôt. La source de vérité commerciale est le propriétaire : toute affirmation absente de la page publiée actuelle exige sa décision.

## 9. Free trial

| Élément | Vérification | Statut |
|---|---|---|
| 30 jours | Aucune expiration dans le code ; seul l'affichage historique le mentionne (accueil non rendu, ancienne image) | NOT IMPLEMENTED |
| Un utilisateur | `ESSAI_GRATUIT` : `maxUsers = 1` | IMPLEMENTED IN CODE |
| Trois projets | `ESSAI_GRATUIT` : `maxProjects = 1` | CONTRADICTION (le produit dit 1) |
| Exports filigranés | Le filigrane n'est pas lié à la licence | NOT VERIFIED |
| Accès seulement après démonstration | Aucune inscription libre ; les organisations sont créées par le super administrateur | VERIFIED CURRENT FACT |
| Modules inclus | Aucun contrôle des modules par licence dans le code | NOT IMPLEMENTED (pas de limitation) |
| Expiration automatique / conversion | Aucune | NOT IMPLEMENTED |
| Carte de crédit | Aucune facturation dans le produit | Sans objet |
| Annulation | Aucun processus dans le produit ; T §10 : essais modifiables ou retirés | Contrat |

Conclusion : aucune affirmation d'essai publique actuelle (`/pricing` n'en fait pas) ne doit être reprise par inertie ; toute mention d'essai exige une décision commerciale, puis un alignement du produit.

## 10. Standard / Enterprise

| Fonction | Standard | Entreprise | Source | Statut |
|---|---|---|---|---|
| Utilisateurs | Illimités (aucune limite dans le code) ; ancienne copie : « jusqu'à 5 » | Illimités | `license-limits.ts` | IMPLEMENTED IN CODE ; « 5 » est faux ; « illimité » exige une décision |
| Bâtiments | Aucune limite dans le code | Aucune limite | Code | NOT IMPLEMENTED (pas de limite) |
| Projets | Illimités | Illimités | `license-limits.ts` | IMPLEMENTED IN CODE |
| Modules | Tous disponibles, sans contrôle par licence | Idem | Code | NOT IMPLEMENTED (pas de différenciation) |
| Exports | Identiques | Identiques | Code | — |
| Flux d'approbation | Disponible pour tous | Idem | Code | AVAILABLE PRODUCT |
| MFA | Appliquée à tous les comptes | Idem | Code | IMPLEMENTED IN CODE ; ne distingue pas les forfaits |
| SLA | Aucune garantie (T §11) | Aucune | Conditions | COMMERCIAL DECISION REQUIRED |
| Formation | Service | Service | Sans code | COMMERCIAL DECISION REQUIRED |
| Support | Sans structure | Sans structure | Sans code | COMMERCIAL DECISION REQUIRED |
| Fonctions de sécurité | Identiques | Identiques | Code | — |

Ne pas utiliser « illimité » sans validation technique (aucune limite n'est appliquée, mais l'infrastructure n'est pas dimensionnée pour l'illimité) et commerciale.

## 11. Modules / extensions

Capacité d'activation dans le produit : (a) le super administrateur peut changer le **type de licence** d'une organisation, sans effet sur les modules ; (b) l'enregistrement Sentinelle est un réglage **par bâtiment** ; (c) Sentinelle Population est activée **par installation** (`populationEnabled`, configuration guidée par un script d'administration) ; (d) aucun contrôle d'activation par organisation pour Incident, l'IA, les autres modules ; (e) aucun modèle de droits, de facturation ou d'héritage par comptes client.

| Module | Classement | Note |
|---|---|---|
| Documents (PMU, PSI, PCA) | AVAILABLE PRODUCT | PGC, PRA, PUE : FUTURE (phase 2, sans configurateur) |
| Projets, Performance, Portail client | AVAILABLE PRODUCT | Sans droits distincts |
| Résilience et indice CORO | AVAILABLE PRODUCT | |
| Sentinelle | AVAILABLE PRODUCT | Activation par bâtiment ; NOT YET PRICED |
| Incident (avec bouton panique) | AVAILABLE PRODUCT | NOT YET PRICED ; aucun contrôle par licence |
| Sentinelle Population | AVAILABLE PRODUCT (activation par installation) | NOT YET PRICED ; voir §12 |
| REPTOX | AVAILABLE PRODUCT | Fonction, sans limite |
| Fonctions d'assistance par IA (procédures, importation de PCA, assistant du site) | AVAILABLE PRODUCT (fonctions) | Pas un produit « AI » à vendre séparément |
| Exercices et rapports d'exercice | REVIEW | Route publique non promue |
| Knowledge, Network, Campus, Ops | FUTURE / NOT PUBLIC | Aucun code ; ne pas figurer sur la page tarifs |

**CURRENT COMMERCIAL ADD-ON : aucun n'est établi ni documenté.** Tout complément vendu séparément est une décision d'affaires à prendre avant de le publier.

## 12. Sentinelle Population pricing variables

Aucune formule ni variable de facturation n'existe dans le produit. Variables connues qui peuvent nourrir une soumission future :

| Variable | Présente dans le modèle de données ? | Classement |
|---|---|---|
| Installation industrielle | Oui (profil d'installation) | QUOTE INPUT |
| Population potentiellement touchée | Abonnés au programme (nombre) ; zones et scénarios | QUOTE INPUT / FUTURE / NOT DECIDED |
| Population de la municipalité | Non modélisée | FUTURE / NOT DECIDED |
| Établissements sensibles | Oui (éléments environnants) | QUOTE INPUT |
| Substances et quantités | Oui (substances de l'installation) | QUOTE INPUT |
| Canaux (courriel, SMS) | Oui (réglages par programme) ; coûts de fournisseur (Brevo) | QUOTE INPUT ; SMS de production exige une validation propre |
| Complexité de mise en œuvre | Non modélisée | QUOTE INPUT |

**CURRENT BILLING VARIABLE : aucune.** Ne pas transformer ces variables en formule.

## 13. Pricing asset

### 13.1 Ancienne image `pricing-coro-plans.webp` (supprimée de l'arbre de travail ; dans Git à `e70132bf`)

Affichait une interface de forfaits inventée : « Essai gratuit 0 $, 30 jours, 1 utilisateur, 3 projets, export PDF filigrane », « Standard 199 $ / mois, 5 utilisateurs, Sentinelle et Incident », « Entreprise sur mesure, utilisateurs illimités, MFA et sécurité avancée, SLA dédié », basculeur « Mensuel / Annuel », « Économisez jusqu'à 20 % », « Le plus populaire » ; texte de fond « TOUR PRÉMONT ». Chaque chiffre est faux ou non décidé. Décision : REPLACE (fait, de l'extérieur).

### 13.2 Nouvelle image `pricing-coro-modular-platform.webp` (non commitée)

Contenu exact : deux professionnels devant un grand écran ; horizon de Montréal ; enseignes « BÂTIMENTS · PERSONNES · PLANS · PROCÉDURES · RÉSILIENCE · ENSEMBLE » et « Des organisations plus sûres, plus résilientes, ensemble » ; à l'écran, « Une plateforme modulaire qui s'adapte à vos besoins », un menu latéral (Tableau de bord, Bâtiments, Documents, Projets, Conformité, Sentinelle, Incident, Population, Exercices, Knowledge, Ops, AI, Network) et douze tuiles (Gestion documentaire, Projets, Performance, Sentinelle, Incident, Population, **Knowledge, Ops, AI, Network**). **Aucun prix, aucun forfait, aucune durée d'essai** : l'ancienne contradiction commerciale a disparu.

| Élément | Vérifié ? | Sûr ? | Décision |
|---|---|---|---|
| Absence de prix, de forfaits, de rabais | Oui | Sûr | — |
| « Une plateforme modulaire qui s'adapte à vos besoins » | Cohérent avec « capacités activées » du texte publié ; le produit n'a pas de droits par module | Acceptable comme idée | REVIEW |
| Tuiles Knowledge, Ops, AI, Network (et menu latéral) | FUTURE / NOT IMPLEMENTED | **Non** : présente comme disponibles des produits qui n'existent pas | HOLD |
| « Exercices » (menu) | REVIEW (route non promue) | Non | HOLD |
| « Conformité » (menu) | Pas un module | Prudence (évoque une conformité vendue) | REVIEW |
| Interface d'écran illustrée | Non produit réel | Acceptable seulement décorative (`alt=""`) | — |

**Détermination.** USE : non. CROP : possible mais partielle : couper l'image sous la deuxième rangée de tuiles (environ y ≤ 575 sur 941) retire Knowledge, Ops, AI, Network et Exercices du menu, en laissant un bandeau d'environ 1672 × 575 (≈ 2,9:1) avec Sentinelle, Incident et Population ; l'écran serait coupé en bas. REPLACE : recommandé si un visuel de forfaits est souhaité, avec le brief ci-dessous.

**Brief de remplacement.**

| Champ | Contenu |
|---|---|
| Sujet | Choix commercial et modularité : deux personnes qui composent une configuration à partir de briques |
| Environnement | Bureau moderne, lumière naturelle, ville canadienne floue en arrière-plan |
| Personnes | Deux professionnels sobres, sans uniforme ni logo |
| Objets | Grand écran ou tablette montrant des **briques modulaires abstraites** (formes géométriques, icônes sans libellé, code de couleur) ; carnet, stylo |
| Message visuel | Modularité et choix, sans nommer de modules ni de forfaits |
| Ne doit pas apparaître | Prix, devises, « gratuit », « essai », « %», nombres d'utilisateurs, noms de forfaits, tuiles nommées Knowledge, Ops, AI, Network, Campus, Exercices, badges SLA / MFA, logos de tiers, noms de bâtiments réels |
| Nom de fichier cible | `pricing-coro-modular-platform-v2.webp` |
| Dimensions cibles | 1672 × 941 (16:9) |

## 14. Founder program

| Référence | Texte |
|---|---|
| `/pricing` (section `#fondateur`) et accueil (bandeau menant à `/pricing#fondateur`) | « Tarif fondateur préservé à long terme » ; « Influence directe sur les priorités de développement » ; « Accompagnement prioritaire à la mise en place » ; « Reconnaissance comme partenaire fondateur » ; « Nombre de places limité, les conditions fondateur ne seront pas offertes indéfiniment » |
| Produit | Aucune logique de tarif fondateur ; aucun compteur de places |
| Documentation et conditions | Aucun texte décidant l'offre |

Aucune décision commerciale actuelle et faisant autorité n'existe : **COMMERCIAL DECISION REQUIRED**. Ne rien retirer silencieusement ; ne pas migrer automatiquement (règle MIG-00A §26.5). Le lien `/pricing#fondateur` depuis l'accueil doit rester résolu tant que la décision n'est pas prise.

## 15. Referral program relationship

Le crédit de 250 $ est implémenté (montant par défaut de 25 000 cents par recommandation) et publié sur la page de parrainage avec ses conditions (« crédit sans valeur monétaire, applicable aux services CORO admissibles », validation par CORO, aucune auto-recommandation ni contournement de la tarification). `/pricing` ne le mentionne pas aujourd'hui.

**Recommandation.** Ne pas mentionner le crédit sur `/pricing` : un montant en dollars sur la page tarifs pourrait être lu comme un rabais et créer une impression de double remise. Au plus, un lien contextuel discret vers `/programme-recommandation`, sans montant. La validité commerciale du programme reste REVIEW.

## 16. « 24 heures »

| Occurrence | Libellé | Nature | Décision |
|---|---|---|---|
| `/pricing` (bandeau du héros) | « Réponse sous 24 heures » (EN : « Response within 24 hours ») | Engagement ferme | COMMERCIAL DECISION REQUIRED |
| `DemoForm.tsx` (message de succès, utilisé sur l'accueil, `/contact` et `/pricing`) | « Nous vous contacterons dans les 24 heures » | Engagement ferme, affiché après l'envoi | COMMERCIAL DECISION REQUIRED |
| Accueil (bloc de démonstration) | « Nous répondons habituellement dans les 24 heures » | Formulation atténuée (« habituellement ») | Acceptable comme pratique, sinon REWRITE |

**Vérité opérationnelle.** Le formulaire envoie vers Formspree ; rien dans le code n'assure un accusé, une file, une alerte ni un contrôle de délai : le délai dépend uniquement d'une personne. Risque commercial : engagement non tenu en cas d'absence ; risque juridique : promesse contractuelle implicite. Recommandation : REWRITE en « nous répondons habituellement dans un délai d'un jour ouvrable » seulement si la pratique le confirme, sinon REMOVE ; cohérent sur les trois pages. Aucun changement dans ce gate.

## 17. Pricing SEO

Recherche publique ciblée.
- FR (« logiciel mesures d'urgence prix », « tarification plan d'urgence logiciel Québec ») : les résultats sont des fournisseurs de mesures d'urgence et de sécurité civile sans grille de prix publiée (consultation sur demande).
- EN (« emergency management software pricing », « business continuity software pricing ») : la tarification sur soumission est la norme du marché pour la continuité et la gestion d'urgence ; quelques fournisseurs publient un prix d'entrée ; les facteurs cités sont la taille de l'organisation, le nombre d'utilisateurs, les modules et la mise en œuvre facturée séparément.
- Objectif : la terminologie, pas la copie de prix de concurrents. Aucun volume ni classement avancé.

**Territoire** : « tarification » et « coût » d'un logiciel de mesures d'urgence / de continuité, fondé sur la configuration. Le modèle sur soumission actuellement publié est compatible avec ce marché. **Titre** actuel (« Tarification CORO — Une configuration adaptée à votre organisation | CORO ») : répète la marque ; piste sans marque : « Tarification : une configuration adaptée à votre organisation ». **Ressources candidates** (à vérifier selon la règle de découverte au moment de MIG-04B) : `combien-coute-plan-mesures-urgence-pmu`, `plan-mesures-urgence-word-excel-logiciel`, `logiciel-plan-mesures-urgence-pmu`, `logiciel-plan-securite-incendie-psi`, `logiciel-plan-continuite-activites-pca` (tous présents dans l'API publique du blogue le 2026-09-26). Le JSON-LD existant (`WebPage`, `BreadcrumbList`, `FAQPage`) doit être conservé et refléter la FAQ visible.

## 18. Public pricing models

Aucun modèle n'est choisi ici : décision humaine requise.

| | Modèle A : aucun prix public, qualification et soumission | Modèle B : forfaits de base non chiffrés + extensions sur soumission | Modèle C : prix d'entrée transparents + Entreprise sur soumission |
|---|---|---|---|
| Avantages | Déjà publié ; honnête avec le produit ; aucun engagement de prix | Plus concret pour l'acheteur ; met en avant la modularité | Réduit la friction ; signal de confiance |
| Risques | Moins concret pour l'acheteur ; peu de différenciation | Exige de définir ce que contiennent les forfaits ; noms non alignés sur le produit tant qu'aucune différenciation n'existe | Engagement de prix public ; exige facturation, taxes, contrats ; contredit l'absence de facturation dans le produit |
| Données requises | Aucune nouvelle | Contenu des forfaits ; modules vendus séparément ; règles d'activation | Prix, périodes, taxes, conditions d'essai, conditions de résiliation, source de vérité unique |
| Compatibilité avec le modèle CORO actuel | Complète | Partielle : aucun droit distinct dans le produit | Faible : aucune facturation ni droits par forfait dans le produit |

## 19. Cross-page governance

| Affirmation | Pages | Propriétaire de l'autorité | Cohérence | Action ultérieure |
|---|---|---|---|---|
| Réponse en 24 heures | `/pricing` (ferme), `DemoForm` (ferme), accueil (atténuée) | Décision commerciale | Incohérente | Décider, puis harmoniser les trois |
| Hébergement au Canada | `/security` (« maintenir leurs données au Canada »), `/privacy` §7, pied de page, accueil (« infrastructure principale »), FAQ de `/pricing` | `/security` (fait technique) | Formulations de force variable ; l'accueil est la plus exacte | Harmoniser sur « infrastructure principale à Toronto (DigitalOcean) » + divulgation des tiers |
| Loi 25 | `/security` (prudent), `/privacy` §15 (plus fort), accueil (prudent), ancienne image (« conforme »), code mort de l'accueil (« Conformité Loi 25 ») | `/privacy` (avis juridique) | Incohérente | Aligner sur l'échelle du §4.1 ; retirer le code mort en MIG-09 |
| Crédit de recommandation | Page de parrainage | Page de parrainage | Cohérente (une seule page) | Aucune mention sur `/pricing` |
| Programme fondateur | `/pricing`, accueil | Décision commerciale | Cohérente entre les deux, sans autorité | Décider |
| MFA | `/security` (« prévu »), code (implémentée), ancien texte d'accueil (Entreprise), ancienne image | `/security` après validation d'ingénierie | Contradiction avec le produit | Décrire l'état réel ; retirer l'idée de forfait |
| SLA | `/security` (SLA du fournisseur), conditions (aucune garantie), ancien texte d'accueil (« SLA de disponibilité ») | Conditions d'utilisation | Incohérente | Nommer la source ou retirer ; aucun SLA propre à CORO |
| Durée de l'essai | Ancien texte d'accueil non rendu (30 jours), code (aucune expiration), ancienne image | Décision commerciale | Incohérente | Décider ou retirer |
| Identité juridique | Politique de confidentialité et conditions (exploitant individuel), pied de page, JSON-LD | Conditions d'utilisation | Partiellement cohérente | Décision D-05 |
| Adresse et coordonnées | Pied de page, `/privacy`, `/terms`, `/security` | Pied de page | Cohérente | — |
| Sous-traitants (Formspree, Brevo, IA, Cloudflare, Mapbox) | `/privacy` (générique) | `/privacy` | Divulgation incomplète | LEGAL / PRIVACY REVIEW REQUIRED |
| Références « ISO 22301 · CNPI 2020 · CNESST » | Accueil (rendu) | Accueil (décision D-02) | À revoir | MIG-09 |

## 20. Blockers / decisions register

| ID | Classe | Élément | Bloque |
|---|---|---|---|
| MB-01 | MIGRATION-BLOCKER | Aucun blocage dur : les deux migrations peuvent préserver le contenu publié actuel | — |
| PB-01 | PUBLICATION-BLOCKER | Durée de rétention des sauvegardes affichée (30 jours) en contradiction avec la documentation (30 dernières copies) | Publication de `/security` |
| PB-02 | PUBLICATION-BLOCKER | « Snapshots quotidiens » sans source | Publication de `/security` |
| PB-03 | PUBLICATION-BLOCKER | « Pare-feu réseau » et « en-têtes de sécurité du site » non vérifiés ou non observés sur `getcoro.io` et `client.getcoro.io` | Publication de `/security` |
| PB-04 | PUBLICATION-BLOCKER | « Les environnements clients sont isolés » | Publication de `/security` |
| PB-05 | PUBLICATION-BLOCKER | Promesse « 24 heures » ferme (`/pricing`, DemoForm) | Publication de `/pricing` |
| CD-01 | COMMERCIAL DECISION REQUIRED | Modèle public (A, B ou C) | MIG-04B (modèle choisi) |
| CD-02 | COMMERCIAL DECISION REQUIRED | Existence, durée et conditions d'un essai gratuit | Toute mention d'essai |
| CD-03 | COMMERCIAL DECISION REQUIRED | Nom et contenu des forfaits ; Standard et Entreprise ; « illimité » | Modèles B et C |
| CD-04 | COMMERCIAL DECISION REQUIRED | Programme fondateur | Section fondateur de `/pricing` |
| CD-05 | COMMERCIAL DECISION REQUIRED | Promesse de délai de réponse | `/pricing`, DemoForm, accueil |
| CD-06 | COMMERCIAL DECISION REQUIRED | SLA, support, formation comme éléments de forfait | Toute liste de fonctions par forfait |
| CD-07 | COMMERCIAL DECISION REQUIRED | Modules vendus séparément ; Sentinelle Population sur soumission | Toute présentation modulaire |
| CD-08 | COMMERCIAL DECISION REQUIRED | Validité du programme de recommandation | Parrainage |
| LR-01 | LEGAL / PRIVACY REVIEW | Divulgation des sous-traitants et des flux hors Canada (Cloudflare, Brevo, Anthropic, Formspree, Mapbox) et évaluation des facteurs relatifs à la vie privée | Sécurité, confidentialité |
| LR-02 | LEGAL / PRIVACY REVIEW | « conformément aux lois applicables » (P §15) ; échelle « conforme / tient compte » | `/privacy`, `/security` |
| LR-03 | LEGAL / PRIVACY REVIEW | Processus et registre des incidents de confidentialité ; conservation et suppression ; témoins | `/privacy` |
| LR-04 | LEGAL / PRIVACY REVIEW | Identité de l'exploitant et droit d'auteur (D-05) | Pied de page, JSON-LD |
| SR-01 | SECURITY REVIEW | MFA : code non cryptographique et stocké en clair (SEC-01) | Toute promotion de la double authentification |
| SR-02 | SECURITY REVIEW | SEC-02 à SEC-08 (corps de requête, en-têtes du site et du portail, ports, objets de stockage, analyse des dépendances, sauvegardes hors serveur) | Affirmations correspondantes |
| SR-03 | SECURITY REVIEW | Preuve de la région du VPS et du bucket ; SOC 2 du fournisseur : portée | « Toronto », « SOC 2 du fournisseur » |
| CR-01 | CONTENT REVIEW | « Sécurité vérifiable » et liste de documents promis (questionnaire, architecture, etc.) qui n'existent pas | `/security` |
| CR-02 | CONTENT REVIEW | Titre et description des deux pages : marque répétée ; territoires §6 et §17 | MIG-04A et MIG-04B |
| CR-03 | CONTENT REVIEW | `/pricing` sans `<main>` ni `<header>` ; `html lang` | MIG-04B |
| AH-01 | ASSET HOLD | `pricing-coro-modular-platform.webp` : modules FUTURE et « Exercices » à l'écran | Utilisation sur `/pricing` |
| AH-02 | ASSET HOLD | `security-canadian-hosting.webp` : Colline du Parlement (Ottawa) et impression d'un centre de données propre à CORO : décision humaine | Utilisation sur `/security` |
| AH-03 | ASSET HOLD | Anciennes versions dans Git à `e70132bf` (affirmations non publiables) : ne jamais restaurer | — |
| AH-04 | ASSET HOLD | `blog-coro-insights.webp` : maquette avec faux titres d'articles (hors périmètre de ce gate) | MIG-06 |
| GO-01 | Hérité | Blockers de provenance des captures (MIG-02, MIG-03) : inchangés | Mise en ligne |

## 21. Recommendations for MIG-04A (`/security`)

> Mise à jour MIG-04-PRE-B : APPROUVÉ À PROCÉDER. Le point 2 ci-dessous est supplanté par D9 (ne pas présenter la MFA) et par D8 (SOC 2 non central) ; les points 3 et 8 tiennent compte de D10 (sauvegardes retirées) et D11.

**Disponibilité : PRÊT SOUS CONDITIONS.** Migrer en préservant le contenu publié, mais en n'affichant que les affirmations classées « Oui » au §2 :

1. Ouvrir par un énoncé sobre : infrastructure principale à Toronto (DigitalOcean) ; retirer « maintenir leurs données au Canada » en faveur d'une phrase honnête sur les tiers (LR-01).
2. Conserver : HTTPS/TLS, mots de passe hachés, rôles et permissions, journalisation, limitation du débit, double authentification par code courriel (avec libellé factuel, après SEC-01).
3. Réécrire ou retirer : cloisonnement (« données cloisonnées par organisation »), rétention des sauvegardes, snapshots, pare-feu, en-têtes de sécurité, SLA (nommer le service et la source), promesses de documents.
4. Cadre juridique : « tient compte de » seulement ; aucune revendication de conformité, de certification ni de « SOC 2 de CORO ».
5. Image : décision humaine sur le plan large ou le recadrage (§5.1) ; `alt=""`, jamais comme preuve.
6. Aucune section « certifications » ; aucun tableau de bord d'état de service ; aucune promesse de surveillance 24/7.
7. Décision sur le `SoftwareApplication` du JSON-LD ; titre sans marque (§6).
8. Avant la publication : preuves du propriétaire (console pour la région, script de sauvegarde, pare-feu) et avis juridique sur LR-01 à LR-03.

## 22. Recommendations for MIG-04B (`/pricing`)

> Mise à jour MIG-04-PRE-B : APPROUVÉ À PROCÉDER avec le MODÈLE A. Les points 2 et 8 sont supplantés : la promesse « 24 heures » et la section fondateur sont RETIRÉES (D3, D4) ; aucune décision de modèle n'est requise (D1).

**Disponibilité : PRÊT POUR UNE MIGRATION DE PRÉSERVATION du modèle A (déjà publié) ; BLOQUÉ pour tout nouveau modèle de tarification.**

1. Migrer le contenu publié actuel sans introduire de prix, de forfaits, d'essai ni de durée (aucun d'eux n'est décidé).
2. Ne pas migrer automatiquement : « Réponse sous 24 heures » (CD-05) et la section fondateur (CD-04) restent en état REVIEW ; décision humaine avant publication de la version V2 ; conserver la cible `#fondateur` (lien depuis l'accueil).
3. Décrire les capacités (Documents, Projets, Performance, Client, Résilience et Intervention, Sentinelle Population sur soumission) comme des capacités, sans lien avec un forfait ; aucune mention de Knowledge, Network, Campus, Ops, ni d'un produit « AI ».
4. Corriger la structure sémantique (un seul `<main>`, un `<header>`) et conserver le JSON-LD (`WebPage`, `BreadcrumbList`, `FAQPage`) ; aligner la FAQ « Où sont hébergées nos données ? » sur la formulation de `/security`.
5. Image : ne pas utiliser `pricing-coro-modular-platform.webp` tel quel (AH-01) ; recadrage ou remplacement selon le §13.2.
6. Ne pas afficher le crédit de recommandation ; lien discret seulement (§15).
7. Ressources : évaluer les cinq articles candidats du §17 selon la règle de découverte.
8. Si un modèle B ou C est souhaité : gate commercial préalable (CD-01, CD-03, CD-06, CD-07) avant toute conception.

## Sources publiques consultées

- DigitalOcean : SOC 2 Type II et SOC 3 (communiqué et page de confiance) ; SLA Droplet 99,99 % ; SLA Spaces 99,9 % ; Spaces disponible à Toronto (TOR1).
- Commission d'accès à l'information du Québec, principaux changements de la Loi 25 ; Gouvernement du Québec, évaluation des facteurs relatifs à la vie privée.
- Commissariat à la protection de la vie privée du Canada, lignes directrices sur le traitement transfrontalier de renseignements personnels.
- Analyses tierces sur la Loi 25, l'hébergement et la résidence des données (contexte, non normatives).
- Pages de fournisseurs de mesures d'urgence et de continuité (contexte de terminologie et de modèles de tarification).

Ces sources fournissent du contexte ; elles ne sont pas un avis juridique.

---

# MIG-04A — `/security` register

Migration de `/security` vers V2 (2026-09-26). Autorité : les sections 2 à 22 et les décisions D1 à D14 ci-dessus. Aucun élément de Tarification n'est résolu ici. Commit de départ `d56d0ade`.

## A1. Audit du héros de remplacement (fichier actuel, ouvert depuis le dépôt)

`public/website-v2/security/security-canadian-hosting.webp`, 1672 × 941, remplacement fourni par l'humain. Constats propres à CETTE version (aucun n'est repris de l'ancienne) :

| Élément visible | Constat |
|---|---|
| Texte incrusté | Aucun texte lisible |
| Logos | Aucun logo, aucune marque, aucun sceau, aucune norme |
| Indices géographiques | Colline du Parlement (Ottawa) avec le drapeau du Canada, à gauche ; feuille d'érable sur un pilier, au centre ; carte du Canada sur un écran |
| Centre de données | Allée de baies de serveurs à droite : illustration générique ; la formulation de la page nomme le fournisseur d'infrastructure, ce qui évite de laisser croire que CORO exploite son propre centre de données |
| Personnes | Une femme de dos devant deux écrans (carte, schéma de réseau), à gauche : suggère une équipe d'exploitation |
| Écrans | Carte et schéma illustratifs, sans libellé |
| Revendications de sécurité | Aucune |
| Implique que CORO possède ou exploite un centre de données physique | Oui, en partie, dans le cadrage large (baies de serveurs et poste de travail dans le même espace) |

**Classement : MARKETING ILLUSTRATION, utilisable avec un cadrage.** Le cadrage du héros (`position: 100% 50%`, format carré sur mobile) ne montre que l'allée de serveurs et la feuille d'érable : la Colline du Parlement, la personne devant les écrans et les cartes sont hors cadre sur ordinateur et sur mobile (vérifié visuellement à 390 et à 1440). Cela supprime l'impression d'un lien avec le gouvernement fédéral, d'une localisation à Ottawa et d'une équipe de surveillance. Le fichier n'est pas modifié ; le recadrage est fait par la propriété CSS de positionnement de l'image. `alt=""`, jamais une preuve. Ce n'est pas UNSAFE / MISLEADING dans ce cadrage ; le plan large ne serait pas retenu comme héros. Aucun logo CORO n'apparaît.

## A2. Matrice de préservation du contenu V1

Base : `tests/fixtures/security-baseline.json`. Aucune perte silencieuse : chaque bloc est classé, et chaque REWRITE ou REMOVE porte sa raison.

| Bloc V1 | Classe | Résultat V2 et raison |
|---|---|---|
| H1 « La sécurité fait partie de l'architecture. » | PRESERVE | Identique (deux lignes) |
| Introduction : « ... maintenir leurs données au Canada. Notre approche combine hébergement canadien, chiffrement des communications, contrôle d'accès, sauvegardes et surveillance. » | REWRITE | « maintenir leurs données au Canada » contredit la règle « pas toutes les données » (D6, §3.2) ; la liste de sauvegardes et de surveillance est ramenée à des formulations sourcées |
| Boutons « Parler à notre équipe » et « Voir les fonctionnalités » | REWRITE / REMOVE | Démonstration et question de sécurité (courriel). `/#features` est une ancre legacy sans cible connue (R-08) |
| Bandeau « Hébergement canadien. Accès contrôlés. Communications chiffrées. Sauvegardes automatisées. » | REWRITE | « Infrastructure principale au Canada · Accès contrôlés · Communications chiffrées » ; « Sauvegardes automatisées » retiré du bandeau (D10) |
| Quatre cartes « Une approche conçue pour les environnements professionnels » | RECOMPOSE | Réparties dans les sections 01 à 04 (aucun groupe de cartes : lignes éditoriales) |
| Carte « Données hébergées au Canada » (Toronto, « souveraineté des données ») | REWRITE | Infrastructure principale à Toronto ; « souveraineté » retiré (D6, D7) |
| Carte « Communications chiffrées » (HTTPS/TLS, mots de passe hachés) | PRESERVE | Section 03, mots inchangés pour ces deux énoncés |
| Carte « Contrôle d'accès » (« Les environnements clients sont isolés ») | REWRITE | « Séparées logiquement, au niveau de l'application » (PARTIAL, §2 ligne 12) |
| Carte « Surveillance et traçabilité » (« détection d'événements inhabituels ») | REWRITE | Journalisation conservée ; « détection » retirée (non établie) ; disponibilité en termes généraux |
| Section « Hébergement et souveraineté » : paragraphe d'infrastructure et « réduire les enjeux de transfert transfrontalier » | REWRITE | La formulation transfrontalière est retirée (des tiers traitent des données hors du Canada) ; remplacée par le « Ce que cela signifie, et ce que cela ne signifie pas » |
| « Les caractéristiques de l'infrastructure peuvent évoluer... détails techniques fournis aux équipes TI » | PRESERVE | Section 01, sans promesse de documents |
| Faits : Infrastructure Toronto ; Fournisseur DigitalOcean | PRESERVE | Liste de faits de la section 01 |
| Fait : « Cadre fournisseur SOC 2 Type II » | REMOVE | D8 : ne pas en faire un argument central ni risquer l'attribution à CORO |
| Section « Accès et authentification » : rôles et permissions ; journalisation | PRESERVE | Section 02 |
| « Isolation des organisations clientes » | REWRITE | Voir ci-dessus |
| « Protection contre les tentatives d'authentification abusives » | REWRITE | « Le nombre de tentatives de connexion répétées est limité » (limitation du débit : §2 ligne 9) |
| « MFA prévu pour les environnements et offres nécessitant un niveau de sécurité renforcé » | REMOVE | D9 : la MFA n'est pas un argument de vente ; la mention d'« offres » n'existe pas dans le produit |
| Section « Sauvegarde et continuité » : introduction générale | PRESERVE / REWRITE | Reprise du libellé général des conditions d'utilisation (§12) ; « mécanismes de sauvegarde et de continuité adaptés à son infrastructure » |
| « Sauvegardes automatisées, toutes les 6 heures » | REMOVE | Non publiable sans confirmation du cron (D10, §2 ligne 13) |
| « Rétention 30 jours » | REMOVE | Contradiction avec la documentation (30 dernières copies ≈ 7,5 jours) : D10 |
| « Snapshots quotidiens » | REMOVE | Aucune source : D10 |
| « SLA infrastructure 99,9 % » | REMOVE | Chiffre du fournisseur ambigu (Droplet 99,99 %, Spaces 99,9 %) et hors engagement de CORO ; aucun chiffre de disponibilité (§2 ligne 25) |
| « Pare-feu réseau » | REMOVE | Non vérifié (§2 ligne 43) |
| « En-têtes HTTP de sécurité » | REMOVE | Observés sur l'API et l'application, non sur le site ni le portail client (§2 ligne 42) |
| « Protection de l'authentification » (bloc 4 de « Réduire la surface d'exposition ») | REWRITE | Intégré aux lignes de la section 02 et à « Limites de débit » |
| « Surveillance de disponibilité » | REWRITE | « La disponibilité des principaux services est surveillée » (documentation du propriétaire), sans 24/7 |
| Section « Vie privée et conformité » : « traite les renseignements personnels dans le cadre de la législation applicable et maintient des pratiques de protection, de conservation et de gestion des incidents » | REWRITE | Les pratiques de conservation et d'incidents ne sont pas établies (LR-03) |
| Étiquettes « Québec — Loi 25 », « LPRPDE / PIPEDA », « Hébergement Canada » | REWRITE | Une phrase prudente sans étiquettes ni vignettes de conformité (D7) |
| Liens « Politique de confidentialité » et « Conditions d'utilisation » | PRESERVE | Section 06 (et section 04 pour les conditions) |
| Section « Pour les équipes TI » et liste de six sujets (architecture, identités, sauvegardes, protection réseau, journalisation, questionnaire fournisseur) | REWRITE / REMOVE | La demande par courriel est conservée ; la liste de documents est retirée : aucun de ces documents n'est établi (CR-01) |
| CTA « La sécurité doit être vérifiable, pas seulement déclarée » | REWRITE | « La sécurité se juge sur des faits » : la formulation d'origine laissait attendre des preuves (questionnaire, documentation) qui n'existent pas |
| Boutons « Demander une démo » et « Nous contacter » | PRESERVE / REWRITE | Démonstration inchangée ; courriel avec un objet reformulé (« Question de sécurité CORO ») |
| Titre et description (marque répétée, « surveillance », « sauvegardes ») | REWRITE | §6 : sans marque, sans revendication non établie |
| JSON-LD `WebPage` avec `about: SoftwareApplication` | REMOVE | Remplacé par `FAQPage` (la FAQ est visible) ; pas de `SoftwareApplication` (règle V2) |
| En-tête, pied de page et chrome legacy | REMOVE | Remplacés par le shell V2 |
| Aucune FAQ visible en V1 | AJOUT | FAQ de six questions dont les réponses reprennent uniquement des énoncés établis |
| Aucune image en V1 | AJOUT | Héros de remplacement fourni par l'humain |
| Version anglaise complète (17 titres) | PRESERVE (structure) | Réécrite en anglais avec la même structure et les mêmes limites |

## A3. Énoncés publiés (V2)

Infrastructure applicative principale hébergée au Canada, région de Toronto, DigitalOcean (application, base de données, stockage de fichiers) ; services de soutien par des fournisseurs spécialisés qui peuvent traiter certaines données hors du Canada ; comptes individuels, rôles et permissions, cloisonnement logique des organisations, tentatives de connexion et requêtes limitées, journal des actions ; HTTPS/TLS, mots de passe hachés ; mécanismes de sauvegarde et de continuité en termes généraux, disponibilité des principaux services surveillée, aucune promesse de disponibilité sans interruption ; modèle de responsabilité partagée (CORO / fournisseurs / organisation), dérivé des conditions d'utilisation ; phrase prudente sur la Loi 25 et la LPRPDE, aucune certification, aucune attestation attribuée à CORO ; FAQ de six questions.

Énoncés non publiés : tout ce qui figure dans les décisions D6 à D11 et dans la liste « NOT published » de l'en-tête du fichier `app/security/page.tsx`. Aucun fournisseur tiers n'est nommé (pas de liste).

## A4. Décisions de la migration

| Sujet | Décision |
|---|---|
| Langue | VRAIE version FR / EN (structure de 17 titres identique en V1, contenu anglais complet). Les deux langues sont conservées ; aucun `englishAvailable={false}` |
| Métadonnées | FR : « Sécurité et hébergement des données au Canada » ; EN : « Security and data hosting in Canada » (sans marque, sans mot de certification ni de conformité) ; descriptions basées sur l'infrastructure principale, les accès, la protection des données et la responsabilité de l'organisation ; canonical et hreflang FR / EN inchangés |
| JSON-LD | `FAQPage` seulement, identique à la FAQ visible ; `WebPage` et `SoftwareApplication` retirés |
| Ressources éditoriales | Aucune section : découverte faite sur les 56 articles publiés ; aucun article fort sur la sécurité SaaS, l'hébergement canadien ou la Loi 25 (`registre-visiteurs-protection-renseignements-personnels` traite de la minimisation des données dans un registre de visiteurs, sans lien direct avec la sécurité de la plateforme : NE PAS LIER ; `controle-acces-vs-registre-occupation-difference` porte sur le contrôle d'accès physique : NE PAS LIER). Lacune éditoriale : sécurité d'un logiciel infonuagique, hébergement canadien, gouvernance des accès |
| Liens | `/privacy`, `/terms`, `/#demo`, courriel ; aucun lien FUTURE ni REVIEW ; aucun lien vers `/pricing` |
| Sitemap | Inchangé (39 entrées : `/security` et `/security?lang=en` étaient déjà listées) |
| Registre V2 | `/security` ajoutée après la QA ; `/pricing` non ajoutée |

## A5. Éléments à traiter avant la mise en ligne (non résolus ici)

| Classe | Élément |
|---|---|
| GO-LIVE — LEGAL / PRIVACY REVIEW | Divulgation des sous-traitants (Cloudflare, Brevo, Anthropic, Formspree, Mapbox) et évaluation des facteurs relatifs à la vie privée (LR-01) ; formulation finale de la Loi 25 et de la LPRPDE (LR-02) ; processus d'incidents de confidentialité, conservation et suppression (LR-03) ; identité de l'exploitant (LR-04) |
| GO-LIVE — EVIDENCE | Preuve de la région de Toronto (console du fournisseur pour le serveur et le stockage) : « région de Toronto » est un énoncé déjà public, appuyé par le code de stockage et la documentation du propriétaire, non observé de l'extérieur |
| GO-LIVE — EVIDENCE | Surveillance de disponibilité des « principaux services » : appuyée par la documentation du propriétaire (surveillance externe de l'application et de l'API) ; à confirmer |
| SECURITY-HARDENING — MFA | Dette technique enregistrée (D9). La MFA n'est mentionnée nulle part sur la page |
| SECURITY REVIEW | Pare-feu (SEC-05), en-têtes du site et du portail (SEC-04), objets de stockage (SEC-06), sauvegardes hors serveur (SEC-08) : sans affirmation publique tant que non vérifiés |
| CONTENT REVIEW | Décision humaine sur l'image : le cadrage retient l'allée de serveurs ; un plan large ne serait pas retenu comme héros (A1) |
| ACCESSIBILITY | Aucun test avec lecteur d'écran ; zoom 200 % et 400 % non vérifié ; `<html lang>` global reste « fr » |
| ÉLÉMENT TRANSVERSAL | Promesse « 24 heures », section fondateur et parrainage : non traités ici (Tarification) |

---

# MIG-04B — `/pricing` register

Migration de `/pricing` vers V2 (2026-09-26), MODÈLE A (D1 à D14 ci-dessus). Commit de départ `795aac01`. Aucune décision de Sécurité, de parrainage, d'accueil ni de `DemoForm` n'est modifiée ici.

## B1. Audit de l'image de remplacement (fichier actuel)

Premier fichier `pricing-coro-modular-platform.webp` : **UNSAFE / MISLEADING** (tuiles Knowledge, Ops, AI, Network, menu Exercices et Conformité : modules futurs ou non-modules présentés comme disponibles). Migration suspendue (BLOCKED) jusqu'au remplacement. Fichier retiré du dépôt par l'humain ; jamais restauré.

Première version du fichier `pricing-coro-modular-platform-v2.webp` (1672 × 941), remplacée depuis (voir B1b). Audité de zéro à ce moment :

| Vérification | Constat |
|---|---|
| Prix, montants, devises | Aucun |
| Rabais, pourcentages | Aucun |
| Noms de forfaits ou de paliers | Aucun |
| Promesse d'essai | Aucune |
| Modules CORO nommés | Aucun (aucun libellé lisible) |
| Capacités futures | Aucune |
| Conformité, certification | Aucune |
| Logo CORO ou marque | Aucun logo ; seule une inscription minuscule illisible sur le cadre de l'écran (marque du fabricant) |
| Texte incrusté | Aucun texte lisible |
| Personnes | Un homme de dos et une femme qui désigne l'écran, dans un bureau |
| Écran | Représentation abstraite : bâtiments isométriques reliés par des zones ; panneau latéral avec des icônes et des barres sans libellé. Ne montre aucune interface CORO reconnaissable |
| Contexte | Horizon de Montréal (pont Jacques-Cartier, Mont-Royal), lumière de fin de journée |
| Pourrait être pris pour une preuve produit | Non : aucun libellé, aucun contrôle, aucune donnée ; l'écran est une figure conceptuelle organisation → sites et bâtiments → portée |

**Classement : MARKETING ILLUSTRATION, sûre.** `alt=""`, aucune légende, aucune cartouche, jamais décrite comme une capture ; aucune fonctionnalité n'est déduite de son contenu. Le fichier n'est ni recadré ni modifié ; le cadrage du héros est un positionnement CSS.

## B1b. Mise à jour de l'image de tarification (fichier remplacé une seconde fois)

L'humain a remplacé `public/website-v2/pricing/pricing-coro-modular-platform-v2.webp` (90 604 octets, 1672 × 941) après le premier audit : **le tableau B1 ci-dessus décrit la version précédente (écran de bâtiments isométriques) et ne s'applique plus.** Audit de zéro de la version actuelle :

| Vérification | Constat |
|---|---|
| Prix, rabais, forfaits, essai | Aucun |
| Modules nommés, capacités futures | Aucun module nommé. La diapositive liste des thèmes génériques (BÂTIMENTS, PERSONNES, PLANS, DONNÉES, INTERVENTION, CONTINUITÉ) : ce sont des thèmes, pas des modules ni des capacités vendues |
| Texte incrusté | Diapositive « DES ORGANISATIONS PLUS RÉSILIENTES AUJOURD'HUI » ; inscription murale « RÉSILIENCE · CONFORMITÉ · ACTION » ; livre « Résilience · Conformité · Action » |
| Conformité, certification | Le mot « Conformité » apparaît deux fois comme valeur de marque (mur et livre) ; aucune revendication ni norme |
| **Marque CORO** | **Deux tasses portent « CORO » en lettres blanches sans le O rouge du logo officiel : c'est un rendu généré par IA du nom de marque, pas le logo officiel.** Visibles en bas du héros, tasse à droite lisible à 1440 |
| Écran / interface | Diapositive de présentation (photos de bâtiments et d'une installation industrielle sur une carte du Canada) ; aucune interface CORO, aucun contrôle, aucune donnée : ne peut pas passer pour une preuve produit |
| Contexte | Horizon de Montréal ; un homme (en retrait) et une femme qui désigne la diapositive |

**Classement : MARKETING ILLUSTRATION** (`alt=""`, sans légende), **avec un point de gouvernance en attente d'une décision humaine** : la règle de la décision D13 est « logo CORO officiel seulement, ou aucun logo ». Les tasses affichent le nom de marque sans être le logo officiel. Aucun cadrage CSS ne peut les retirer (elles sont au bas du champ visible sur ordinateur comme sur mobile). Le fichier n'est ni recadré ni modifié. Décision à prendre : accepter les tasses comme accessoire, ou remplacer l'image par une version sans texte de marque. Le mot « Conformité » (mur et livre) est du décor de marque, sans effet sur les textes de la page ; à confirmer par l'humain.

Cadrage du héros ajusté pour la nouvelle image : position `80% 50%` (ordinateur et mobile), pour montrer la personne qui désigne la diapositive. Aucun changement de texte, de métadonnées ni de structure.

Note d'environnement : le cache d'images de Next (`.next/cache/images`) servait encore l'ancienne version après le remplacement du fichier ; il a été vidé en local (dossier généré, hors dépôt). Un déploiement à partir d'une image de conteneur neuve n'est pas concerné.

## B2. Matrice de préservation du contenu V1

Base : `tests/fixtures/pricing-baseline.json`. Aucune perte silencieuse.

| Bloc V1 | Classe | Résultat V2 et raison |
|---|---|---|
| En-tête et chrome legacy (« ← Accueil », sélecteur de langue) | REMOVE | Remplacés par le shell V2 |
| H1 « Une tarification qui s'adapte à votre organisation. » | REWRITE | « Une offre configurée autour de votre organisation. » : le modèle A n'affiche aucune tarification ; le H1 d'origine laissait entendre un prix qui « s'adapte » |
| Introduction : sites et bâtiments, utilisateurs, capacités, accompagnement ; « nous construisons cette configuration avec vous » | RECOMPOSE | L'idée « définie avec vous » est conservée ; les quatre repères passent dans la section 02 |
| Boutons « Demander une démo » et « Voir les facteurs de configuration » | REWRITE | « Demander une offre » (ancre locale `#demo`) et « Voir comment l'offre est définie » (`#portee`) ; l'ancre `#factors` était interne (aucun lien externe) |
| « Réponse sous 24 heures » | REMOVE | D4 : promesse ferme retirée |
| « Conçu par des praticiens de la sécurité incendie et des mesures d'urgence » | REMOVE | Affirmation REVIEW (MIG-00A) non établie ; à ne pas migrer par défaut |
| « Configurations types : trois profils courants » (trois cartes avec listes et un bouton chacune) | RECOMPOSE | Section 01 : trois lignes « À titre d'exemple », sans carte ni bouton par profil |
| Listes de fonctions des profils (« Accompagnement de base », « Toutes les capacités documentaires », « Résilience et intervention complète », « Accompagnement dédié à la configuration », « Accompagnement multi-organisations ») | REMOVE | Elles se lisent comme des contenus de forfaits (emballage commercial non établi, §18 de la tâche) ; remplacées par des situations |
| Badge « Configuration la plus courante » | REMOVE | Affirmation non appuyée |
| « Aucun de ces profils n'est un forfait fixe » | PRESERVE | Note de la section 01 |
| « Quatre facteurs déterminent votre configuration CORO... La tarification CORO est établie à partir de ces quatre dimensions » | REWRITE | Section 02 : quatre repères qui « aident à définir la portée » ; la phrase de tarification et la formule « détermine le prix » sont retirées (règle du modèle A, §8 de la tâche) |
| Facteurs Sites et bâtiments, Utilisateurs, Capacités CORO, Accompagnement | PRESERVE | Contenu conservé, verbes ajustés (« aident à définir », « aident à prévoir ») |
| Ajout | AJOUT | Phrase explicite : ces repères ne sont pas des règles de facturation (distinction « ce qu'il faut comprendre » / « variable de facturation ») |
| « Les cinq dimensions CORO » (cinq capacités) | RECOMPOSE | Section 03, cinq lignes avec un lien vers la page produit ; phrase de frontière capacité / offre |
| Texte Documents : « PMU, PSI et PCA disponibles dès maintenant ... PGC, PRA et PUE sont prévus en phase 2 » | REWRITE | La phrase de phase 2 est retirée (capacités futures absentes d'une page commerciale, §11 du gate) ; « génération automatisée » devient « génération » ; « conformité » retiré |
| Texte Performance : « objectifs, indicateurs et niveaux de performance » | REWRITE | Aligné sur la page Performance (heures, capacité d'équipe, avancement) : « objectifs » et « indicateurs » étaient signalés REVIEW (MIG-02) |
| Texte Résilience et intervention : « présence en temps réel », « information destinée aux secours », « exercices » | REWRITE | « registre de présence », « gestion d'incidents et retour d'expérience » ; « temps réel » et « exercices » retirés (formulations non alignées sur les pages V2) |
| Section « Programme fondateur » (ruban, sceau, quatre avantages, bouton, « places limitées ») | REMOVE | D3 ; ancre `#fondateur` supprimée |
| « Deux perspectives » (professionnels, organisations) avec leurs listes | RECOMPOSE | Contenu absorbé par les exemples de la section 01 ; les listes de puces sont retirées (doublon et allure de forfait) |
| « Déploiement : de l'évaluation à l'accompagnement continu » (quatre étapes) | PRESERVE / REWRITE | Section 04 : mêmes quatre étapes ; « Une offre adaptée vous est ensuite proposée » ajouté à l'évaluation ; « continu » et « niveau convenu » ramenés à « selon ce qui est convenu » (aucun niveau de service) |
| FAQ : évolution de la configuration ; plusieurs sites ; firmes ; formation et accompagnement | PRESERVE | Quatre questions inchangées quant au fond |
| FAQ : « Pourquoi les prix ne sont-ils pas affichés directement? » | REWRITE | La réponse ne dit plus que « la tarification dépend de... » : la définition de l'offre se fait selon la situation |
| FAQ : « Où sont hébergées nos données? » (« hébergées au Canada, sur DigitalOcean à Toronto ») | REWRITE | Aligné sur la page Sécurité (infrastructure applicative principale, région de Toronto, services de soutien) ; fournisseur non nommé ici |
| Ajout FAQ | AJOUT | « Existe-t-il une période d'essai? » (démonstration et discussion d'abord, D2) et « Comment demander une offre? » (D4) |
| Section « Parlons de votre environnement » avec `DemoForm` | PRESERVE | Formulaire partagé inchangé, ancre `#demo` conservée ; texte réécrit sans promesse de délai |
| Titre et description | REWRITE | Sans marque ; sans prix, essai ni rabais ; territoire « tarification » sans laisser croire à des prix publics |
| JSON-LD `WebPage` + `BreadcrumbList` + `FAQPage` | REWRITE | `FAQPage` seulement, identique à la FAQ visible ; `WebPage` et `BreadcrumbList` retirés pour s'aligner sur les autres pages V2 (REVIEW SEO : perte du fil d'Ariane structuré) |
| Aucun prix, aucun forfait publié en V1 | PRESERVE | Le modèle A est le modèle publié de la V1 |
| Version anglaise complète | PRESERVE (structure) | Réécrite en anglais avec les mêmes limites |

## B3. Dimensions commerciales publiées

Quatre repères qui « aident à définir la portée » : sites et bâtiments (avec leur complexité), utilisateurs, capacités CORO, accompagnement. Ils ne sont **pas** présentés comme des règles de facturation. Capacités présentées (descriptions de ce que CORO permet, jamais des modules vendus séparément) : production documentaire, gestion de projets et de mandats, performance, portail client, résilience opérationnelle ; un contexte spécialisé (alerte à la population) renvoie à une discussion de cadrage distincte, sans variable ni formule. Déploiement : évaluation, configuration, déploiement, accompagnement « selon ce qui est convenu ».

## B4. Décisions commerciales futures non exposées

Aucun prix, « à partir de », rabais, palier ou nom de forfait ; aucun essai standardisé ni ses limites ; aucun programme fondateur ; aucun crédit de recommandation ; aucun délai de réponse ferme ; aucun SLA, niveau de support, heures incluses ou formule de facturation ; aucun module vendu séparément ; aucun module futur (Knowledge, Network, Campus, Ops, IA comme produit) ; aucun type de document de phase 2 ; aucune structure d'emballage à déduire de l'architecture du produit.

## B5. Ressources, métadonnées, langue, liens

| Sujet | Décision |
|---|---|
| Ressources | Section « Pour situer votre besoin » : `combien-coute-plan-mesures-urgence-pmu`, `plan-mesures-urgence-word-excel-logiciel`, `gerer-plans-urgence-plusieurs-batiments` (publiés, FR et EN, HTTP 200 le 2026-09-26, aucun ne parle d'un prix ni d'un essai de CORO). Écartés : `logiciel-plan-mesures-urgence-pmu`, `logiciel-plan-securite-incendie-psi`, `logiciel-plan-continuite-activites-pca` (articles de choix de produit qui recouvrent la page Documents) |
| Titres | FR : « Tarification : une offre configurée selon votre organisation » ; EN : « Pricing: an offer configured around your organization » |
| Langue | Vraie version FR / EN ; aucun `englishAvailable={false}` |
| Liens | Cinq pages produit, `/sentinelle-population` (page FR seulement : en anglais le lien mène à une page française, dette déjà connue de MIG-03A), trois articles, ancres locales ; aucun lien vers Sécurité, Parrainage ou une route FUTURE |
| CTA | Ancre locale `#demo` vers le formulaire de la page (le même que celui de la demande de démonstration, dit explicitement) ; aucun système de soumission nouveau |

## B6. Dettes transversales enregistrées (non traitées ici)

| Dette | Où | Étape |
|---|---|---|
| Promesse « dans les 24 heures » (message de succès) | `DemoForm.tsx` (accueil, `/contact`, `/pricing`) ; elle s'affiche encore sur `/pricing` après l'envoi du formulaire | Instruction distincte sur `DemoForm` |
| « Nous répondons habituellement dans les 24 heures » | Accueil | MIG-09 |
| Bandeau « Programme fondateur » et lien `/pricing#fondateur` | Accueil : le lien mène maintenant à `/pricing` sans ancre (la section n'existe plus) | MIG-09 |
| Plans « Essai gratuit / Standard / Entreprise » (code mort non rendu) | `HomePageClient.tsx` | MIG-09 |
| Confirmation « Loi 25 » de l'accueil (code mort non rendu) | `HomePageClient.tsx` | MIG-09 |
| Éléments juridiques et de vie privée (`DemoForm` envoie à un service tiers) | Politique de confidentialité | LR-01 |

## B7. Décisions commerciales restantes

Aucune décision n'est requise pour publier cette page. Restent ouvertes, sans effet sur elle : validité commerciale du programme de recommandation (CD-08) ; toute future publication de prix, forfaits, essai, SLA ou modules vendus séparément (nouvelle décision et nouveau gate).

## B8. MIG-04B-B — passe visuelle commerciale et décision sur le parrainage

Date : 2026-09-26. La gouvernance commerciale du modèle A est inchangée, à une exception explicite (ci-dessous). Héros et image inchangés.

### Décision humaine qui remplace D5

| Avant (D5, B4, tests) | Maintenant |
|---|---|
| Le crédit de 250 $ n'est pas promu sur `/pricing` ; aucun lien vers le parrainage | **Un encart contextuel de parrainage est autorisé sur `/pricing`**, avec un lien vers `/programme-recommandation`. Le parrainage reste un programme commercial distinct : le crédit n'est présenté ni comme un rabais de tarification, ni comme un rabais d'abonnement, ni comme une économie cumulable, ni comme un élément du modèle de tarification |

Source d'autorité vérifiée le jour même : la page de parrainage publie « 250 $ » en français et « $250 » en anglais (« Lorsqu'une organisation devient un client admissible, votre organisation peut recevoir un crédit CORO de 250 $ »). Aucun écart : le montant est donc mentionné, une seule fois par langue, avec la formule « selon les conditions du programme » et la phrase « Ce programme est distinct de l'offre décrite sur cette page ». Les conditions complètes ne sont pas dupliquées. Le test compare la mention au texte de la page de parrainage. Si la page de parrainage change son montant, la mention devra être retirée ou alignée.

### Décision inchangée

Programme fondateur : RETIRÉ de la V2 publique. Aucune trace dans la page (test). Dette d'accueil (`#fondateur`) : MIG-09.

### Recomposition visuelle

| Élément | Traitement |
|---|---|
| Héros | Inchangé |
| Trois cartes de situation (section 01) | « Un bâtiment », « Plusieurs bâtiments ou sites », « Firmes et professionnels » : numérotées, bordure de 1 px, filet d'accent, sans prix, sans « recommandé », sans badge, sans liste à coches ; trois colonnes sur ordinateur, une colonne sur mobile ; le texte source est conservé ; note « ces situations ne sont pas des forfaits » conservée |
| Quatre cartes de portée (section 02) | Sites et bâtiments, Utilisateurs, Capacités CORO, Accompagnement ; quatre colonnes sur grand écran, deux sur tablette, une sur mobile ; texte conservé ; note explicite « pas des règles de facturation » conservée |
| Composition des capacités (section 03) | L'organisation « au centre » dans un bloc de surface calme avec la phrase de frontière capacité / offre ; les cinq capacités actuelles en blocs à filets autour, avec leurs liens ; aucune tuile en carte, aucun module futur |
| Flux marine (section 04) | Inchangé |
| Énoncé du modèle A (section 05) | Bande blanche à grand espace : « Pas de prix générique pour une organisation qui ne l'est pas. », sans chiffre ni formule, suivie de ce que la discussion permet de clarifier |
| Ressources | Trois lignes, inchangées (aucune carte) |
| Encart de parrainage | Panneau autonome avant la FAQ, bouton vers le programme |
| FAQ | Contenu inchangé (huit questions) ; parité JSON-LD conservée |
| Conversion finale | « Construisons votre environnement CORO. » : contexte, bâtiments ou sites, besoins ; aucune promesse de délai ; `DemoForm` inchangé ; section blanche (une bande marine se fondait dans le pied de page marine) |

Les cartes n'apparaissent que dans deux groupes délibérés (situations, portée) et dans l'encart de parrainage. Un ajustement local : les titres des quatre cartes de portée sont d'un cran plus petits pour que « Accompagnement » reste dans la carte.

### Dettes inchangées

`DemoForm` (message de succès « 24 heures ») ; bandeau fondateur, texte de 24 heures et blocs de code mort de l'accueil : MIG-09.
