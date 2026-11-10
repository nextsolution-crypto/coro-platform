# DISPLAY-04A-REVIEW — Synthèse exécutive

Date de preuve : 2026-11-10. Candidat initial : `0ed95c14`. Candidat produit corrigé et testé : `62dfcf64`. Branche locale : `review/coro-display-04a-pdf-worker`.

## Observations

Le candidat initial lançait `pdfinfo` et `pdftocairo` dans l'orchestrateur qui détenait aussi `DATABASE_URL` et les secrets de stockage. L'isolation déclarée au niveau du conteneur protégeait l'hôte, mais pas les secrets de CORO contre une compromission de Poppler. Ce point était critique.

La correction sépare maintenant trois responsabilités :

1. l'orchestrateur lit PostgreSQL et le stockage privé;
2. un échange local borné remet uniquement le PDF et les paramètres;
3. un rasteriseur distinct, sans réseau et sans secret, produit un PNG puis quitte après un travail.

## Preuves et tests

- PostgreSQL 16 jetable : 179 migrations depuis zéro, upgrade isolé depuis la tête précédente, contraintes et verrous réels.
- Concurrence : un seul des deux workers réserve un même job (`FOR UPDATE SKIP LOCKED`).
- Reprise : bail expiré repris; bail au maximum de tentatives classé `FAILED/LEASE_EXHAUSTED`.
- Révocation concurrente : aucun rendu ne devient autoritaire après révocation de la source.
- Docker réel : UID/GID 1000, racine `EROFS`, aucun socket Docker, `network_mode:none`, aucune variable sensible, mémoire 384 MiB, PID 16, CPU 1.
- Corpus : PDF valide complexe accepté; troncature, signature, structure, contenu actif, pièce jointe, référence externe et 101 pages refusés; délai forcé classé `PDF_TIMEOUT`; temporaires nettoyés.
- Régressions ciblées DISPLAY-03 et multitenant : PASS.
- Suite backend : 289 suites PASS, 1 suite FAIL pour deux contrôles Knowledge hors lot (Poppler absent sur l'hôte Windows et timeout Office); aucun échec DISPLAY.

## Corrections

- Rasteriseur sans PostgreSQL, stockage objet, jeton applicatif ni réseau.
- Volume d'échange protégé, réponses bornées, lecture sans suivi de liens symboliques et contrôle SHA-256.
- `tmpfs` rendu réellement inscriptible par UID 1000.
- limites RAM/swap/CPU/PID et init de processus explicites.
- heartbeat pendant le rendu, récupération des baux et échec terminal après trois tentatives.
- nouvelle vérification de l'autorité documentaire après rendu et avant tout stockage.
- classification explicite des timeouts et rejet de davantage d'actions/références PDF externes.

## Risques résiduels

- Le corpus réel chiffré, très imbriqué et à image décompressée extrême reste incomplet.
- La file d'échange sur volume partagé doit être supervisée et purgée selon un runbook avant exploitation.
- Poppler 22.12.0 est ancien; un processus de veille et reconstruction d'image est requis.
- La distribution commerciale du conteneur Poppler requiert une validation juridique et des notices/source correspondante.
- Les deux échecs historiques de la suite complète ne sont pas corrigés dans ce lot.

## Verdict

**GO CONDITIONNEL DISPLAY-04B.** L'architecture critique est corrigée et démontrée localement. Aucune fusion ou production n'est autorisée par cette revue. Le gate reste fermé pour une distribution commerciale tant que le corpus complémentaire, le runbook d'exploitation et la validation de licence ne sont pas approuvés.
