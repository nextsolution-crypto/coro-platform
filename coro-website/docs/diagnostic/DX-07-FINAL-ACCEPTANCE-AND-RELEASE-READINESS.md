# DX-07 — Acceptation finale et préparation à la publication

Date : 2026-10-27
Branche : `feature/coro-diagnostic-express-v1`
HEAD : `80f5c4f00ddeab6c24022cdf56490293caa8456f`
`origin/main` vérifié : `80f5c4f00ddeab6c24022cdf56490293caa8456f`
Verdict : **GO AVEC RÉSERVES — PRÊT À SOUMETTRE POUR AUTORISATION DE PUBLICATION**

## 1. Résumé exécutif

Le Diagnostic Express CORO V1.0 satisfait localement les critères fonctionnels, métier, responsive, SEO, confidentialité et sécurité définis dans DX-00 à DX-06. Le parcours bilingue complet a été rejoué dans Chrome sur le build de production local. Les 709 tests du site, TypeScript, le build et l'audit des dépendances sont réussis.

Aucun défaut critique de publication n'a été reproduit. Le verdict demeure **GO AVEC RÉSERVES**, et non GO sans réserve, parce que la livraison Formspree réelle n'a volontairement pas été testée, aucun lecteur d'écran n'était disponible, le PDF n'est pas déclaré PDF/UA et les mesures de performance sont uniquement locales.

Aucune fusion, publication ou modification de production n'a été effectuée.

## 2. État Git

- Worktree isolé : `F:\coro-platform\.worktrees\coro-diagnostic-express-v1`
- Branche correcte : `feature/coro-diagnostic-express-v1`
- Base et `origin/main` identiques au moment du contrôle : aucune avance ni retard.
- `git fetch origin` exécuté avant la comparaison finale.
- Modifications DX-01 à DX-07 toujours non fusionnées et non déployées.
- Les autres worktrees sont restés intacts.
- Aucun reset, déplacement ou écrasement n'a été effectué.

Les fichiers non suivis comprennent le produit Diagnostic, ses tests, ses rapports, ses images et ses preuves QA. Les répertoires `output/` et `tmp/` contiennent des artefacts de recette et ne doivent pas être inclus aveuglément dans un commit produit.

## 3. Lots réalisés

| Lot | Capacité | Statut DX-07 |
|---|---|---:|
| DX-00 | Audit, architecture et méthode | VALIDÉ |
| DX-01 | Questionnaire bilingue | PASS |
| DX-02 | Scoring et 40 recommandations | PASS |
| DX-03 | Restitution personnalisée | PASS |
| DX-03B | Portrait de résilience | PASS |
| DX-04 | Navigation, accueil, pied de page et SEO | PASS |
| DX-04B | Illustrations Hero et conclusion | PASS |
| DX-05 | PDF local et partage | PASS avec réserve PDF/UA |
| DX-06 | Conversion commerciale facultative | PASS simulé; livraison réelle NOT_VERIFIED |

## 4. Architecture

- Page serveur Next.js et métadonnées dynamiques selon `?lang=en`.
- Îlot client React pour le questionnaire et le résultat.
- Moteur métier TypeScript pur, versionné et indépendant de React.
- Configuration bilingue et référentiel CORO séparés de la présentation.
- Persistance temporaire limitée à `sessionStorage` dans l'onglet.
- PDF généré localement avec `jsPDF`, chargé dynamiquement.
- Aucun backend, base de données, CRM ou analytics ajouté.

## 5. Fonctionnalités

Le parcours Chrome a confirmé : accès depuis l'accueil, Ressources et le pied de page; introduction; huit questions; retour; modification; changement de langue; résultat; portrait; forces; priorités; recommandations; plan; modules; PDF; partage; conversion facultative et recommencement.

Le retour à la question précédente conserve la réponse, sa modification est prise en compte, le passage FR/EN conserve l'état dans l'onglet et le recommencement efface la clé `coro:diagnostic-express:v1`.

## 6. Scoring

Les scénarios A à H et les cas limites sont couverts par les tests du moteur :

