# 09 --- SEO Migration Plan

**Version:** 1.0\
**Date:** 24 septembre 2026\
**Status:** APPROVED MIGRATION PLAN --- implementation pending\
**Inputs:** `CURRENT-SITE-INVENTORY.md`, `CONTENT-MIGRATION-MATRIX.md`,
`TARGET-PAGE-ARCHITECTURE.md`.

> Website V2 doit améliorer le SEO technique sans payer la refonte par
> une perte d'URLs, de contenu, de signaux linguistiques ou de données
> structurées.

## 1. Objectif

Migrer `getcoro.io` vers Website V2 en préservant l'équité SEO existante
et en corrigeant les défauts identifiés pendant l'audit.

Ce plan gouverne : URLs, canonical, FR/EN, `lang`, SSR, sitemap, robots,
redirections, structured data, métadonnées sociales, liens internes,
blog, guides, images, crawl comparatif et lancement.

## 2. Règle fondamentale

Les URLs publiques existantes sont stables par défaut. Une refonte
visuelle, un changement de nom produit ou une architecture cible plus
élégante ne justifient pas un changement d'URL.

Aucune route n'est redirigée, fusionnée ou archivée sans décision
explicite du Content Migration Matrix.

## 3. Stratégie URL de lancement

### Français

Conserver : `https://getcoro.io/<path>`

### Anglais

Conserver pour Website V2 : `https://getcoro.io/<path>?lang=en`

Ce choix réduit le risque de migration. Une éventuelle architecture
`/en/...` sera un chantier SEO distinct après stabilisation de Website
V2.

## 4. Routes protégées

Conserver les URLs actuelles de `/`, About, Security, Privacy, Terms,
Pricing, Sentinelle, Sentinelle Population, les quatre pages produit,
Résilience, Referral, Contact, Partners, Blog/articles et les six guides
`/documents/...`.

Aucune redirection de lancement n'est requise simplement pour aligner
les slugs sur les nouveaux noms marketing.

## 5. Canonical

Pages bilingues : - FR canonical → URL propre sans `?lang=en`. - EN
canonical → même route avec `?lang=en`.

La génération canonical doit être centralisée via le helper SEO validé
ou son successeur.

## 6. Hreflang

Pour une page réellement bilingue : - `fr-CA` → URL FR; - `en-CA` → URL
EN `?lang=en`; - `x-default` → URL FR.

Ne jamais émettre `en-CA` si le contenu anglais réel n'existe pas.

### Sentinelle

Le contenu EN existe mais registre/sitemap/metadata le traitent FR-only.
Après décision produit, aligner registre, metadata, sitemap et hreflang.

### Sentinelle Population

Le site annonce EN alors que le contenu reste FR. Soit implémenter un
vrai EN approuvé, soit retirer les signaux EN jusqu'à disponibilité.

## 7. Langue du document

Corriger `<html lang="fr">` fixe : - FR → `lang="fr"` - EN → `lang="en"`

La langue doit être correcte dans le HTML serveur, pas corrigée
uniquement après hydration.

## 8. SSR de la homepage

Le `?lang=en` actuel produit d'abord du HTML FR puis bascule côté
client.

Website V2 doit produire directement le contenu anglais côté serveur,
avec H1, `lang`, canonical, hreflang et metadata sociaux corrects. Le
mécanisme referral doit rester indépendant et fonctionnel.

## 9. Architecture metadata

Chaque page indexable doit avoir : title unique, description, canonical,
alternates si applicables, robots, Open Graph, Twitter, image correcte
et structured data utile.

Préférer une génération centralisée aux implémentations dupliquées page
par page.

## 10. Structured data

Avant suppression du legacy, inventorier et valider les types existants
: `WebSite`, `Organization`, `AboutPage`, `SoftwareApplication`,
`FAQPage`, `WebPage`, `Thing` et structures Product/FAQ.

Les quatre pages produit en cours peuvent avoir cessé de rendre leur
JSON-LD legacy. Avant APPROVED : inventorier, valider,
restaurer/remplacer les schemas utiles et tester le JSON-LD.

La homepage conserve l'intention `WebSite` + `Organization` après
validation des données finales.

## 11. Blog

`/blog` et tous les `/blog/[slug]` sont protégés.

