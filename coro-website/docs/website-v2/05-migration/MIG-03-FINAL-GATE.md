# MIG-03 — Final Gate, famille opérationnelle

Gel de la famille avant la prochaine famille de migration. Documentation seulement : aucun code, aucun texte public, aucune image modifiés. HEAD `418737fe`, arbre propre au départ (vérifié). Les audits backend de MIG-03A, MIG-03C et MIG-03D ne sont pas répétés. Le texte public a été relu sur les pages rendues (serveur de production local, 2026-09-26).

## 1. Family scope

| Page | Route | Commit | Langues |
|---|---|---|---|
| Résilience opérationnelle | `/resilience-operationnelle` | `6efea0a8` | FR / EN |
| Sentinelle | `/sentinelle` | `1f137903` | FR seulement |
| Sentinelle Population | `/sentinelle-population` | `1ceeb308` | FR seulement |
| CORO Incident | `/coro-incident` | `418737fe` | FR seulement |

Registres : `MIG-03-REGISTER.md`, `MIG-03-PRE-INCIDENT-GATE.md`, `MIG-03C-SENTINELLE-POPULATION-GATE.md`, `MIG-03D-INCIDENT-AUDIT.md`.

## 2. Product boundary matrix

Légende du recouvrement : EXPECTED CONTEXT (mention brève, la page propriétaire détaille), REVIEW (à relire plus tard), BOUNDARY CONFLICT (aucun constaté).