- A = 3, B = 2, C = 0;
- D inconnu et E non applicable exclus du dénominateur;
- seuil définitif à six dimensions évaluables sur huit;
- 100 %, 79 %, 67 % et 0 % vérifiés;
- couverture exacte de 75 % et couverture insuffisante;
- dénominateur nul;
- forces A seulement;
- améliorations C puis B;
- vérifications D séparées;
- ordre D5, D4, D2, D3, D7, D6, D8, D1;
- entrées et versions invalides refusées;
- déterminisme et absence de mutation des entrées.

L'interface et le PDF consomment le résultat canonique; ils ne recalculent pas la note. Le libellé méthodologique distingue explicitement le diagnostic de l'Indice CORO officiel.

## 7. Recommandations

Les 40 variantes bilingues sont présentes. Chaque recommandation sépare observation, enjeu opérationnel, bonne pratique indépendante de CORO et action concrète. Les associations de modules, statuts et destinations publiques sont testées.

## 8. Portrait de résilience

- Huit axes confirmés dans Chrome.
- Tableau alternatif structuré de huit lignes.
- A/B/C tracés sans recalcul du score.
- D/E conservés comme états non numériques.
- Aucun polygone artificiel lorsque les huit réponses sont inconnues.
- Alternative textuelle visible en couverture insuffisante.
- Géométrie pure partagée avec le PDF.
- Aucun débordement aux sept largeurs.

## 9. PDF

Une matrice de 12 rapports a été générée : six profils en français et en anglais — 100 %, 79 %, 0 %, couverture insuffisante, toutes inconnues et toutes non applicables.

Chaque rapport comporte cinq pages utiles. Les 60 pages ont été rendues en PNG avec ImageMagick et inspectées sous forme de planche-contact : aucun chevauchement, page vide ou coupure manifeste. Les rapports présentent le logo, score ou score partiel, niveau, couverture, portrait ou alternative, forces, priorités, recommandations, plan, statuts CORO, limites et pagination.

Le générateur réutilise le modèle canonique et `buildResiliencePortraitGeometry`; aucune seconde méthode de scoring n'existe. Les tests confirment la signature PDF et la génération des six profils.

Réserve : le format est lisible et possède une alternative textuelle, mais aucune conformité PDF/UA n'est revendiquée ni démontrée.

## 10. Conversion commerciale

- Résultat, recommandations et PDF accessibles sans formulaire.
- Formulaire existant `DemoForm` réutilisé.
- Soumission invalide bloquée sans requête.
- Sans consentement : aucun champ Diagnostic transmis.
- Avec consentement : version, score ou score partiel, niveau, couverture et trois priorités maximum.
- Les huit réponses et le PDF ne sont jamais joints.
- Erreur fournisseur simulée 500 : message explicite et saisie conservée.
- Formulaire mobile sans débordement.

La recette intercepte Formspree avant sortie réseau. La livraison réelle reste **NOT_VERIFIED**, conformément au mandat.

## 11. Confidentialité

- aucune réponse ou note dans l'URL;
- aucune requête externe ou mutante pendant le parcours sans formulaire;
- aucun transfert automatique;
- aucun stockage serveur;
- aucun analytics ou cookie ajouté;
- persistance temporaire dans l'onglet seulement;
- suppression au recommencement et à la fin du questionnaire;
- partage limité à `/diagnostic` ou `/diagnostic?lang=en`;
- résumé commercial conditionné par un consentement explicite;
- aucune réponse ou donnée personnelle observée dans les journaux de recette.

## 12. Sécurité

- `npm audit --omit=dev` : 0 vulnérabilité.
- `jspdf` est épinglé à `4.2.1`.
- entrées du moteur validées en refus fermé;
- validations historiques du formulaire préservées;
- aucun secret ajouté au navigateur ou au dépôt;
- aucune modification des mécanismes globaux de sécurité;
- aucun impact sur les autres applications du monorepo démontré par la suite complète.

## 13. Accessibilité

Résultats vérifiés dans Chrome :