Préserver slug, canonical, titre, description, contenu FR, EN uniquement
si traduit, image, metadata et données de publication utiles.

Avant Go/No-Go, obtenir un inventaire live : tous les slugs publiés,
titres, disponibilité EN, canonical, indexabilité, image et date de
modification si disponible.

Le sitemap actuel peut perdre silencieusement les articles si l'API
échoue. Website V2 doit rendre cet échec observable et éviter qu'une
panne transitoire entraîne une disparition massive d'URLs connues.

## 12. Guides

Les six URLs `/documents/...` restent indexables et FR-only tant
qu'aucune traduction réelle n'existe.

Préserver contenu utile, citations, metadata, canonical, structured data
valide et liens internes. Les références réglementaires sont validées
séparément.

## 13. Sitemap

Le sitemap final doit inclure : - toutes les routes statiques
indexables; - alternates FR/EN seulement lorsque réels; - tous les
articles publiés; - guides; - formes canonical correctes; -
`lastModified` fiable lorsque disponible.

Les routes futures non implémentées restent exclues.

Source de vérité recommandée : registre de routes typé + disponibilité
locale + inventaire blog dynamique + registre explicite des guides.
Éviter les listes massives dupliquées.

## 14. Robots

Conserver l'intention actuelle : site public crawlable, sitemap déclaré.

Avant lancement vérifier : aucun `noindex` global accidentel, staging
non indexable, routes futures non exposées et domaines applicatifs
authentifiés hors périmètre marketing.

## 15. Redirections

Le lancement devrait nécessiter peu de redirections puisque les slugs
actuels sont conservés.

Toute redirection doit documenter source, destination, raison, statut,
langue, mise à jour des liens internes et test. Pas de chaînes ni
boucles.

## 16. Ancres historiques homepage

Mapper : `#continuum`, `#indice-coro`, `#sentinelle`, `#evacuation`,
`#module-incident`, `#plateforme`, `#documents`, `#solutions`,
`#environments`, `#pricing`, `#security`, `#demo`.

Préserver les ancres utiles ou fournir une compatibilité délibérée.

`/#features` est référencé mais absent : corriger le lien consommateur
ou fournir une destination pertinente.

## 17. Liens internes

Utiliser le registre/helpers lorsque pratique. Exigences : aucun lien
cassé, aucun lien vers produit futur indisponible, langue préservée,
relations produit/solution/ressource cohérentes et destinations
authentifiées conservées.

Les changements de navigation ne doivent pas rendre les pages actuelles
orphelines.

## 18. Open Graph / Twitter

Trois sources sociales coexistent actuellement. Website V2 doit choisir
une stratégie claire avec image de marque correcte, URL absolue,
overrides prévisibles et metadata FR/EN cohérentes.

## 19. Images

Les images informatives reçoivent un alt utile; les décoratives un alt
vide approprié. Pas de keyword stuffing.

Les captures produit sont décrites selon ce qu'elles démontrent.
Dimensions/aspect ratio doivent limiter les layout shifts. Préserver le
comportement des images d'articles.

## 20. Performance et indexabilité

Le site public contient environ 48,6 Mo d'assets et une vidéo homepage
d'environ 21,2 Mo.

Optimiser sans perdre le sens : fallback/poster, LCP maîtrisé, contenu
textuel principal indexable sans attendre JavaScript.

Le copy critique, H1, metadata et contenu de langue doivent être
présents dans le HTML serveur lorsque possible.

## 21. Paramètres de requête

Paramètres connus : - `?lang=en` - `?ref=...` - catégorie blog

`?ref=` est un paramètre métier, pas une page SEO distincte : canonical
homepage propre, pas de duplication indexable, attribution cookies
conservée.

Ne jamais supprimer globalement les query params sans comprendre leur
fonction.

## 22. Pages légales, Security et Pricing

`/privacy` et `/terms` gardent leurs URLs; précision légale avant SEO.

`/security` garde son URL; valider hébergement, contrôles, fournisseurs,
SLA, MFA et claims avant publication.

`/pricing` garde son URL; prix, FAQ, structured data et Phase 2 doivent
correspondre à l'offre actuelle.

## 23. Routes futures

Aucune page placeholder indexable pour Incident, Exercices, Knowledge,
AI, Network, Campus, Ops, QR Intervention, Multi-sites, hubs
Resources/Platform/réglementation.