| Capacité | Résilience | Sentinelle | Population | Incident | Propriétaire final | Recouvrement |
|---|---|---|---|---|---|---|
| Préparation organisationnelle | Détaille | Mention | Mention (PUE) | Non | Résilience | EXPECTED CONTEXT |
| Indice CORO | Détaille | Mention (« alimente l'indice ») | Non | Non | Résilience | EXPECTED CONTEXT |
| Organisation d'urgence (rôles, substituts) | Détaille | Non | Non | Mention (« équipe mobilisable ») | Résilience | EXPECTED CONTEXT |
| Occupation (registre) | Résumé | Détaille | Non | Mention (« inscrites comme présentes ») | Sentinelle | REVIEW (nuance « présence réelle », § 3.1) |
| Entrée / sortie (QR + PIN) | Résumé (bloc « Présence réelle » et FAQ) | Détaille | Non | Non | Sentinelle | REVIEW (résumé détaillé sur Résilience, § 3.1) |
| Évacuation | Mention | Détaille | Non | Non | Sentinelle | EXPECTED CONTEXT |
| Point de rassemblement | Non | Détaille | Non | Non | Sentinelle | Aucun |
| Population externe | Non | Non | Détaille | Non | Population | Aucun |
| Scénario environnemental | Non | Non | Détaille (fictif) | Non | Population | Aucun |
| Alerte publique | Non | Non | Détaille (SMS et courriel, abonnés) | Non | Population | Aucun |
| Activation d'incident | Résumé | Une phrase (« un incident peut être déclenché ») | Non | Détaille | Incident | EXPECTED CONTEXT |
| Mobilisation | Résumé | Non | Non | Détaille | Incident | EXPECTED CONTEXT |
| Procédures et tâches | Mention | Non | Non | Détaille | Incident | EXPECTED CONTEXT |
| Chronologie | Résumé | Non | Chronologie d'alerte (autre objet) | Détaille | Incident | EXPECTED CONTEXT |
| Notifications (courriel, SMS avec consentement) | Résumé + FAQ | Non | Canaux d'alerte publique (autre public) | Détaille | Incident (équipe) / Population (abonnés) | EXPECTED CONTEXT |
| Information pour les intervenants | Non | Non | Non | Détaille | Incident | Aucun |
| Rapport d'incident | Bloc + FAQ | Non | « Traçabilité et REX » (alertes) | Détaille | Incident | REVIEW (FAQ dupliquée, § 3.1) |
| REX | Bloc « Boucle REX » | Non | Étape 10 (alertes) | Détaille | Incident (produit) / Résilience (boucle) | EXPECTED CONTEXT |
| Suivi correctif | Bloc « Intelligence organisationnelle » | Non | Non | Mention (actions correctives) | Résilience | EXPECTED CONTEXT |
| Mode exercice | Bloc + FAQ | Non | FAQ (mode simulation) | Détaille | Incident (mécanique) / Résilience (indice) | REVIEW (FAQ dupliquée) |
| Incidents simultanés | FAQ | Non | Non | Détaille | Incident | REVIEW (FAQ dupliquée) |
| Bouton panique / message « menace active » | Bloc « Alerte » (capture du courriel) | Non | Non | Non (exclu du texte Incident) | Non attribué | REVIEW (§ 3.1) |

**BOUNDARY CONFLICT : aucun.** Aucune correction de code n'est requise par le gate.

## 3. Cross-page overlap

### 3.1 Résilience vs Incident

Question : la page Résilience explique-t-elle la relation organisationnelle, ou duplique-t-elle la page Incident ?

| Bloc Résilience | Verdict |
|---|---|
| Hero, boucle « Du plan à l'incident. De l'incident au plan amélioré. » | KEEP AS CONTEXT |
| « Module Incident : procédure du coordonnateur, mobilisation, journal et rapport » (carte) | KEEP AS CONTEXT |
| « Intervention · Module Incident » (présence utilisée au déclenchement, courriel et SMS aux contacts, journal) | KEEP AS CONTEXT (limite haute : une ligne de plus le ferait dupliquer Incident) |
| « Alerte » (capture du courriel, « consigne à communiquer au 911 ») | KEEP AS CONTEXT, avec REVIEW : décrit le message « menace active » (module panique), que la page Incident n'a pas repris. La consigne au 911 est un message transmis à un humain, pas un appel de CORO ; cohérent avec la page Incident, qui ne revendique ni appel ni répartition. Propriété publique du module panique non attribuée. |
| « Historique et rapport » (rapport PDF « structuré en 7 sections », REX) | CONDENSE LATER. Le décompte « 7 sections » n'est pas repris sur Incident (sections 4 et 7 du PDF non relues, voir registre MIG-03D) : à revérifier avant toute réutilisation. |
| « Responsabilité de conformité » | KEEP AS CONTEXT |
| FAQ : rapport et conformité, incidents simultanés, exercice sans notifier les occupants | CONDENSE LATER. Trois questions recouvrent celles de la page Incident (la question « Le rapport garantit-il la conformité réglementaire ? » est presque identique). Risque SEO faible, redondance de FAQ. |
| « Présence réelle », « qui est dans le bâtiment » | CONTENT REVIEW (faible) : la page Incident dit « personnes inscrites comme présentes » et la page Sentinelle précise « pas de géolocalisation continue ». Aligner le vocabulaire lors d'une prochaine passe. |

Conclusion : Résilience explique la relation à haut niveau ; deux blocs (Alerte, Historique et rapport) approchent la duplication de la fiche produit. Aucun BOUNDARY CONFLICT. Aucun changement dans ce gate.

### 3.2 Sentinelle vs Incident

Sentinelle : présence, registre, évacuation, recensement. Incident : événement actif, mobilisation, chronologie, intervention, rapport.

Le lien entre l'instantané d'occupation et l'activation est compréhensible sans dupliquer le flux Sentinelle : la page Incident (section 02) dit que CORO « enregistre la liste des personnes inscrites comme présentes dans le registre Sentinelle » au déclenchement et renvoie vers `/sentinelle` ; la page Sentinelle ne dit que « depuis le registre, un incident peut être déclenché » et renvoie vers Résilience. Séparation confirmée. Remarque : la page Sentinelle ne renvoie pas vers `/coro-incident` (voir § 7).

### 3.3 Population vs Incident

- Canaux : Population publie « SMS et courriel, auprès des abonnés qui ont consenti », avec sirènes, médias, réseaux sociaux et systèmes municipaux explicitement hors de CORO. Incident publie courriel aux personnes désignées et SMS avec consentement pour l'équipe interne. Les deux parlent de SMS et de courriel mais pour des publics différents (abonnés externes contre équipe d'urgence) ; aucun canal d'alerte publique n'est présenté comme canal Incident.
- Information aux intervenants (lien d'intervention, fiche) : uniquement sur Incident ; jamais confondue avec la communication aux citoyens.
- Population n'a pas à renvoyer vers Incident : son schéma « Gestion de l'incident · Intervention » situe le produit dans l'écosystème sans lien. Narratifs distincts : scénario fictif en quatre actes contre parcours d'un incident interne.
- Recoupement de mots : « REX », « chronologie », « traçabilité » présents des deux côtés, pour des objets différents (alerte publique contre incident interne) : EXPECTED CONTEXT.

## 4. Visual signatures (relecture des rendus 1440 et 390)

Les captures pleine page ne chargent pas les images sous le pli (chargement différé) : le jugement porte sur la structure et le rythme, les images de section étant vues dans les tâches précédentes.

| Page | Signature observée | Verdict |
|---|---|---|
| Résilience | Système organisationnel : boucle avant / pendant / après, indice pondéré (4 barres), blocs à captures | Reste la page système de haut niveau |
| Sentinelle | Entrée → registre → point de rassemblement ; étapes numérotées, rupture navy « continuité de l'information » | Reste pilotée par l'occupation |
| Population | Scénario en quatre actes (NH₃), carte dominante à l'étape 05, alternance navy / clair la plus marquée | La plus pilotée par le scénario |
| Incident | Événement → chronologie (navy) → intervention (fiche) → rapport → apprentissage ; trois illustrations à échelles variées | Distinct |

Réponses :
- Signature reconnaissable : oui pour les quatre.
- Héros photographiques trop répétitifs ? Trois des quatre (Résilience, Sentinelle, Population) sont des scènes intérieures sombres avec écrans ; Incident est la seule scène extérieure. Même gabarit de héros (navy + photo à droite, bandeau image sur mobile). REVIEW visuel : pas un défaut bloquant, mais à surveiller pour les familles suivantes.
- Sections navy trop nombreuses ? Résilience : 2 + CTA ; Sentinelle : 1 + CTA ; Incident : 1 + CTA ; Population : 4 sections navy + CTA, le plus dense. Acceptable pour un scénario ; à ne pas reproduire ailleurs.
- Cartes trop nombreuses ? Résilience et Sentinelle utilisent des grilles de cartes en bas de page (trois cartes de fonctionnement, « socle relié ») ; Incident utilise des listes à filets (types, REX, ressources), sans mur de cartes.
- Défilement horizontal : aucun sur les quatre à 390 et 1440 (mesuré).

## 5. Language matrix

| Page | État | Contrôle en-tête / pied | hreflang | Vérifié |
|---|---|---|---|---|
| `/resilience-operationnelle` | FR / EN | Sélecteur et lien English présents | fr-CA, en-CA, x-default | oui |
| `/sentinelle` | FR seulement | Masqués | fr-CA, x-default | oui |
| `/sentinelle-population` | FR seulement | Masqués | fr-CA, x-default | oui |
| `/coro-incident` | FR seulement | Masqués | fr-CA, x-default | oui |

Aucun travail de traduction. Dette connue : `<html lang>` reste « fr » même sur `?lang=en` (la langue est portée par le conteneur V2, pas par la racine).

## 6. SEO territory

| Page | Territoire | Titre | Note de cannibalisation |
|---|---|---|---|
| Résilience | Résilience opérationnelle / organisationnelle | « Résilience opérationnelle : préparer, agir, rétablir, améliorer » | La description contient « gestion d'incidents » : à surveiller face au titre Incident, sans conflit constaté |
| Sentinelle | Registre d'occupation + décompte en évacuation | « Registre d'occupation et décompte des occupants en évacuation » | Distinct |
| Population | Alerte publique industrielle / environnementale (PUE) | « Alerte à la population et plan d'urgence environnementale (PUE) » | Distinct |
| Incident | Gestion d'incident + chronologie + intervention + rapport | « Gestion d'incident : activation, chronologie et rapport » | Distinct ; la FAQ « rapport et conformité » est dupliquée sur Résilience |

Aucune nouvelle recherche de mots-clés (aucun conflit découvert).

## 7. Internal linking

| Depuis | Vers | Contexte | Verdict |
|---|---|---|---|
| Résilience | `/sentinelle` | « En savoir plus » (bloc présence) | Contextuel |
| Résilience | Documents, projets, performance, portail client | Socle produit | Contextuel |
| Résilience | `/coro-incident` | Aucun lien de contenu (en-tête seulement) | **Manque** |
| Sentinelle | `/resilience-operationnelle`, Documents, Portail client | Écosystème | Contextuel |
| Sentinelle | `/coro-incident` | Aucun lien de contenu, alors que le texte dit « un incident peut être déclenché » | **Manque** |
| Sentinelle | 8 articles du blog | Ressources | Contextuel, tous vérifiés |
| Population | `/sentinelle` | « Deux périmètres complémentaires » | Contextuel |
| Population | `/coro-incident` | Aucun | Non requis |
| Incident | `/sentinelle`, `/resilience-operationnelle`, 3 articles du blog | Section 02, écosystème, ressources | Contextuel |

Aucun lien vers soi-même, aucun lien vers une route FUTURE, aucun lien croisé aléatoire. `/coro-incident` est atteignable par la navigation globale (groupe « Résilience & opérations ») mais n'a aucun lien de contenu entrant : deux liens contextuels (Résilience, bloc « Module Incident » ; Sentinelle, phrase sur le déclenchement) sont à envisager dans une passe ultérieure.

## 8. Structured data

| Page | JSON-LD | Parité avec la FAQ visible |
|---|---|---|
| Résilience | FAQPage, 6 questions | 6 visibles |
| Sentinelle | FAQPage, 8 questions | 8 visibles |
| Population | FAQPage, 5 questions | 5 visibles |
| Incident | FAQPage, 6 questions | 6 visibles |

Types présents : `FAQPage`, `Question`, `Answer` seulement. Aucun `SoftwareApplication`, aucun schéma de conformité, aucune relation inventée avec un gouvernement ou des premiers répondants.

## 9. Go-Live register (MIG-03 consolidé)

Les éléments de publication ne sont pas des bloqueurs de migration : les pages restent dans la branche.

### PUBLICATION-BLOCKER
| Page | Élément | Action |
|---|---|---|
| Incident | `alert/fiche_intervention.webp` : adresse d'apparence réelle (1200 boul. Robert-Bourassa, Montréal) et détails de site | Assainir ou recapturer |
| Population | `sentinelle-population-zone.webp` (étape 05) : adresse d'apparence réelle (1500 Bd de Montarville, Boucherville) | Remplacer ou assainir |
| Résilience | Provenance de `coro-organisation-urgence.webp` et `coro-alerte-panique-courriel.webp` (hérité MIG-03A) | Confirmer la provenance |

### RECAPTURE
| Page | Élément |
|---|---|
| Sentinelle | Registre d'occupation, évacuation, personnes manquantes / non confirmées : aucune capture produit actuelle (les images V1 montrent des interfaces inventées) |
| Population | Aucune capture réelle : centre de communication, zones, message, diffusion, suivi, traçabilité |
| Incident | Journal et détail d'incident : aucune capture actuelle (optionnel) |

### PUBLICATION-REVIEW
| Page | Élément |
|---|---|
| Population | Données de démonstration non confirmées fictives (« Prémont », « Martin Gagnon », 12 400 / 48 890 / 28 500, zones 1-3-5 km, établissements sensibles) |
| Incident | `incident-command.webp` : libellés illustratifs de services d'urgence (« Services d'urgence avisés », « Caméra en direct ») : review seulement |
| Incident | `normal-operations.webp` : écrans illustratifs de type CORO : review seulement |
| Incident | `incident-building.webp` : enseigne fictive « Tour Prémont », lettrage de véhicule déformé : review seulement |
| Incident | Héros `first-responders-arrival.webp` : QR et texte illustratifs partiellement rognés |
| Sentinelle | Formulation de vie privée (aucune allégation Loi 25, purge à 12 mois non publiée) |