- lien d'évitement fonctionnel vers `#main-content`;
- un seul `main` et un seul `h1` dans le questionnaire;
- focus visible sur liens, menu et CTA;
- parcours clavier observé jusqu'au CTA;
- activation et sélection d'un bouton radio au clavier;
- fieldset, légende et progression ARIA présents;
- labels de formulaire présents;
- zoom navigateur 200 % sans débordement horizontal;
- `prefers-reduced-motion` respecté par des durées réduites;
- tableau textuel du portrait disponible indépendamment des couleurs;
- erreurs de formulaire explicites.

Réserves : aucun lecteur d'écran n'était disponible; cette vérification demeure NOT_VERIFIED. Le document racine du site conserve historiquement `<html lang="fr">`; le contenu V2 porte son `lang` local (`en` et `en-CA` vérifiés). Ce point global est déjà documenté dans `V2Shell` comme migration distincte et n'est pas introduit par Diagnostic Express.

## 14. Responsive

Chrome a été mesuré à 320, 375, 390, 768, 1024, 1440 et 1920 px.

- aucun débordement horizontal;
- questionnaire, résultat, radar, tableau, recommandations et formulaire contenus;
- radar de 254 px à 608 px selon le viewport;
- tableau large conservé dans son conteneur défilable;
- formulaire absent tant que le CTA commercial n'est pas activé;
- boutons empilés sur mobile;
- contrôles flottants globaux visibles mais contenu défilable et accessible.

## 15. SEO

- `/diagnostic` et `/diagnostic?lang=en` chargés;
- titres et descriptions FR-CA/EN-CA conformes;
- canonical distinct par langue;
- hreflang `fr-CA`, `en-CA` et `x-default`;
- Open Graph présent;
- index/follow;
- route présente dans le sitemap;
- robots n'interdit pas la route;
- navigation interne et pied de page bilingues;
- aucun résultat individuel dans l'URL ou dans une route indexable.

## 16. Performance

Mesure locale chaude du build de production, sans valeur de terrain :

- DOMContentLoaded : 24 ms;
- load : 25 ms;
- LCP observé : 60 ms;
- CLS observé : 0;
- transfert mesuré après cache : 4 891 octets, donc non représentatif d'une première visite.

Images sources : Hero 95 074 octets; conclusion 48 374 octets, toutes deux en WebP et servies via `next/image`. `jsPDF` est importé dynamiquement uniquement au téléchargement. INP et Core Web Vitals de production restent NOT_VERIFIED tant que la route n'est pas publiée.

## 17. Tests

| Contrôle | Résultat |
|---|---:|
| Suite complète | PASS — 709/709 |
| TypeScript | PASS |
| ESLint produit et scripts DX-07 | PASS |
| ESLint consolidé ancien harnais | 0 erreur, 4 avertissements historiques DX-03B à DX-05 |
| Build Next.js 16.4.3 | PASS — 36 pages |
| Audit dépendances production | PASS — 0 vulnérabilité |
| `git diff --check` | PASS |
| Chrome E2E consolidé | PASS |
| Accessibilité Chrome ciblée | PASS avec réserves |
| PDF 12 fichiers / 60 pages | PASS visuel local |

Le build signale uniquement que l'API du blogue est indisponible dans l'environnement local; le sitemap sert alors les routes statiques et inclut bien `/diagnostic`.

Une relance directe de la seule glob `tests/diagnostic*.test.ts` a rencontré `spawn EPERM` dans le bac à sable Windows. Ces mêmes fichiers ont été exécutés avec succès dans la suite complète de 709 tests; il ne s'agit pas d'un échec produit.

## 18. Captures et preuves

- `docs/diagnostic/evidence/dx07/01-home-entry-fr.png`
- `docs/diagnostic/evidence/dx07/02-result-fr.png`
- `docs/diagnostic/evidence/dx07/03-result-en.png`
- `docs/diagnostic/evidence/dx07/04-result-en-mobile-alternative.png`
- `docs/diagnostic/evidence/dx07/dx07-browser-results.json`
- `docs/diagnostic/evidence/dx07/dx07-accessibility-results.json`
- `output/pdf/dx07/manifest.json`
- `tmp/pdfs/dx07-rendered/dx07-contact-sheet.png`