Une route future entre au sitemap uniquement lorsqu'elle est
implémentée, approuvée et porte un contenu réel.

## 24. 404

Le `not-found` V2 doit retourner la bonne sémantique 404, offrir une
navigation utile et éviter les soft-404. Ne pas rediriger
systématiquement les inconnues vers `/`.

## 25. Baseline SEO avant migration

Avant remplacement production, capturer autant que possible : liste
URLs, statuts HTTP, titles, descriptions, canonicals, hreflang, H1,
robots/indexabilité, structured data, liens internes et URLs sitemap.

Cette baseline devient la référence du crawl comparatif.

## 26. Crawl comparatif pré-lancement

Comparer baseline actuelle et release candidate : - nombre d'URLs; -
URLs manquantes/nouvelles; - 2xx/3xx/4xx; - chaînes de redirection; -
titles/descriptions; - canonicals; - hreflang; - H1; - indexabilité; -
structured data; - liens cassés; - sitemap; - robots.

Toute différence doit être expliquable.

## 27. Conditions SEO NO-GO

NO-GO si : - URL utile disparue sans migration; - slugs blog
manquants; - canonical referral incontrôlé; - canonical/hreflang anglais
incorrect à l'échelle; - Population annonce toujours un faux EN; -
Sentinelle reste contradictoire sur EN; - structured data produit
importante perdue sans revue; - sitemap omet des pages connues; -
`noindex` accidentel; - boucles/chaînes de redirection; - liens
critiques cassés; - claims matériels inexacts.

## 28. Vérifications au lancement

Tester immédiatement : homepage FR/EN, produit FR/EN représentatif,
Sentinelle, Population, Pricing, Security, Blog, article FR/EN, guide,
Privacy/Terms, sitemap, robots, canonical/hreflang, metadata sociaux et
comportement canonical avec referral.

## 29. Post-lancement

Re-crawl production, comparer au release candidate, examiner
404/redirections/sitemap, données d'indexation si disponibles,
découverte blog et performance terrain/Core Web Vitals lorsqu'elle
devient disponible.

## 30. Priorités d'implémentation SEO

### SEO-01 --- Locale

SSR locale, `<html lang>`, canonical/hreflang cohérents.

### SEO-02 --- Product metadata

Normaliser metadata et restaurer/valider structured data.

### SEO-03 --- Sentinelle

Décider et implémenter statut EN.

### SEO-04 --- Population

Créer EN ou retirer faux signaux EN.

### SEO-05 --- Sitemap

Réduire duplication manuelle et durcir comportement blog.

### SEO-06 --- Social metadata

Rationaliser OG/Twitter.

### SEO-07 --- Internal links

Résoudre `/#features`, mapper ancres, prévenir pages orphelines.

### SEO-08 --- Crawl comparison

Baseline → release candidate → production.

## 31. Ce que ce plan n'approuve pas

-   migration vers `/en/`;
-   changement de slugs produit;
-   suppression de guides/articles/assets;
-   fusion de routes publiques;
-   publication de routes futures;
-   landing pages SEO spéculatives;
-   conservation de claims inexacts pour préserver des mots-clés.

## 32. Relation avec le Design Lab

Le Design Lab peut commencer après ce plan et la matrice composants
CURRENT → TARGET.

Le Lab ne doit pas modifier les URLs publiques, changer la stratégie
locale, supprimer le legacy, devenir indexable ou entrer dans le
sitemap.

## 33. Critères SEO d'acceptation d'une page reconstruite

Avant `APPROVED` : - décision URL conforme au Document 03; -
title/description revus; - canonical correct; - hreflang correct; -
`lang` correct; - H1/contenu principal correctement rendu; - structured
data revue; - liens internes corrects; - alt text approprié; - aucun
`noindex` accidentel; - décision FR/EN respectée; - valeur SEO legacy
comparée avant retrait.

## 34. Règle directrice

> Corriger les défauts SEO pendant la migration, sans créer une deuxième
> migration simplement pour rendre la première plus élégante.

Website V2 doit lancer avec des URLs stables, des signaux linguistiques
véridiques, une équité de contenu préservée et une architecture SEO plus
simple et plus fiable que l'existant.