### DO NOT PUBLISH
| Page | Élément |
|---|---|
| Population | `sentinelle-population-alerte.webp` (numéro 1 800 363-4735 ne correspond à aucun numéro officiel) ; images `installation` et `inscription` non utilisées (téléphone, adresse, numéro fictif) |

### ACCESSIBILITY REVIEW
Voir § 12.

### CONTENT REVIEW
| Page | Élément |
|---|---|
| Résilience | Vocabulaire « présence réelle » face à « inscrites comme présentes » (Incident) et à « pas de géolocalisation continue » (Sentinelle) |
| Résilience | « Rapport PDF structuré en 7 sections » : décompte à revérifier |
| Résilience | Propriété publique du module panique (bloc « Alerte ») non attribuée |
| Population | Confidentialité citoyen, rétention, multi-site, seuils de substances, autorités : NOT VERIFIED, non publiés |
| Incident | Rapport PDF : sections 4 et 7 non relues |
| Sentinelle, Incident | Le pont panneau d'alarme (PAI) est PARTIAL et n'est pas promu |

## 10. Editorial-resource backlog

| Page | Opportunité | Articles existants pertinents | Action | Priorité |
|---|---|---|---|---|
| `/resilience-operationnelle` | Forte | `indicateurs-resilience-kpi-preparation-organisation`, `resilience-operationnelle-mesurer-capacite-organisation-urgence`, `conformite-resilience-operationnelle-pmu`, `plan-urgence-formation-exercice-preparation-organisation`, `mesurer-niveau-preparation-batiment-urgence` | Retrofit 3 à 5 | HIGH |
| `/gestion-documentaire` | Forte | `controle-versions-pmu-psi-pca`, `centraliser-gerer-documents-conformite-organisation`, `pourquoi-les-plans-urgence-deviennent-rapidement-desuets`, `frequence-mise-a-jour-plan-mesures-urgence-pmu` | Retrofit 3 à 4 | HIGH |
| `/gestion-de-projets` | Oui | `gerer-mandats-mesures-urgence`, `mesurer-performance-rentabilite-mandats` | Retrofit 1 à 2 | MEDIUM |
| `/performance-objectifs` | Oui | mêmes articles ; éviter le doublon avec gestion-de-projets | Retrofit 1 à 2 | MEDIUM |
| `/portail-client` | Oui | `simplifier-revision-approbation-documents-clients`, `coro-sur-mobile-vos-projets-documents-et-clients-accessibles-partout` | Retrofit 1 à 2 | MEDIUM |
| `/sentinelle` | Fait | 8 articles déjà liés, tous vérifiés | Revue optionnelle de la liste | DONE |
| `/coro-incident` | Fait | 3 articles liés (MIG-03D-E) | Aucune | DONE |
| `/sentinelle-population` | Incertaine | Aucun article sur l'alerte publique ni le PUE ; seul `obligations-plan-mesures-urgence-entreprise-quebec` (mot-clé PUE) | Vérifier la pertinence avant tout lien | REVIEW |
| `/partners` | Faible | articles sur les mandats (consultants) | À décider avec l'audience | LOW |
| `/about`, `/contact`, `/programme-recommandation` | Aucune | aucun | Aucune | NONE |