Les captures DX-04 à DX-06 demeurent les preuves complémentaires de l'accueil mobile, de la navigation, du pied de page, des illustrations, du partage et du formulaire.

## 19. Anomalies

Aucune anomalie critique ou majeure propre au produit n'a été reproduite.

Observations :

1. Poppler n'était pas installé; ImageMagick disponible a été utilisé pour rendre les PDF.
2. Quatre avertissements ESLint subsistent dans les anciens scripts QA DX-03B à DX-05; aucun dans le produit ou les scripts DX-07.
3. Le cookie banner global peut occuper le bas d'une capture mobile tant qu'il n'est pas acquitté; il est explicite, dismissible et n'introduit pas de débordement.

## 20. Réserves

1. Livraison Formspree réelle : NOT_VERIFIED.
2. Lecteur d'écran : NOT_VERIFIED.
3. Conformité PDF/UA : non revendiquée.
4. Performance et INP de production : NOT_VERIFIED avant publication.
5. Langue au niveau du document racine : dette globale V2 existante; la portée locale du contenu est correcte.
6. La route n'est ni fusionnée ni publiée; aucune preuve de production n'existe encore.

## 21. Risques de fusion

Au moment de DX-07, `origin/main` correspond exactement à la base de la branche : aucun conflit Git actuel n'est anticipé. Les zones partagées à surveiller au moment de la publication sont :

- navigation et registre des routes;
- contenu et sections de l'accueil;
- pied de page;
- `DemoForm`;
- `package.json` et verrouillage `jspdf`;
- tests de navigation, sitemap et design system.

Les artefacts `output/`, `tmp/`, captures et rapports doivent être triés explicitement; aucun ajout global aveugle ne doit être utilisé.

## 22. Stratégie de publication

1. Obtenir l'autorisation explicite de publication.
2. Actualiser `origin/main` et confirmer les nouveaux écarts.
3. Créer des commits cohérents : produit/tests, puis preuves/documentation si souhaité.
4. Exclure `tmp/`, caches, profils Chrome et artefacts non destinés au dépôt.
5. Rebaser ou intégrer le `main` actualisé dans le worktree isolé sans toucher aux autres worktrees.
6. Rejouer 709+ tests, TypeScript, ESLint, build, audit, diff-check et navigateur affecté.
7. Ouvrir une PR avec la matrice DX-07 et les réserves.
8. Attendre tous les contrôles obligatoires et la revue.
9. Fusionner par le mécanisme gouverné seulement après approbation.
10. Déployer le SHA fusionné par le pipeline existant, puis vérifier route, navigation, sitemap, PDF, confidentialité et SHA actif.

## 23. Stratégie de rollback

Le lot ne contient ni migration ni donnée serveur. Le retour arrière consiste à redéployer le dernier SHA public validé et, si nécessaire, à révoquer le commit de publication qui ajoute la route et les liens. Vérifier ensuite :

- disparition cohérente de `/diagnostic` du sitemap et de la navigation;
- restauration du formulaire de démonstration historique;
- santé des pages publiques existantes;
- absence d'effet sur les données, puisqu'aucune donnée Diagnostic n'est persistée côté serveur.

Le rollback doit suivre le pipeline gouverné; aucune modification manuelle de production n'est proposée.

## 24. Verdict

**GO AVEC RÉSERVES — PRÊT POUR PUBLICATION APRÈS AUTORISATION EXPLICITE.**

Le produit local est fonctionnel, cohérent, bilingue, déterministe, responsive et respectueux de la confidentialité. Les réserves restantes n'empêchent pas la publication du questionnaire anonyme, du résultat, du PDF local et du partage public, mais doivent demeurer explicites : aucune preuve de livraison Formspree réelle, aucune validation par lecteur d'écran, aucune conformité PDF/UA et aucune donnée de performance de production.

Point d'arrêt respecté : aucune fusion, aucun déploiement, aucune modification de production et aucun nouveau développement après DX-07.