Aucun retrofit dans ce gate. Règle applicable : `04-quality/QA-ACCEPTANCE-CHECKLIST.md`, « Editorial resource discovery ».

## 11. Editorial-content gaps

Constat sur les 56 articles publiés (API publique, 2026-09-26) : aucun article dédié à la gestion d'un incident. Sujets éditoriaux futurs (backlog seulement ; aucun article créé) :

- gestion d'un incident en mesures d'urgence ;
- tenir une chronologie pendant une intervention ;
- que doit contenir un rapport d'incident ;
- retour d'expérience après une urgence ;
- actions correctives après un incident.

Note : la page Incident renvoie aujourd'hui vers des articles de préparation (équipe, exercice, lacunes) faute d'articles sur le traitement de l'incident lui-même ; la publication de ces sujets permettrait de remplacer ou de compléter la liste.

## 12. Accessibility debt

Dette réelle connue seulement (aucun test complet répété) :

- Aucun test avec lecteur d'écran sur les quatre pages.
- Zoom 200 % et 400 % non vérifié sur ces pages.
- `<html lang>` global reste « fr » même en anglais (Résilience `?lang=en`) : dette MIGRATION-ONLY.
- Captures denses : lisibilité mobile limitée (Résilience, Incident : régions défilables nommées `role="region"` avec `tabIndex=0`, testées au clavier pour Incident).
- Carte de Population : équivalent textuel HTML fourni ; zones ZPI / ZPU / ZSE non définies publiquement.
- États des statuts ne reposant pas seulement sur la couleur : non audités globalement.
- Contraste AA non re-mesuré dans ce gate.

## 13. Exit decision

| Critère | Résultat |
|---|---|
| Aucun BOUNDARY CONFLICT nécessitant une correction runtime | Oui (aucun constaté) |
| Rôles visuels de famille distincts | Oui, avec un REVIEW : trois héros sombres à écrans |
| Blockers de mise en ligne documentés | Oui (§ 9) |
| Langues et territoires SEO distincts | Oui |
| Backlog éditorial enregistré | Oui (§ 10 et 11) |
| Aucun changement de code requis | Oui |

Constats à traiter dans des passes ultérieures, hors de ce gate : liens de contenu vers `/coro-incident` depuis Résilience et Sentinelle ; condensation possible des blocs Alerte et Historique / rapport et de la FAQ dupliquée sur Résilience ; alignement du vocabulaire « présence réelle » ; attribution publique du module panique.

MIG-03 FINAL GATE STATUS: PASS — READY FOR NEXT MIGRATION FAMILY
